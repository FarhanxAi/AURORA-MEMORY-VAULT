import { SupabaseClient } from "@supabase/supabase-js";
import { Memory } from "./types";
import { vaultStore } from "./persistence/vault-store";

// Canonical memories table name — always 'memories', never probed dynamically.
// Dynamic probing was unreliable: a transient RLS/timeout error could resolve
// to a wrong table and return the wrong dataset silently.
const MEMORIES_TABLE = "memories";

/**
 * Returns the canonical memories table name.
 * Kept as a function for backward compatibility with callers.
 */
export async function getMemoriesTableName(_supabase?: SupabaseClient): Promise<string> {
  return MEMORIES_TABLE;
}

/**
 * No-op kept for backward compatibility.
 */
export function refreshSchemaCache(): void {}

/**
 * Helper to parse bucket name and file path from any Supabase storage URL format.
 */
export function extractStorageBucketAndPath(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url || typeof url !== "string" || url.startsWith("data:")) return null;

  try {
    // Format 1: /storage/v1/object/public/bucket-name/path/to/file.ext
    const match = url.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)$/);
    if (match && match[1] && match[2]) {
      return { bucket: match[1], path: match[2] };
    }

    // Format 2: bucket-name in URL path
    const knownBuckets = ["memory-images", "memory-videos", "memory-audio", "avatars", "profiles", "memories"];
    for (const bucket of knownBuckets) {
      if (url.includes(`${bucket}/`)) {
        const parts = url.split(`${bucket}/`);
        if (parts[1]) {
          return { bucket, path: parts[1] };
        }
      }
    }
  } catch {
    // Ignore URL parse errors
  }

  return null;
}

/**
 * Performs atomic, transactional deletion of memories:
 * 1. Database records using canonical table name and user_id filtering
 * 2. Storage files across all buckets (cover images, gallery images, audio)
 * 3. Verification + local vaultStore persistence clean
 */
export async function deleteMemoriesAtomic(
  supabase: SupabaseClient,
  userId: string,
  memoriesToDelete: Memory[],
  onProgress?: (step: string, percent: number) => void
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (!userId || memoriesToDelete.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  const totalItems = memoriesToDelete.length;

  try {
    const tableName = await getMemoriesTableName(supabase);
    const failures: string[] = [];

    // STEP 1: Delete database records first.
    onProgress?.("Removing database records...", 10);
    const idsToDelete = memoriesToDelete.map((m) => m.id);
    const chunkSize = 50;

    if (tableName) {
      for (let c = 0; c < idsToDelete.length; c += chunkSize) {
        const chunk = idsToDelete.slice(c, c + chunkSize);

        try {
          const { error: dbErr } = await supabase
            .from(tableName)
            .delete()
            .in("id", chunk)
            .eq("user_id", userId);

          if (dbErr) {
            failures.push(`Database delete failed in ${tableName}: ${dbErr.message}`);
          }
        } catch (dbEx) {
          const message = dbEx instanceof Error ? dbEx.message : String(dbEx);
          failures.push(`Database delete failed in ${tableName}: ${message}`);
        }

        const dbPct = 10 + Math.round(((c + chunkSize) / idsToDelete.length) * 40);
        onProgress?.(
          `Removing records... (${Math.min(c + chunkSize, idsToDelete.length)}/${idsToDelete.length})`,
          Math.min(dbPct, 50)
        );
      }
    }

    if (failures.length > 0) {
      return { success: false, deletedCount: 0, error: failures.join(" | ") };
    }

    // STEP 2: Delete Storage files (images + audio + gallery)
    onProgress?.("Removing stored files...", 55);

    for (let i = 0; i < memoriesToDelete.length; i++) {
      const mem = memoriesToDelete[i];
      const urlsToRemove: string[] = [];

      if (mem.cover_image) urlsToRemove.push(mem.cover_image);
      if (Array.isArray(mem.gallery)) urlsToRemove.push(...mem.gallery);
      if (mem.audio_url) urlsToRemove.push(mem.audio_url);

      for (const targetUrl of urlsToRemove) {
        const parsed = extractStorageBucketAndPath(targetUrl);
        if (parsed) {
          try {
            const { error: storageError } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
            if (storageError) {
              failures.push(`Storage delete failed for ${parsed.bucket}/${parsed.path}: ${storageError.message}`);
            }
          } catch (storageErr) {
            const message = storageErr instanceof Error ? storageErr.message : String(storageErr);
            failures.push(`Storage delete failed for ${parsed.bucket}/${parsed.path}: ${message}`);
          }
        }
      }

      const filePct = 55 + Math.round(((i + 1) / totalItems) * 30);
      onProgress?.(`Removing stored files... (${i + 1}/${totalItems})`, Math.min(filePct, 85));
    }

    if (failures.length > 0) {
      return { success: false, deletedCount: 0, error: failures.join(" | ") };
    }

    // STEP 3: Verify database deletion before updating local caches.
    onProgress?.("Verifying deletion...", 90);

    const { data: remainingRows, error: verifyError } = await supabase
      .from(tableName)
      .select("id")
      .in("id", idsToDelete)
      .eq("user_id", userId);

    if (verifyError) {
      return { success: false, deletedCount: 0, error: `Deletion verification failed: ${verifyError.message}` };
    }

    if (Array.isArray(remainingRows) && remainingRows.length > 0) {
      return {
        success: false,
        deletedCount: 0,
        error: `Deletion verification failed: ${remainingRows.length} memory record(s) still exist.`,
      };
    }

    // STEP 4: Clear local persistence cache & storage records
    vaultStore.saveMemories(userId, []);
    idsToDelete.forEach((id) => vaultStore.deleteMemoryItem(userId, id));

    onProgress?.("Complete!", 100);
    return { success: true, deletedCount: totalItems };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Deletion failed unexpectedly.";
    console.error("[SUPABASE ATOMIC DELETE ERROR]", err);
    return { success: false, deletedCount: 0, error: errorMsg };
  }
}
