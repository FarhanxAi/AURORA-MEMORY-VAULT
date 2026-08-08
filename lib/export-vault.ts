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
    return { blob, ext, sizeBytes: blob.size };
  } catch (err) {
    console.warn(`[EXPORT] Image fetch notice: ${url.slice(0, 80)}`, err);
    return null;
  }
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" });
  } catch {
    return String(dateStr);
  }
}

function formatDisplayTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, "0");
    return `${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL TXT GENERATOR
// Information at TOP -> Complete journal text BELOW it
// ─────────────────────────────────────────────────────────────────────────────

function generateJournalTxt(memory: Memory): string {
  const dateFormatted = formatDisplayDate(memory.memory_date || memory.created_at);
  const timeFormatted = formatDisplayTime(memory.created_at || memory.memory_date);

  const lines: string[] = [];
  lines.push(`Title: ${memory.title || "Untitled Journal"}`);
  lines.push("");
  if (dateFormatted) lines.push(`Date: ${dateFormatted}`);
  if (timeFormatted) lines.push(`Time: ${timeFormatted}`);
  if (memory.location && memory.location.trim()) lines.push(`Location: ${memory.location.trim()}`);
  if (memory.category && memory.category.trim()) lines.push(`Category: ${memory.category.trim()}`);
  if (memory.mood && memory.mood.trim()) lines.push(`Mood: ${memory.mood.trim()}`);
  if (Array.isArray(memory.tags) && memory.tags.length > 0) {
    lines.push(`Tags: ${memory.tags.join(", ")}`);
  }

  lines.push("");
  lines.push("------------------------------------------------");
  lines.push("");

  if (memory.description && memory.description.trim()) {
    lines.push(memory.description.trim());
  } else {
    lines.push("(No journal text entered)");
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANION VIEW GENERATOR (Vault_Viewer.html)
// Image at TOP -> Information directly BELOW it
// Journal info at TOP -> Complete journal text BELOW it
// 100% Offline, Zero external CDN dependencies, Responsive
// ─────────────────────────────────────────────────────────────────────────────

interface ExportedMemoryItem {
  memory: Memory;
  imagePaths: string[];
  journalTxtPath: string | null;
}

function generateVaultViewerHtml(
  user: UserProfile | null,
  exportDate: Date,
  items: ExportedMemoryItem[]
): string {
  const exportDateStr = exportDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const exportTimeStr = formatDisplayTime(exportDate.toISOString());
  const userName = user?.full_name || user?.email || "Vault Owner";

  const photoCardsHtml = items
    .filter((item) => item.imagePaths.length > 0)
    .map((item) => {
      const mem = item.memory;
      const title = mem.title || "Untitled Memory";
      const dateVal = formatDisplayDate(mem.memory_date || mem.created_at);
      const timeVal = formatDisplayTime(mem.created_at || mem.memory_date);

      // Render each attached image with its memory information directly below it
      return item.imagePaths
        .map((relImgPath, idx) => {
          const displayTitle = item.imagePaths.length > 1 ? `${title} (${idx + 1})` : title;
          
          let infoRows = "";
          infoRows += `<div class="info-row"><span class="info-label">Title:</span> <span class="info-val">${displayTitle}</span></div>`;
          if (dateVal) infoRows += `<div class="info-row"><span class="info-label">Date:</span> <span class="info-val">${dateVal}</span></div>`;
          if (timeVal) infoRows += `<div class="info-row"><span class="info-label">Time:</span> <span class="info-val">${timeVal}</span></div>`;
          if (mem.location && mem.location.trim()) infoRows += `<div class="info-row"><span class="info-label">Location:</span> <span class="info-val">${mem.location.trim()}</span></div>`;
          if (mem.category && mem.category.trim()) infoRows += `<div class="info-row"><span class="info-label">Category:</span> <span class="info-val">${mem.category.trim()}</span></div>`;
          if (mem.mood && mem.mood.trim()) infoRows += `<div class="info-row"><span class="info-label">Mood:</span> <span class="info-val">${mem.mood.trim()}</span></div>`;
          if (Array.isArray(mem.tags) && mem.tags.length > 0) {
            infoRows += `<div class="info-row"><span class="info-label">Tags:</span> <span class="info-val">${mem.tags.map((t) => `#${t}`).join(" ")}</span></div>`;
          }

          const descBlock = mem.description && mem.description.trim()
            ? `<div class="memory-desc"><div class="desc-heading">Notes / Description</div><p>${mem.description.trim()}</p></div>`
            : "";

          return `
      <article class="memory-card">
        <!-- 1. FULL IMAGE AT THE TOP -->
        <div class="image-wrapper">
          <img src="${relImgPath}" alt="${displayTitle}" loading="lazy" />
        </div>
        <!-- 2. MEMORY INFORMATION DIRECTLY BELOW THE IMAGE -->
        <div class="memory-body">
          <div class="info-grid">
            ${infoRows}
          </div>
          ${descBlock}
        </div>
      </article>`;
        })
        .join("\n");
    })
    .join("\n");

  const journalCardsHtml = items
    .filter((item) => item.journalTxtPath)
    .map((item) => {
      const mem = item.memory;
      const title = mem.title || "Untitled Journal";
      const dateVal = formatDisplayDate(mem.memory_date || mem.created_at);
      const timeVal = formatDisplayTime(mem.created_at || mem.memory_date);

      let infoRows = "";
      infoRows += `<div class="info-row"><span class="info-label">Title:</span> <span class="info-val">${title}</span></div>`;
      if (dateVal) infoRows += `<div class="info-row"><span class="info-label">Date:</span> <span class="info-val">${dateVal}</span></div>`;
      if (timeVal) infoRows += `<div class="info-row"><span class="info-label">Time:</span> <span class="info-val">${timeVal}</span></div>`;
      if (mem.location && mem.location.trim()) infoRows += `<div class="info-row"><span class="info-label">Location:</span> <span class="info-val">${mem.location.trim()}</span></div>`;
      if (mem.category && mem.category.trim()) infoRows += `<div class="info-row"><span class="info-label">Category:</span> <span class="info-val">${mem.category.trim()}</span></div>`;
      if (mem.mood && mem.mood.trim()) infoRows += `<div class="info-row"><span class="info-label">Mood:</span> <span class="info-val">${mem.mood.trim()}</span></div>`;
      if (Array.isArray(mem.tags) && mem.tags.length > 0) {
        infoRows += `<div class="info-row"><span class="info-label">Tags:</span> <span class="info-val">${mem.tags.map((t) => `#${t}`).join(" ")}</span></div>`;
      }

      const journalText = mem.description && mem.description.trim() ? mem.description.trim() : "(No journal text entered)";

      return `
      <article class="journal-card">
        <!-- 1. JOURNAL INFORMATION AT THE TOP -->
        <div class="journal-header">
          <h3 class="journal-title">${title}</h3>
          <div class="info-grid">
            ${infoRows}
          </div>
        </div>
        <hr class="journal-divider" />
        <!-- 2. COMPLETE JOURNAL TEXT DIRECTLY BELOW IT -->
        <div class="journal-body">
          <pre class="journal-text">${journalText}</pre>
        </div>
      </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${userName} — Aurora Memory Vault Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #050814;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      padding: 24px 16px 64px;
    }
    .container {
      max-width: 1040px;
      margin: 0 auto;
    }
    header {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 32px 24px;
      margin-bottom: 36px;
      text-align: center;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 16px;
    }
    .badge-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      font-size: 12px;
      font-weight: 600;
      color: #7dd3fc;
    }
    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #f8fafc;
      margin: 40px 0 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid rgba(56, 189, 248, 0.4);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-count {
      font-size: 13px;
      color: #38bdf8;
      font-weight: 600;
    }
    .memory-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 32px;
    }
    @media (min-width: 768px) {
      .memory-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .memory-card {
      background: #0b1120;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-col: column;
      flex-direction: column;
    }
    /* 1. The image appears FIRST at the TOP */
    .image-wrapper {
      width: 100%;
      background: #030712;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .image-wrapper img {
      width: 100%;
      max-height: 480px;
      object-fit: contain;
      display: block;
    }
    /* 2. The information appears DIRECTLY BELOW IT */
    .memory-body {
      padding: 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .info-row {
      font-size: 13px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .info-label {
      font-weight: 700;
      color: #38bdf8;
      min-width: 70px;
      flex-shrink: 0;
    }
    .info-val {
      color: #f1f5f9;
      word-break: break-word;
    }
    .memory-desc {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      padding: 12px;
      margin-top: 4px;
    }
    .desc-heading {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .memory-desc p {
      font-size: 13px;
      color: #cbd5e1;
      white-space: pre-wrap;
    }
    .journal-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .journal-card {
      background: #0b1120;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .journal-header {
      margin-bottom: 16px;
    }
    .journal-title {
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    .journal-divider {
      border: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 16px 0;
    }
    .journal-body {
      padding-top: 4px;
    }
    .journal-text {
      font-family: inherit;
      font-size: 14px;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.7;
    }
    footer {
      margin-top: 56px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${userName}'s Memory Vault</h1>
      <div class="subtitle">Self-contained offline backup archive exported on ${exportDateStr} at ${exportTimeStr}</div>
      <div class="badge-bar">
        <span class="badge">100% Offline</span>
        <span class="badge">No Login Required</span>
        <span class="badge">Universal Device Compatibility</span>
      </div>
    </header>

    ${
      photoCardsHtml.trim()
        ? `
    <section>
      <div class="section-title">
        <span>Photo Memories</span>
        <span class="section-count">Image Top &bull; Info Below</span>
      </div>
      <div class="memory-grid">
        ${photoCardsHtml}
      </div>
    </section>`
        : ""
    }

    ${
      journalCardsHtml.trim()
        ? `
    <section>
      <div class="section-title">
        <span>Journals &amp; Written Logs</span>
        <span class="section-count">Info Top &bull; Complete Text Below</span>
      </div>
      <div class="journal-list">
        ${journalCardsHtml}
      </div>
    </section>`
        : ""
    }

    <footer>
      Exported from Aurora Memory Vault &bull; All images and journals stored in native original files.
    </footer>
  </div>
</body>
</html>`;
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
    "     FOLDER STRUCTURE & FILES",
    "====================================================",
    "",
    "  Aurora_Backup/",
    "  │",
    "  ├── README.txt          — This offline guide",
    "  ├── Vault_Viewer.html   — Standalone companion viewer (Image on TOP, Info BELOW)",
    "  │",
    "  ├── Images/             — Original clean photos named using Memory Titles",
    "  │                         (e.g., Birthday Party.jpg, Sunset at Beach.jpg)",
    "  │",
    "  └── Journals/           — Plain text (.txt) files (Info at TOP, Complete Text BELOW)",
    "                            (e.g., My Birthday Journal.txt)",
    "",
    "====================================================",
    "     HOW TO USE YOUR BACKUP",
    "====================================================",
    "",
    "  1. VIEWING WITH COMPANION VIEWER (Vault_Viewer.html)",
    "     Double-click 'Vault_Viewer.html' to open all memories beautifully in any browser.",
    "     • Works 100% offline (no internet, no login, no server).",
    "     • Shows full photo on top with memory details directly below it.",
    "",
    "  2. VIEWING ORIGINAL IMAGES (Images/ folder)",
    "     Open the Images/ folder to browse your original clean photos in Gallery/Photos.",
    "     Original images are completely untouched.",
    "",
    "  3. READING JOURNALS (Journals/ folder)",
    "     Open the Journals/ folder to read your complete journal entries in any text viewer.",
    "",
    "====================================================",
    "     UNIVERSAL COMPATIBILITY",
    "====================================================",
    "",
    "  This backup archive is 100% self-contained.",
    "  • No internet required.",
    "  • No developer software required.",
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

    const tracker = new UniqueFilenameTracker();
    let exportedImages = 0;
    let exportedJournals = 0;
    let skippedItems = 0;
    let totalFileCount = 0;
    const exportedFilesList: string[] = [];
    const exportedMemoryItems: ExportedMemoryItem[] = [];

    const totalSteps = activeMemories.length;

    // ── STEP 1: Export Memories (Images & Journals) ──────────────────────────
    for (let mIdx = 0; mIdx < activeMemories.length; mIdx++) {
      const memory = activeMemories[mIdx];
      const title = memory.title || "Untitled Memory";
      const imageRelPaths: string[] = [];
      let journalRelPath: string | null = null;

      // 1. Process All Selected Images for this memory
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
            console.warn(`[UNIVERSAL EXPORT] Notice: Image could not be fetched for "${title}"`);
            skippedItems++;
          }
        }
      }

      // 2. Process Journal Entry (Plain text file in Journals/)
      if (memory.memory_type === "journal" || (memory.description && memory.description.trim())) {
        const txtFileName = tracker.getUniqueName("Journals", title, "txt");
        const journalTxtContent = generateJournalTxt(memory);

        journalsFolder.file(txtFileName, journalTxtContent, { binary: false });
        journalRelPath = `Journals/${txtFileName}`;
        exportedFilesList.push(`Journals/${txtFileName}`);
        exportedJournals++;
        totalFileCount++;
      }

      exportedMemoryItems.push({
        memory,
        imagePaths: imageRelPaths,
        journalTxtPath: journalRelPath,
      });

      const pct = 5 + Math.round(((mIdx + 1) / totalSteps) * 75);
      onProgress({
        step: `Exporting memories... (${mIdx + 1}/${activeMemories.length})`,
        percent: Math.min(pct, 80),
      });
    }

    // ── STEP 2: Generate Standalone Companion Viewer (Vault_Viewer.html) ─────
    onProgress({ step: "Creating companion viewer...", percent: 82 });
    const vaultViewerHtml = generateVaultViewerHtml(user, exportDate, exportedMemoryItems);
    root.file("Vault_Viewer.html", vaultViewerHtml, { binary: false });
    exportedFilesList.push("Vault_Viewer.html");
    totalFileCount++;

    // ── STEP 3: Generate README.txt ──────────────────────────────────────────
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

    // ── STEP 4: Compress ────────────────────────────────────────────────────
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

    // ── STEP 5: Post-Export Validation ───────────────────────────────────────
    onProgress({ step: "Verifying backup completeness...", percent: 99 });
    for (const relFile of exportedFilesList) {
      const verified = zip.file(`Aurora_Backup/${relFile}`);
      if (!verified) {
        const missErr = `Verification failed: Missing "${relFile}" in ZIP.`;
        console.error("[EXPORT VALIDATION FAILED]", missErr);
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

    // ── STEP 6: Dynamic ZIP Filename & Trigger Download ──────────────────────
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
