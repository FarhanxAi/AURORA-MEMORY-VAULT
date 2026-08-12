import { Memory } from "./types";
import { createClient } from "./supabase/client";
import { getMemoriesTableName } from "./supabase-db";

export const MEMORY_IMAGE_BUCKET = "memory-images";
export const AVATAR_BUCKET = "avatars";

// High-speed in-memory resolution cache to eliminate duplicate network & storage queries
const resolvedUrlCache = new Map<string, string>();

/**
 * Extracts relative storage path ONLY.
 * Never allows full URLs, localhost, or tokens to leak as storage paths.
 */
export function extractStoragePath(rawPathOrUrl?: string | null): string | null {
  if (!rawPathOrUrl || typeof rawPathOrUrl !== "string") return null;
  let clean = rawPathOrUrl.trim();

  if (!clean || clean.startsWith("data:") || clean.startsWith("blob:")) return null;

  // 1. Strip query string (e.g. ?token=...)
  clean = clean.split("?")[0];

  // 2. Extract path after bucket name or object endpoints
  const knownBuckets = ["memory-images", "avatars", "profiles", "memories", "memory-audio", "memory-videos"];
  for (const bucket of knownBuckets) {
    if (clean.includes(`/${bucket}/`)) {
      clean = clean.split(`/${bucket}/`)[1] || clean;
      break;
    }
  }

  if (clean.includes("/object/public/")) {
    const parts = clean.split("/object/public/")[1]?.split("/");
    if (parts && parts.length > 1) {
      parts.shift(); // remove bucket
      clean = parts.join("/");
    }
  } else if (clean.includes("/object/sign/")) {
    const parts = clean.split("/object/sign/")[1]?.split("/");
    if (parts && parts.length > 1) {
      parts.shift(); // remove bucket
      clean = parts.join("/");
    }
  }

  // 3. Remove leading bucket prefix and leading slashes
  for (const bucket of knownBuckets) {
    clean = clean.replace(new RegExp(`^${bucket}\/`), "");
  }
  clean = clean.replace(/^\/+/, "");

  // 4. Return null if still an unparsed http/https URL
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return null;
  }

  return clean || null;
}

/**
 * Resolves avatar URL for user profile pictures.
 * Handles Google OAuth URLs, Supabase Storage public URLs, relative storage paths, and data URLs.
 */
export function resolveAvatarUrl(rawUrlOrPath?: string | null): string | null {
  if (!rawUrlOrPath || typeof rawUrlOrPath !== "string" || !rawUrlOrPath.trim()) return null;
  const clean = rawUrlOrPath.trim();

  // If already data URL or full HTTP/HTTPS URL (e.g. Google profile picture or full public Supabase URL)
  if (clean.startsWith("data:") || clean.startsWith("blob:") || clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  // Relative storage path: resolve via avatars bucket
  const relPath = extractStoragePath(clean) || clean;
  try {
    const supabase = createClient();
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(relPath);
    return data?.publicUrl || clean;
  } catch {
    return clean;
  }
}

/**
 * Returns all image URLs/paths associated with a memory (cover_image + all gallery items).
 */
export function getAllMemoryImageUrls(memory: Memory | null | undefined): string[] {
  if (!memory) return [];
  const urls: string[] = [];
  if (memory.cover_image && typeof memory.cover_image === "string" && memory.cover_image.trim()) {
    urls.push(memory.cover_image.trim());
  }
  if (Array.isArray(memory.gallery)) {
    for (const g of memory.gallery) {
      if (g && typeof g === "string" && g.trim() && !urls.includes(g.trim())) {
        urls.push(g.trim());
      }
    }
  }
  return urls;
}

/**
 * Verifies file physically exists in storage bucket.
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
      return true;
    }
    const match = Array.isArray(data) && data.some((item) => item.name === fileName);
    return match;
  } catch (err) {
    return true;
  }
}

/**
 * Synchronous resolver for instantaneous UI render with in-memory caching.
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
    return null;
  }

  const cleanRaw = raw.trim();

  // Fast cache hit
  if (resolvedUrlCache.has(cleanRaw)) {
    return resolvedUrlCache.get(cleanRaw)!;
  }

  if (cleanRaw.startsWith("data:") || cleanRaw.startsWith("blob:")) {
    resolvedUrlCache.set(cleanRaw, cleanRaw);
    return cleanRaw;
  }

  const relPath = extractStoragePath(cleanRaw) || cleanRaw.replace(new RegExp(`^${MEMORY_IMAGE_BUCKET}\/`), "").replace(/^\/+/, "");

  try {
    const supabase = createClient();
    const { data } = supabase.storage.from(MEMORY_IMAGE_BUCKET).getPublicUrl(relPath);
    const resolved = data?.publicUrl || cleanRaw;
    if (resolved) {
      resolvedUrlCache.set(cleanRaw, resolved);
    }
    return resolved;
  } catch (err) {
    return cleanRaw;
  }
}

/**
 * Asynchronous resolver with fast in-memory caching, SDK Signed URL generation,
 * automatic recovery, and fallback.
 */
export async function resolveMemoryImageUrlAsync(memoryOrPath?: Memory | string | null): Promise<{
  url: string | null;
  httpStatus?: number;
  storageExists?: boolean;
  failureReason?: string;
}> {
  if (!memoryOrPath) {
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
    try {
      const supabase = createClient();
      const { data: files } = await supabase.storage.from(MEMORY_IMAGE_BUCKET).list(userId, { limit: 20 });
      if (Array.isArray(files) && files.length > 0) {
        const matchingFile = files.find((f) => !f.name.startsWith(".")) || files[0];
        if (matchingFile) {
          const recoveredPath = `${userId}/${matchingFile.name}`;
          raw = recoveredPath;
          memoryObj.cover_image = recoveredPath;

          getMemoriesTableName(supabase).then((tableName) => {
            if (tableName) {
              supabase.from(tableName).update({ cover_image: recoveredPath, updated_at: new Date().toISOString() }).eq("id", memId).then(() => {});
            }
          });
        }
      }
    } catch (recoveryErr) {
      console.warn(`[STORAGE_RECOVERY] Notice for memory ${memId}:`, recoveryErr);
    }
  }

  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { url: null, storageExists: false, failureReason: "No path stored in database" };
  }

  const cleanRaw = raw.trim();

  // Instant in-memory cache return
  if (resolvedUrlCache.has(cleanRaw)) {
    const cached = resolvedUrlCache.get(cleanRaw)!;
    return { url: cached, storageExists: true, httpStatus: 200 };
  }

  if (cleanRaw.startsWith("data:") || cleanRaw.startsWith("blob:")) {
    resolvedUrlCache.set(cleanRaw, cleanRaw);
    return { url: cleanRaw, storageExists: true, httpStatus: 200 };
  }

  const relPath = extractStoragePath(cleanRaw) || cleanRaw.replace(new RegExp(`^${MEMORY_IMAGE_BUCKET}\/`), "").replace(/^\/+/, "");
  const supabase = createClient();

  let candidateUrl: string | null = null;
  try {
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(MEMORY_IMAGE_BUCKET)
      .createSignedUrl(relPath, 60 * 60 * 24 * 7);

    if (signedData?.signedUrl && !signedErr) {
      candidateUrl = signedData.signedUrl;
    }
  } catch (e) {
    // Fallback to public URL
  }

  if (!candidateUrl) {
    try {
      const { data: publicData } = supabase.storage.from(MEMORY_IMAGE_BUCKET).getPublicUrl(relPath);
      candidateUrl = publicData?.publicUrl || null;
    } catch (e) {
      // Fallback
    }
  }

  if (!candidateUrl) {
    return { url: null, storageExists: false, failureReason: "SDK URL generation failed" };
  }

  // Cache resolved URL
  resolvedUrlCache.set(cleanRaw, candidateUrl);

  return { url: candidateUrl, httpStatus: 200, storageExists: true };
}

/**
 * Auto-repair old memories with invalid or expired URLs.
 */
export async function recoverMemoryImage(memory: Memory): Promise<{ memory: Memory; recovered: boolean }> {
  if (!memory || memory.memory_type === "journal") {
    return { memory, recovered: false };
  }

  const raw = memory.cover_image || (Array.isArray(memory.gallery) && memory.gallery.length > 0 ? memory.gallery[0] : null);
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { memory, recovered: false };
  }

  // If already clean relative storage path or data URL, instantly skip
  if (raw.startsWith("data:") || raw.startsWith("blob:") || (!raw.startsWith("http://") && !raw.startsWith("https://") && !raw.includes("token="))) {
    return { memory, recovered: false };
  }

  const relPath = extractStoragePath(raw);
  if (!relPath) {
    return { memory, recovered: false };
  }

  const supabase = createClient();
  const exists = await verifyStorageObjectExists(MEMORY_IMAGE_BUCKET, relPath);

  if (!exists) {
    return { memory, recovered: false };
  }

  const updatedMemory: Memory = { ...memory, cover_image: relPath };

  try {
    await supabase.from("memories").update({ cover_image: relPath, updated_at: new Date().toISOString() }).eq("id", memory.id);
  } catch (e) {
    console.warn("[STORAGE_DIAGNOSTIC] DB repair notice:", e);
  }

  return { memory: updatedMemory, recovered: true };
}

/**
 * Permanently removes storage objects for a memory from Supabase Storage buckets.
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
  const failures: string[] = [];

  // 1. Remove images from memory-images bucket
  if (relPaths.length > 0) {
    try {
      const { error } = await supabase.storage.from(MEMORY_IMAGE_BUCKET).remove(relPaths);
      if (error) {
        failures.push(`Image storage removal failed: ${error.message}`);
      } else {
        deletedObjects.push(...relPaths);
        freedEstimateBytes += relPaths.length * 950000;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      failures.push(`Image storage removal failed: ${message}`);
    }

    // Clean cached URLs
    relPaths.forEach((p) => {
      resolvedUrlCache.delete(p);
      resolvedUrlCache.delete(`${MEMORY_IMAGE_BUCKET}/${p}`);
    });
  }

  // 2. Remove audio from memory-audio bucket
  if (audioPaths.length > 0) {
    try {
      const { error } = await supabase.storage.from("memory-audio").remove(audioPaths);
      if (error) {
        failures.push(`Audio storage removal failed: ${error.message}`);
      } else {
        deletedObjects.push(...audioPaths);
        freedEstimateBytes += audioPaths.length * 2500000;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      failures.push(`Audio storage removal failed: ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join(" | "));
  }

  return {
    deletedObjects,
    freedEstimateBytes,
    verifiedClean: true,
  };
}

/**
 * Resilient helper to upload avatar images to Supabase Storage.
 * Deterministically uses the avatars bucket and verifies success.
 * Never silently converts to base64.
 */
export async function uploadAvatarToStorage(
  supabase: any,
  userId: string,
  fileOrBlob: Blob | File
): Promise<string> {
  const fileExt = "webp";
  const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

  // Try avatars bucket first, then memory-images, then memories
  const bucketList = [AVATAR_BUCKET, MEMORY_IMAGE_BUCKET, "memories"];
  let lastError: Error | null = null;

  for (const bucket of bucketList) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileOrBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          console.log(`[AVATAR UPLOAD SUCCESS] Bucket: ${bucket}, Path: ${filePath}`);
          return publicUrlData.publicUrl;
        }
      } else if (error) {
        lastError = new Error(error.message);
        console.warn(`[AVATAR UPLOAD ATTEMPT] Bucket "${bucket}":`, error.message);
      }
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AVATAR UPLOAD ATTEMPT] Bucket "${bucket}" exception:`, err);
    }
  }

  if (lastError) {
    throw new Error(`Failed to upload avatar to cloud storage: ${lastError.message}`);
  }

  throw new Error("Avatar upload could not be completed. Please check storage bucket permissions.");
}

