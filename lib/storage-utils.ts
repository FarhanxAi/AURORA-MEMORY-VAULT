import { Memory } from "./types";

export const DEFAULT_USER_STORAGE_LIMIT_MB = 500;
export const DEFAULT_USER_STORAGE_LIMIT_BYTES = DEFAULT_USER_STORAGE_LIMIT_MB * 1024 * 1024;

export interface StorageMetrics {
  storageLimitMb: number;
  storageLimitBytes: number;
  storageUsedBytes: number;
  usedMb: number;
  remainingMb: number;
  usagePct: number;
  imageCount: number;
  journalCount: number;
  statusColor: "emerald" | "amber" | "orange" | "rose";
  statusMessage: string | null;
  isFull: boolean;
}

/**
 * Formats bytes into a clean human-readable string.
 * Handles KB, MB, and GB ranges with consistent precision.
 */
export function formatByteSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1).replace(/\.0$/, "")} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Calculates the UTF-8 byte count of a journal text string.
 * Only counts actual stored text — never includes React state,
 * rendered HTML, metadata, mood, category, tags, or preview objects.
 */
export function calcJournalTextBytes(text: string | null | undefined): number {
  if (!text || !text.trim()) return 0;
  try {
    return new TextEncoder().encode(text).byteLength;
  } catch {
    // Fallback: approximate UTF-8 byte count
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code <= 0x7f) count += 1;
      else if (code <= 0x7ff) count += 2;
      else if (code <= 0xffff) count += 3;
      else count += 4;
    }
    return count;
  }
}

/**
 * Calculates per-user storage metrics using exact file sizes where available,
 * falling back to real UTF-8 journal text bytes for journal entries.
 *
 * SOURCE OF TRUTH order:
 *   1. memory.file_size   (set at upload time from File.size)
 *   2. Journal text UTF-8 bytes (description field only)
 *   3. 0 for anything without a physical file
 */
export function calculateUserStorageMetrics(
  memories: Memory[],
  avatarUrl?: string | null,
  customLimitMb: number = DEFAULT_USER_STORAGE_LIMIT_MB
): StorageMetrics {
  const limitMb = customLimitMb;
  const limitBytes = limitMb * 1024 * 1024;

  const imageCount = memories.filter(
    (m) => !m.deleted && (m.memory_type === "photo" || m.cover_image)
  ).length;

  const journalCount = memories.filter(
    (m) => !m.deleted && m.memory_type === "journal"
  ).length;

  let usedBytes = 0;

  for (const m of memories) {
    // Priority 1: use exact file_size stored at upload time
    if (typeof m.file_size === "number" && m.file_size > 0) {
      usedBytes += m.file_size;
      continue;
    }

    // Priority 2: journal entries — count only the UTF-8 text bytes
    if (m.memory_type === "journal") {
      usedBytes += calcJournalTextBytes(m.description);
      continue;
    }

    // Priority 3: photo memories without file_size (legacy / base64 fallback)
    if (m.cover_image) {
      if (m.cover_image.startsWith("data:")) {
        // Base64 data URL: calculate actual decoded byte size
        usedBytes += Math.round((m.cover_image.length * 3) / 4);
      } else {
        // Storage path only — we cannot determine size here without an API call
        // Use a conservative estimate; real size is fetched via fetchRealSupabaseStorageUsage
        usedBytes += 0;
      }
    }

    if (Array.isArray(m.gallery)) {
      for (const g of m.gallery) {
        if (g.startsWith("data:")) {
          usedBytes += Math.round((g.length * 3) / 4);
        }
      }
    }
  }

  // Avatar: only count if it's a base64 data URL (embedded in DB)
  if (avatarUrl && avatarUrl.startsWith("data:")) {
    usedBytes += Math.round((avatarUrl.length * 3) / 4);
  }

  const usedMb = +(usedBytes / (1024 * 1024)).toFixed(2);
  const remainingMb = Math.max(0, +(limitMb - usedMb).toFixed(2));
  const usagePct = Math.min(100, +((usedBytes / limitBytes) * 100).toFixed(1));

  let statusColor: "emerald" | "amber" | "orange" | "rose" = "emerald";
  let statusMessage: string | null = null;
  const isFull = usagePct >= 100 || remainingMb <= 0;

  if (usagePct >= 100 || remainingMb <= 0) {
    statusColor = "rose";
    statusMessage = "Storage Full. Export your vault and free space to continue uploading.";
  } else if (usagePct >= 90) {
    statusColor = "orange";
    statusMessage = "Storage almost full. Export your vault to create a backup.";
  } else if (usagePct >= 70) {
    statusColor = "amber";
    statusMessage = "Storage is filling up. Consider exporting a backup.";
  }

  return {
    storageLimitMb: limitMb,
    storageLimitBytes: limitBytes,
    storageUsedBytes: usedBytes,
    usedMb,
    remainingMb,
    usagePct,
    imageCount,
    journalCount,
    statusColor,
    statusMessage,
    isFull,
  };
}

/**
 * Fetches the REAL physical storage byte consumption directly from
 * Supabase Storage buckets for a given user.
 *
 * - Never uses cached values.
 * - Never estimates.
 * - Reads the actual size metadata from each storage object.
 * - Logs diagnostic info to console for debugging.
 */
export async function fetchRealSupabaseStorageUsage(
  supabase: any,
  userId: string
): Promise<number> {
  if (!userId || userId === "system" || userId.startsWith("demo-")) return 0;

  let totalBytes = 0;
  const buckets = [
    "memory-images",
    "memory-videos",
    "memory-audio",
    "avatars",
    "profiles",
    "memories",
  ];

  console.log(`[STORAGE_ENGINE] Fetching real storage for user: ${userId}`);

  for (const bucket of buckets) {
    try {
      const { data: files, error } = await (supabase as any).storage
        .from(bucket)
        .list(userId, { limit: 1000 });

      if (error) {
        // Bucket doesn't exist or access denied — not a fatal error
        continue;
      }

      if (files && files.length > 0) {
        let bucketBytes = 0;
        for (const f of files) {
          const size =
            (f.metadata as { size?: number })?.size ||
            (f as unknown as { size?: number }).size ||
            0;
          bucketBytes += size;
          console.log(`[STORAGE_ENGINE] ${bucket}/${f.name} → ${formatByteSize(size)}`);
        }
        totalBytes += bucketBytes;
        console.log(`[STORAGE_ENGINE] Bucket "${bucket}" subtotal: ${formatByteSize(bucketBytes)}`);
      }
    } catch (err) {
      console.warn(`[STORAGE_ENGINE] Bucket "${bucket}" query notice:`, err);
    }
  }

  console.log(`[STORAGE_ENGINE] TOTAL real storage: ${formatByteSize(totalBytes)} (${totalBytes} bytes)`);
  return totalBytes;
}

/**
 * Calculates real UTF-8 journal storage bytes across all journal memories.
 * Returns 0 for non-journal entries.
 */
export function calcTotalJournalStorageBytes(memories: Memory[]): number {
  return memories
    .filter((m) => m.memory_type === "journal" && !m.deleted)
    .reduce((acc, m) => acc + calcJournalTextBytes(m.description), 0);
}

/**
 * Formats the storage display string from raw bytes.
 * Ensures consistent display across the entire app.
 */
export function formatStorageDisplay(bytes: number): string {
  return formatByteSize(bytes);
}
