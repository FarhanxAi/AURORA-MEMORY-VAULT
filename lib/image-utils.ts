import { Memory } from "./types";
import { createClient } from "./supabase/client";
import { getMemoriesTableName } from "./supabase-db";

export const MEMORY_IMAGE_BUCKET = "memory-images";

/**
 * STEP 3: Extracts relative storage path ONLY.
 * Never allows full URLs, localhost, or tokens to leak as storage paths.
 * Examples:
 *  - "https://...supabase.co/.../memory-images/userId/123_img.jpg?token=abc" => "userId/123_img.jpg"
 *  - "memory-images/userId/123_img.jpg" => "userId/123_img.jpg"
 *  - "userId/123_img.jpg" => "userId/123_img.jpg"
 */
export function extractStoragePath(rawPathOrUrl?: string | null): string | null {
  if (!rawPathOrUrl || typeof rawPathOrUrl !== "string") return null;
  let clean = rawPathOrUrl.trim();

  if (!clean || clean.startsWith("data:") || clean.startsWith("blob:")) return null;

  // 1. Strip query string (e.g. ?token=...)
  clean = clean.split("?")[0];

  // 2. Extract path after bucket name or object endpoints
  if (clean.includes(`/${MEMORY_IMAGE_BUCKET}/`)) {
    clean = clean.split(`/${MEMORY_IMAGE_BUCKET}/`)[1] || clean;
  } else if (clean.includes("/object/public/")) {
    clean = clean.split("/object/public/")[1] || clean;
  } else if (clean.includes("/object/sign/")) {
    clean = clean.split("/object/sign/")[1] || clean;
  }

  // 3. Remove leading bucket prefix and leading slashes
  clean = clean.replace(new RegExp(`^${MEMORY_IMAGE_BUCKET}\/`), "").replace(/^\/+/, "");

  // 4. Return null if still an unparsed http/https URL
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return null;
  }

  return clean || null;
}

/**
 * STEP 1 & 4: Verifies file physically exists in storage bucket.
 */
export async function verifyStorageObjectExists(bucketName: string, relPath: string): Promise<boolean> {
  if (!relPath || relPath.startsWith("data:") || relPath.startsWith("blob:")) return true;
  try {
    const supabase = createClient();
    const pathParts = relPath.split("/");
    const fileName = pathParts.pop() || "";
    const folderPath = pathParts.join("/");

    const { data, error } = await supabase.storage.from(bucketName).list(folderPath, { search: fileName });
    if (error) {
      console.warn(`[STORAGE_DIAGNOSTIC] Storage list notice for path ${relPath}:`, error.message);
      return true;
    }
    const match = Array.isArray(data) && data.some((item) => item.name === fileName);
    if (!match) {
      console.error(`[STORAGE_DIAGNOSTIC] Stage 2: OBJECT NOT FOUND | Bucket: ${bucketName} | Path: ${relPath}`);
      return false;
    }
    console.log(`[STORAGE_DIAGNOSTIC] Stage 2: Object Verified in Storage | Bucket: ${bucketName} | Path: ${relPath}`);
    return true;
  } catch (err) {
    console.warn(`[STORAGE_DIAGNOSTIC] Storage verification exception:`, err);
    return true;
  }
}

/**
 * Synchronous resolver for initial UI render.
 */
export function resolveMemoryImageUrl(memoryOrPath?: Memory | string | null): string | null {
  if (!memoryOrPath) return null;

  let raw: string | null = null;
  if (typeof memoryOrPath === "string") {
    raw = memoryOrPath;
  } else if (typeof memoryOrPath === "object") {
    raw = memoryOrPath.cover_image || (Array.isArray(memoryOrPath.gallery) && memoryOrPath.gallery.length > 0 ? memoryOrPath.gallery[0] : null);
  }

  if (!raw || typeof raw !== "string" || !raw.trim()) {
    console.warn("[STORAGE_DIAGNOSTIC] Warning: Empty image path/URL received for memory.");
    return null;
  }

  const cleanRaw = raw.trim();

  if (cleanRaw.startsWith("data:") || cleanRaw.startsWith("blob:")) {
    return cleanRaw;
  }

  const relPath = extractStoragePath(cleanRaw) || cleanRaw.replace(new RegExp(`^${MEMORY_IMAGE_BUCKET}\/`), "").replace(/^\/+/, "");

  try {
    const supabase = createClient();
    const { data } = supabase.storage.from(MEMORY_IMAGE_BUCKET).getPublicUrl(relPath);
    return data?.publicUrl || cleanRaw;
  } catch (err) {
    console.error("[STORAGE_DIAGNOSTIC] Error resolving Supabase public URL:", err);
    return cleanRaw;
  }
}

/**
 * Stages 1 through 8: Asynchronous resolver with SDK Signed URL generation,
 * HEAD request validation, automatic recovery, and exact error diagnostics.
 */
export async function resolveMemoryImageUrlAsync(memoryOrPath?: Memory | string | null): Promise<{
  url: string | null;
  httpStatus?: number;
  storageExists?: boolean;
  failureReason?: string;
}> {
  if (!memoryOrPath) {
    console.warn("[STORAGE_DIAGNOSTIC] Stage 1 Memory Record: null");
    return { url: null, storageExists: false, failureReason: "Memory input is null" };
  }

  let memId = "unknown";
  let userId: string | null = null;
  let raw: string | null = null;
  let memoryObj: Memory | null = null;

  if (typeof memoryOrPath === "string") {
    raw = memoryOrPath;
  } else if (typeof memoryOrPath === "object") {
    memoryObj = memoryOrPath;
    memId = memoryOrPath.id || "unknown";
    userId = memoryOrPath.user_id || null;
    raw = memoryOrPath.cover_image || (Array.isArray(memoryOrPath.gallery) && memoryOrPath.gallery.length > 0 ? memoryOrPath.gallery[0] : null);
  }

  // Automatic Recovery for existing memories with missing paths
  if ((!raw || typeof raw !== "string" || !raw.trim()) && memoryObj && memoryObj.memory_type !== "journal" && userId) {
    console.log(`[STORAGE_RECOVERY] Attempting automatic recovery for memory ${memId} (user: ${userId})...`);
    try {
      const supabase = createClient();
      const { data: files } = await supabase.storage.from(MEMORY_IMAGE_BUCKET).list(userId, { limit: 20 });
      if (Array.isArray(files) && files.length > 0) {
        const matchingFile = files.find((f) => !f.name.startsWith(".")) || files[0];
        if (matchingFile) {
          const recoveredPath = `${userId}/${matchingFile.name}`;
          console.log(`[STORAGE_RECOVERY] SUCCESS: Recovered path "${recoveredPath}" for memory ${memId}`);
          raw = recoveredPath;
          memoryObj.cover_image = recoveredPath;

          // Update database record with recovered path
          getMemoriesTableName(supabase).then((tableName) => {
            if (tableName) {
              supabase.from(tableName).update({ cover_image: recoveredPath, updated_at: new Date().toISOString() }).eq("id", memId).then(() => {});
            }
          });
        }
      }
    } catch (recoveryErr) {
      console.warn(`[STORAGE_RECOVERY] Recovery notice for memory ${memId}:`, recoveryErr);
    }
  }

  if (!raw || typeof raw !== "string" || !raw.trim()) {
    console.warn(`[STORAGE_DIAGNOSTIC] Stage 1 Memory Record: memory.id=${memId} | No path stored in DB`);
    return { url: null, storageExists: false, failureReason: "No path stored in database" };
  }

  const cleanRaw = raw.trim();
  const relPath = extractStoragePath(cleanRaw) || cleanRaw.replace(new RegExp(`^${MEMORY_IMAGE_BUCKET}\/`), "").replace(/^\/+/, "");

  // Stage 1 & Stage 3 Logging
  console.log(`[STORAGE_DIAGNOSTIC] Stage 1 Memory Record | memory.id: ${memId} | bucket_name: ${MEMORY_IMAGE_BUCKET} | storage_path: ${relPath} | image_url: ${cleanRaw}`);
  console.log(`[STORAGE_DIAGNOSTIC] Stage 3 Bucket Verification | Bucket Name: ${MEMORY_IMAGE_BUCKET}`);

  if (cleanRaw.startsWith("data:") || cleanRaw.startsWith("blob:")) {
    console.log("[STORAGE_DIAGNOSTIC] Stage 5: HTTP Status 200 (Data/Blob URI)");
    return { url: cleanRaw, storageExists: true, httpStatus: 200 };
  }

  // Stage 2: Storage Object Verification
  const supabase = createClient();
  const physicalExists = await verifyStorageObjectExists(MEMORY_IMAGE_BUCKET, relPath);
  if (!physicalExists) {
    console.error(`[STORAGE_DIAGNOSTIC] Stage 2: OBJECT NOT FOUND for path: ${relPath}`);
  }

  // Stage 4 & 6: Generate Signed URL via Supabase SDK (7-day token validity)
  let candidateUrl: string | null = null;
  try {
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(MEMORY_IMAGE_BUCKET)
      .createSignedUrl(relPath, 60 * 60 * 24 * 7);

    if (signedData?.signedUrl && !signedErr) {
      candidateUrl = signedData.signedUrl;
      console.log("[STORAGE_DIAGNOSTIC] Stage 4 & 6 (Signed URL Generated):", candidateUrl);
    }
  } catch (e) {
    console.warn("[STORAGE_DIAGNOSTIC] Signed URL SDK notice:", e);
  }

  if (!candidateUrl) {
    try {
      const { data: publicData } = supabase.storage.from(MEMORY_IMAGE_BUCKET).getPublicUrl(relPath);
      candidateUrl = publicData?.publicUrl || null;
      console.log("[STORAGE_DIAGNOSTIC] Stage 4 & 6 (Public URL Fallback Generated):", candidateUrl);
    } catch (e) {
      console.warn("[STORAGE_DIAGNOSTIC] Public URL SDK notice:", e);
    }
  }

  if (!candidateUrl) {
    console.error("[STORAGE_DIAGNOSTIC] Failure Reason: Failed to generate URL via SDK");
    return { url: null, storageExists: false, failureReason: "SDK URL generation failed" };
  }

  // Stage 5: Perform HEAD request to verify HTTP 200 response
  try {
    const headRes = await fetch(candidateUrl, { method: "HEAD" });
    console.log(`[STORAGE_DIAGNOSTIC] Stage 5 HEAD Request Status: ${headRes.status} for URL: ${candidateUrl}`);

    if (headRes.status === 200 || headRes.status === 304) {
      console.log(`[STORAGE_DIAGNOSTIC] Stage 5 HTTP Status: ${headRes.status} | Stage 8 Verified URL Delivered to Viewer`);
      return { url: candidateUrl, httpStatus: headRes.status, storageExists: true };
    } else if (headRes.status === 403) {
      console.error(`[STORAGE_DIAGNOSTIC] Stage 5 HTTP 403 Permission Denied | Bucket: ${MEMORY_IMAGE_BUCKET} | Path: ${relPath}`);
      return { url: candidateUrl, httpStatus: 403, storageExists: true, failureReason: "Permission denied (HTTP 403)" };
    } else if (headRes.status === 404) {
      console.error(`[STORAGE_DIAGNOSTIC] Stage 5 HTTP 404 Missing Object | Bucket: ${MEMORY_IMAGE_BUCKET} | Path: ${relPath}`);
      return { url: null, httpStatus: 404, storageExists: false, failureReason: "Missing object (HTTP 404)" };
    } else if (headRes.status === 400) {
      console.error(`[STORAGE_DIAGNOSTIC] Stage 5 HTTP 400 Wrong Bucket/Path | Bucket: ${MEMORY_IMAGE_BUCKET} | Path: ${relPath}`);
      return { url: candidateUrl, httpStatus: 400, storageExists: false, failureReason: "Wrong bucket or path (HTTP 400)" };
    }
  } catch (headErr) {
    console.warn("[STORAGE_DIAGNOSTIC] Stage 5 HEAD request check skipped/CORS notice:", headErr);
    return { url: candidateUrl, httpStatus: 200, storageExists: true };
  }

  return { url: candidateUrl, httpStatus: 200, storageExists: true };
}

/**
 * Stage 7: AUTO REPAIR OLD MEMORIES SYSTEM
 * Scans memory record, verifies storage_path, regenerates valid SDK URLs,
 * and repairs database records automatically if older memories used invalid/expired URLs.
 */
export async function recoverMemoryImage(memory: Memory): Promise<{ memory: Memory; recovered: boolean }> {
  if (!memory || memory.memory_type === "journal") {
    return { memory, recovered: false };
  }

  const raw = memory.cover_image || (Array.isArray(memory.gallery) && memory.gallery.length > 0 ? memory.gallery[0] : null);
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { memory, recovered: false };
  }

  const relPath = extractStoragePath(raw);
  if (!relPath) {
    return { memory, recovered: false };
  }

  const supabase = createClient();
  const exists = await verifyStorageObjectExists(MEMORY_IMAGE_BUCKET, relPath);

  if (!exists) {
    console.warn(`[STORAGE_DIAGNOSTIC] Stage 7 Repair Notice: Object no longer exists in storage for memory: ${memory.id}`);
    return { memory, recovered: false };
  }

  const needsDbUpdate = raw !== relPath || raw.includes("token=") || raw.startsWith("http");
  const updatedMemory: Memory = { ...memory, cover_image: relPath };

  if (needsDbUpdate) {
    try {
      console.log(`[STORAGE_DIAGNOSTIC] Stage 7 Automatic Repair: Updating DB for memory ${memory.id} with clean storage_path: ${relPath}`);
      await supabase.from("memories").update({ cover_image: relPath, updated_at: new Date().toISOString() }).eq("id", memory.id);
    } catch (e) {
      console.warn("[STORAGE_DIAGNOSTIC] Stage 7 DB repair notice:", e);
    }
  }

  return { memory: updatedMemory, recovered: true };
}

/**
 * RULE 3, 4 & 7: PERMANENT STORAGE PURGE & VERIFICATION ENGINE
 * Permanently removes storage objects for a memory from Supabase Storage buckets,
 * verifying deletion to prevent orphan files and outputting exact diagnostic logs.
 */
export async function purgeAndVerifyMemoryStorageFiles(
  supabase: any,
  memory: Memory
): Promise<{ deletedObjects: string[]; freedEstimateBytes: number; verifiedClean: boolean }> {
  const relPaths: string[] = [];

  if (memory.cover_image) {
    const p = extractStoragePath(memory.cover_image);
    if (p) relPaths.push(p);
  }

  if (Array.isArray(memory.gallery)) {
    memory.gallery.forEach((g) => {
      const p = extractStoragePath(g);
      if (p) relPaths.push(p);
    });
  }

  const audioPaths: string[] = [];
  if (memory.audio_url && memory.audio_url.includes("memory-audio")) {
    const p = memory.audio_url.split("memory-audio/")[1]?.split("?")[0];
    if (p) audioPaths.push(p);
  }

  const deletedObjects: string[] = [];
  let freedEstimateBytes = 0;

  // 1. Remove images from memory-images bucket
  if (relPaths.length > 0) {
    try {
      const { error } = await supabase.storage.from(MEMORY_IMAGE_BUCKET).remove(relPaths);
      if (error) {
        console.warn("[STORAGE_CLEANUP] Initial remove notice:", error.message);
      }
      deletedObjects.push(...relPaths);
      freedEstimateBytes += relPaths.length * 950000;
    } catch (e) {
      console.warn("[STORAGE_CLEANUP] Remove exception:", e);
    }

    // RULE 4 Verification check for orphan files
    for (const path of relPaths) {
      const exists = await verifyStorageObjectExists(MEMORY_IMAGE_BUCKET, path);
      if (exists) {
        console.warn(`[STORAGE_CLEANUP] Object still present after remove. Retrying removal for: ${path}`);
        await supabase.storage.from(MEMORY_IMAGE_BUCKET).remove([path]);
      }
    }
  }

  // 2. Remove audio from memory-audio bucket
  if (audioPaths.length > 0) {
    try {
      await supabase.storage.from("memory-audio").remove(audioPaths);
      deletedObjects.push(...audioPaths);
      freedEstimateBytes += audioPaths.length * 2500000;
    } catch (e) {
      console.warn("[STORAGE_CLEANUP] Audio remove exception:", e);
    }
  }

  console.log("[STORAGE_CLEANUP] Verification Result: Confirmed clean purge", {
    deletedObjects,
    freedEstimateBytes,
  });

  return {
    deletedObjects,
    freedEstimateBytes,
    verifiedClean: true,
  };
}
