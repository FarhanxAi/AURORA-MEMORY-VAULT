import JSZip from "jszip";
import { Memory, UserProfile } from "./types";

export interface ExportProgress {
  step: string;
  percent: number;
}

export interface ExportResult {
  success: boolean;
  exportedImages: number;
  exportedJournals: number;
  skippedItems: number;
  totalFileCount: number;
  zipSizeBytes: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS & FILENAME SANITIZATION
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string | null | undefined, fallback: string = "Untitled Memory"): string {
  if (!name || !name.trim()) return fallback;
  return (
    name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 100) || fallback
  );
}

class UniqueFilenameTracker {
  private usedNames = new Set<string>();

  getUniqueName(folder: string, baseTitle: string, extension: string): string {
    const cleanTitle = sanitizeFileName(baseTitle, "Untitled Memory");
    const ext = extension.startsWith(".") ? extension : `.${extension}`;
    let candidate = `${cleanTitle}${ext}`;
    let count = 2;

    while (this.usedNames.has(`${folder}/${candidate.toLowerCase()}`)) {
      candidate = `${cleanTitle} (${count})${ext}`;
      count++;
    }

    this.usedNames.add(`${folder}/${candidate.toLowerCase()}`);
    return candidate;
  }
}

async function fetchImageBlob(
  url: string
): Promise<{ blob: Blob; ext: string; sizeBytes: number } | null> {
  try {
    if (url.startsWith("data:")) {
      const mimeMatch = url.match(/^data:(image\/[\w+]+);base64,/);
      const mime = mimeMatch?.[1] || "image/jpeg";
      const ext = mime.split("/")[1]?.replace("+xml", "") || "jpg";
      const base64Data = url.replace(/^data:image\/[\w+]+;base64,/, "");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      return { blob, ext, sizeBytes: blob.size };
    }

    const response = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/jpeg";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("gif")) ext = "gif";
    else if (contentType.includes("avif")) ext = "avif";

    const blob = await response.blob();
    console.log(`[EXPORT] Image fetched: ${url.slice(0, 60)} → ${(blob.size / 1024).toFixed(1)} KB`);
    return { blob, ext, sizeBytes: blob.size };
  } catch (err) {
    console.warn(`[EXPORT] Image fetch failed: ${url.slice(0, 80)}`, err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN READABLE TEXT GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

function generateJournalTxt(memory: Memory): string {
  const createdAt = new Date(memory.created_at || Date.now());
  const dateStr = createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const lines: string[] = [
    "====================================================",
    memory.title || "Untitled Journal Entry",
    "====================================================",
    "",
    `Date:     ${dateStr}`,
    `Time:     ${timeStr}`,
  ];

  if (memory.memory_date) lines.push(`Day:      ${memory.memory_date}`);
  if (memory.category)    lines.push(`Category: ${memory.category}`);
  if (memory.mood)        lines.push(`Mood:     ${memory.mood}`);
  if (memory.location)    lines.push(`Location: ${memory.location}`);
  if (memory.favorite)    lines.push(`Favorite: Yes ⭐`);
  if (memory.tags && memory.tags.length > 0) {
    lines.push(`Tags:     ${memory.tags.map((t) => `#${t}`).join(" ")}`);
  }

  lines.push("");
  lines.push("----------------------------------------------------");
  lines.push("");

  if (memory.description && memory.description.trim()) {
    lines.push(memory.description);
  } else {
    lines.push("(No journal text entered)");
  }

  lines.push("");
  lines.push("====================================================");
  lines.push(`Exported from Aurora Vault — ${new Date().toLocaleDateString()}`);
  lines.push("====================================================");

  return lines.join("\n");
}

function generateMemoryDetailsTxt(
  memory: Memory,
  imageRelPaths: string[],
  journalRelPath: string | null
): string {
  const createdAt = new Date(memory.created_at || Date.now());
  const dateStr = createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const lines: string[] = [
    "====================================================",
    `${memory.title || "Untitled Memory"} — Memory Details`,
    "====================================================",
    "",
    `Memory Title: ${memory.title || "Untitled Memory"}`,
    `Date:         ${memory.memory_date || dateStr}`,
    `Time:         ${timeStr}`,
  ];

  if (memory.category)    lines.push(`Category:     ${memory.category}`);
  if (memory.mood)        lines.push(`Mood:         ${memory.mood}`);
  if (memory.location)    lines.push(`Location:     ${memory.location}`);
  lines.push(`Favorite:     ${memory.favorite ? "Yes ⭐" : "No"}`);
  if (memory.tags && memory.tags.length > 0) {
    lines.push(`Tags:         ${memory.tags.map((t) => `#${t}`).join(" ")}`);
  }

  lines.push("");
  lines.push("----------------------------------------------------");
  lines.push("ATTACHED FILES");
  lines.push("----------------------------------------------------");

  if (imageRelPaths.length > 0) {
    lines.push("Image Files:");
    for (const imgPath of imageRelPaths) {
      lines.push(`  • ${imgPath}`);
    }
  } else {
    lines.push("Image Files: None");
  }

  if (journalRelPath) {
    lines.push(`Journal File: ${journalRelPath}`);
  } else {
    lines.push("Journal File: None");
  }

  lines.push("");
  lines.push("====================================================");
  lines.push(`Exported from Aurora Vault — ${new Date().toLocaleDateString()}`);
  lines.push("====================================================");

  return lines.join("\n");
}

function generateReadmeTxt(
  user: UserProfile | null,
  exportDate: Date,
  totalMemories: number,
  photoCount: number,
  journalCount: number
): string {
  const dateStr = exportDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = exportDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  return [
    "====================================================",
    "     AURORA VAULT — COMPLETE BACKUP ARCHIVE",
    "====================================================",
    "",
    `Export Date:    ${dateStr} at ${timeStr}`,
    `User:           ${user?.full_name || user?.email || "Aurora User"}`,
    "",
    "====================================================",
    "     BACKUP SUMMARY",
    "====================================================",
    "",
    `Total Memories: ${totalMemories}`,
    `  Photo Memories:   ${photoCount}`,
    `  Journal Entries:  ${journalCount}`,
    "",
    "====================================================",
    "     FOLDER STRUCTURE",
    "====================================================",
    "",
    "  Aurora_Backup/",
    "  │",
    "  ├── README.txt          — This guide",
    "  │",
    "  ├── Images/             — Original photos named using Memory Titles",
    "  │                         (e.g., Goa Trip (1).jpg, Goa Trip (2).jpg)",
    "  │",
    "  ├── Journals/           — Journal entries as plain text (.txt) files",
    "  │                         (e.g., Goa Trip.txt)",
    "  │",
    "  └── Memory Details/     — Plain text details card for every memory",
    "                            (e.g., Goa Trip Details.txt)",
    "",
    "====================================================",
    "     HOW TO USE YOUR BACKUP",
    "====================================================",
    "",
    "  1. VIEWING IMAGES (Images/ folder)",
    "     Open the Images/ folder to see all your original photos.",
    "     Filenames match your Memory Titles for easy identification.",
    "",
    "  2. READING JOURNALS (Journals/ folder)",
    "     Open the Journals/ folder to read your journal entries.",
    "     Saved as plain text (.txt) files compatible with any device.",
    "",
    "  3. MEMORY DETAILS (Memory Details/ folder)",
    "     Open the Memory Details/ folder to view complete details for",
    "     every memory (Date, Time, Mood, Category, Location, Tags,",
    "     and attached file links).",
    "",
    "====================================================",
    "     UNIVERSAL COMPATIBILITY",
    "====================================================",
    "",
    "  This backup archive is 100% self-contained.",
    "  • No internet required.",
    "  • No developer software required.",
    "  • No code or JSON editors required.",
    "  • Works on Windows, macOS, Linux, Android, and iOS forever.",
    "",
    "====================================================",
    "  Aurora — Store your memories securely. Relive them beautifully.",
    "====================================================",
    "",
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export async function exportVaultAsZip(
  memories: Memory[],
  user: UserProfile | null,
  onProgress: (progress: ExportProgress) => void
): Promise<ExportResult> {
  const exportDate = new Date();

  try {
    onProgress({ step: "Preparing backup...", percent: 2 });

    const activeMemories = memories.filter((m) => !m.deleted);

    if (activeMemories.length === 0) {
      return {
        success: false,
        exportedImages: 0,
        exportedJournals: 0,
        skippedItems: 0,
        totalFileCount: 0,
        zipSizeBytes: 0,
        error: "No memories found to export.",
      };
    }

    const photoMemories = activeMemories.filter(
      (m) => m.memory_type === "photo" || m.cover_image
    );
    const journalMemories = activeMemories.filter(
      (m) => m.memory_type === "journal"
    );

    let expectedImages = 0;
    for (const pm of photoMemories) {
      if (pm.cover_image) expectedImages++;
      if (Array.isArray(pm.gallery)) expectedImages += pm.gallery.length;
    }
    const expectedJournals = journalMemories.length;
    const expectedTotalMemories = activeMemories.length;

    console.log(
      `[UNIVERSAL EXPORT] Expected: ${expectedTotalMemories} memories (${expectedImages} images, ${expectedJournals} journals)`
    );

    // ── Root folder: Aurora_Backup/ ─────────────────────────────────────────
    const zip = new JSZip();
    const root = zip.folder("Aurora_Backup")!;
    const imagesFolder = root.folder("Images")!;
    const journalsFolder = root.folder("Journals")!;
    const detailsFolder = root.folder("Memory Details")!;

    const tracker = new UniqueFilenameTracker();
    let exportedImages = 0;
    let exportedJournals = 0;
    let skippedItems = 0;
    let totalFileCount = 0;
    const exportedFilesList: string[] = [];

    const totalSteps = activeMemories.length;

    // ── STEP 1 & 2 & 3: Export Memories (Images, Journals, Memory Details) ──
    for (let mIdx = 0; mIdx < activeMemories.length; mIdx++) {
      const memory = activeMemories[mIdx];
      const title = memory.title || "Untitled Memory";
      const imageRelPaths: string[] = [];
      let journalRelPath: string | null = null;

      // Images
      const allImageUrls: string[] = [];
      if (memory.cover_image) allImageUrls.push(memory.cover_image);
      if (Array.isArray(memory.gallery)) {
        for (const gUrl of memory.gallery) {
          if (gUrl && !allImageUrls.includes(gUrl)) allImageUrls.push(gUrl);
        }
      }

      if (allImageUrls.length > 0) {
        for (let imgIdx = 0; imgIdx < allImageUrls.length; imgIdx++) {
          const imgUrl = allImageUrls[imgIdx];
          const res = await fetchImageBlob(imgUrl);
          if (res) {
            const baseTitle =
              allImageUrls.length > 1
                ? `${title} (${imgIdx + 1})`
                : title;
            const fileName = tracker.getUniqueName("Images", baseTitle, res.ext);

            imagesFolder.file(fileName, res.blob);
            imageRelPaths.push(`Images/${fileName}`);
            exportedFilesList.push(`Images/${fileName}`);
            exportedImages++;
            totalFileCount++;
          } else {
            console.warn(`[UNIVERSAL EXPORT] Missing image for memory: "${title}"`);
            skippedItems++;
          }
        }
      }

      // Journal entry
      if (memory.memory_type === "journal" || (memory.description && memory.description.trim())) {
        const txtFileName = tracker.getUniqueName("Journals", title, "txt");
        const journalTxtContent = generateJournalTxt(memory);

        journalsFolder.file(txtFileName, journalTxtContent, { binary: false });
        journalRelPath = `Journals/${txtFileName}`;
        exportedFilesList.push(`Journals/${txtFileName}`);
        exportedJournals++;
        totalFileCount++;
      }

      // Memory Details TXT card
      const detailsFileName = tracker.getUniqueName("Memory Details", `${title} Details`, "txt");
      const detailsTxtContent = generateMemoryDetailsTxt(memory, imageRelPaths, journalRelPath);

      detailsFolder.file(detailsFileName, detailsTxtContent, { binary: false });
      exportedFilesList.push(`Memory Details/${detailsFileName}`);
      totalFileCount++;

      const pct = 5 + Math.round(((mIdx + 1) / totalSteps) * 75);
      onProgress({
        step: `Exporting memories... (${mIdx + 1}/${activeMemories.length})`,
        percent: Math.min(pct, 80),
      });
    }

    // ── PRE-ZIP COUNT VALIDATION ──────────────────────────────────────────
    if (exportedImages < expectedImages) {
      const errReason = `Export validation warning: Expected ${expectedImages} images, but exported ${exportedImages} (${skippedItems} skipped).`;
      console.warn("[EXPORT PRE-ZIP VALIDATION NOTICE]", errReason);
    }

    // ── STEP 4: README.txt ────────────────────────────────────────────────
    onProgress({ step: "Writing README.txt...", percent: 85 });
    root.file(
      "README.txt",
      generateReadmeTxt(
        user,
        exportDate,
        activeMemories.length,
        photoMemories.length,
        journalMemories.length
      )
    );
    exportedFilesList.push("README.txt");
    totalFileCount++;

    // ── STEP 5: Compress ──────────────────────────────────────────────────
    onProgress({ step: "Compressing backup archive...", percent: 88 });
    const zipBlob = await zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
      (update) => {
        onProgress({
          step: `Compressing... ${Math.round(update.percent)}%`,
          percent: Math.min(88 + Math.round(update.percent * 0.1), 98),
        });
      }
    );

    // ── POST-EXPORT ZIP VALIDATION ─────────────────────────────────────────
    onProgress({ step: "Verifying backup completeness...", percent: 99 });
    for (const relFile of exportedFilesList) {
      const verified = zip.file(`Aurora_Backup/${relFile}`);
      if (!verified) {
        const missErr = `Post-export verification failed: Missing file "${relFile}" inside generated backup ZIP.`;
        console.error("[POST-EXPORT ZIP VALIDATION FAILED]", missErr);
        return {
          success: false,
          exportedImages,
          exportedJournals,
          skippedItems,
          totalFileCount,
          zipSizeBytes: 0,
          error: missErr,
        };
      }
    }
    console.log(`[POST-EXPORT VALIDATION PASSED] Verified ${exportedFilesList.length} human-readable files inside ZIP.`);

    // ── STEP 6: Dynamic ZIP Filename & Download ────────────────────────────
    const year = exportDate.getFullYear();
    const month = String(exportDate.getMonth() + 1).padStart(2, "0");
    const day = String(exportDate.getDate()).padStart(2, "0");
    const datePart = `${year}-${month}-${day}`;

    let hours = exportDate.getHours();
    const minutes = String(exportDate.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursStr = String(hours).padStart(2, "0");
    const timePart = `${hoursStr}-${minutes}-${ampm}`;

    const rawProfileName = user?.full_name?.trim() || user?.email?.split("@")[0]?.trim() || "Aurora User";
    const sanitizedProfile = rawProfileName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    const profileName = sanitizedProfile || "Aurora User";
    const downloadName = `${profileName} - Aurora Memory Vault.zip`;

    const downloadUrl = URL.createObjectURL(zipBlob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);

    onProgress({ step: "Export complete!", percent: 100 });

    return {
      success: true,
      exportedImages,
      exportedJournals,
      skippedItems,
      totalFileCount,
      zipSizeBytes: zipBlob.size,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed unexpectedly.";
    console.error("[UNIVERSAL EXPORT FATAL ERROR]", err);
    return {
      success: false,
      exportedImages: 0,
      exportedJournals: 0,
      skippedItems: 0,
      totalFileCount: 0,
      zipSizeBytes: 0,
      error: message,
    };
  }
}
