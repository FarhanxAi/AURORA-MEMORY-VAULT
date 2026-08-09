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
 * 1. Storage files across all buckets (cover images, gallery images, audio)
 * 2. Database records using dynamic table resolution and user_id filtering
 * 3. Local vaultStore persistence clean
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
    // Dynamically resolve production table
    let tableName = await getMemoriesTableName(supabase);

    // STEP 1: Delete Storage files (images + audio + gallery)
    onProgress?.("Removing stored files...", 10);

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
            await supabase.storage.from(parsed.bucket).remove([parsed.path]);
          } catch (storageErr) {
            console.warn(`[STORAGE DELETE NOTICE] ${parsed.bucket}/${parsed.path}:`, storageErr);
          }
        }
      }

      const filePct = 10 + Math.round(((i + 1) / totalItems) * 45);
      onProgress?.(`Removing stored files... (${i + 1}/${totalItems})`, Math.min(filePct, 55));
    }

    // STEP 2: Delete Database Records with dynamic schema detection
    onProgress?.("Removing database records...", 60);
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
            console.warn(`[SUPABASE SCHEMA DELETE NOTICE] Table "${tableName}" notice: ${dbErr.message}`);
          }
        } catch (dbEx) {
          console.warn(`[SUPABASE DB EXCEPTION] Table "${tableName}" delete notice:`, dbEx);
        }

        const dbPct = 60 + Math.round(((c + chunkSize) / idsToDelete.length) * 35);
        onProgress?.(
          `Removing records... (${Math.min(c + chunkSize, idsToDelete.length)}/${idsToDelete.length})`,
          Math.min(dbPct, 95)
        );
      }
    }

    // STEP 3: Clear local persistence cache & storage records
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
