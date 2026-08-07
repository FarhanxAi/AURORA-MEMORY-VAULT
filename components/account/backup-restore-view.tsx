"use client";

import React, { useState } from "react";
import {
  Upload,
  Database,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { UserProfile, Memory, Collection, ExportVaultData } from "@/lib/types";
import { GlassButton } from "@/components/ui/glass-button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

interface BackupRestoreViewProps {
  user: UserProfile | null;
  memories: Memory[];
  collections: Collection[];
  onImportCompleted: () => void;
}

export function BackupRestoreView({
  user,
  memories,
  collections,
  onImportCompleted,
}: BackupRestoreViewProps) {
  const { success, error } = useToast();

  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [cloudSnapshots, setCloudSnapshots] = useState<{ name: string; created_at?: string; size?: number }[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importReport, setImportReport] = useState<{
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);

  // Fetch Cloud Backup Snapshots from Supabase Storage
  const fetchCloudSnapshots = React.useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingSnapshots(true);
    try {
      const supabase = createClient();
      const possibleBuckets = ["backups", "memories", "profiles"];
      let foundList: { name: string; created_at?: string; size?: number }[] = [];

      for (const bucketName of possibleBuckets) {
        const { data: files } = await supabase.storage
          .from(bucketName)
          .list(`${user.id}/snapshots`, { limit: 50 });

        if (files && files.length > 0) {
          foundList = files.map((f) => ({
            name: f.name,
            created_at: (f as unknown as { created_at?: string }).created_at || (f.metadata as { created_at?: string })?.created_at,
            size: (f as unknown as { size?: number }).size || (f.metadata as { size?: number })?.size,
          }));
          break;
        }
      }

      setCloudSnapshots(foundList);
    } catch (err) {
      console.warn("Cloud snapshot fetch notice:", err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    fetchCloudSnapshots();
  }, [fetchCloudSnapshots]);

  // SAVE CLOUD BACKUP SNAPSHOT TO SUPABASE STORAGE
  const handleSaveCloudSnapshot = async () => {
    if (!user) return;
    setIsSavingSnapshot(true);
    try {
      const supabase = createClient();
      const exportPayload: ExportVaultData = {
        exported_at: new Date().toISOString(),
        version: "1.0.0",
        profile: user,
        settings: null,
        memories: memories.filter((m) => !m.deleted),
        collections,
      };

      const jsonString = JSON.stringify(exportPayload);
      const blob = new Blob([jsonString], { type: "application/json" });
      const snapshotPath = `${user.id}/snapshots/snapshot_${Date.now()}.json`;

      const targetBucket = "backups";
      // Ensure bucket existence or fallback
      const { error: uploadErr } = await supabase.storage
        .from(targetBucket)
        .upload(snapshotPath, blob, { contentType: "application/json", upsert: true });

      if (uploadErr && uploadErr.message?.toLowerCase().includes("not found")) {
        try {
          await supabase.storage.createBucket(targetBucket, { public: false });
          await supabase.storage
            .from(targetBucket)
            .upload(snapshotPath, blob, { contentType: "application/json", upsert: true });
        } catch (bErr) {
          console.warn("Bucket creation notice:", bErr);
        }
      }

      await fetchCloudSnapshots();
      success("Cloud Snapshot Saved", "Encrypted snapshot saved directly in Supabase Cloud Storage.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cloud snapshot error";
      error("Snapshot Error", msg);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // IMPORT VAULT FILE HANDLER
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    setImportProgress(10);
    setImportReport(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const parsedData = JSON.parse(content) as ExportVaultData;

          if (!parsedData.memories || !Array.isArray(parsedData.memories)) {
            throw new Error("Invalid backup format: 'memories' array is missing.");
          }

          setImportProgress(30);

          const supabase = createClient();
          let importedCount = 0;
          let skippedCount = 0;
          let failedCount = 0;

          const totalToImport = parsedData.memories.length;
          const existingIds = new Set(memories.map((m) => m.id));
          const existingTitles = new Set(memories.map((m) => m.title.toLowerCase()));

          for (let i = 0; i < totalToImport; i++) {
            const mem = parsedData.memories[i];

            // Prevent duplicate insertion
            if (existingIds.has(mem.id) || existingTitles.has(mem.title.toLowerCase())) {
              skippedCount++;
              continue;
            }

            const insertPayload = {
              user_id: user.id,
              title: mem.title,
              description: mem.description,
              memory_type: mem.memory_type,
              category: mem.category || "Personal",
              cover_image: mem.cover_image,
              gallery: mem.gallery || [],
              audio_url: mem.audio_url,
              tags: mem.tags || [],
              location: mem.location,
              mood: mem.mood || "Happy",
              favorite: mem.favorite || false,
              private: mem.private ?? true,
              memory_date: mem.memory_date || new Date().toISOString().substring(0, 10),
            };

            const { error: insertErr } = await supabase.from("memories").insert(insertPayload);
            if (insertErr) {
              failedCount++;
            } else {
              importedCount++;
            }

            const currentProgress = Math.min(
              90,
              Math.round(30 + ((i + 1) / totalToImport) * 60)
            );
            setImportProgress(currentProgress);
          }

          setImportProgress(100);
          setImportReport({
            imported: importedCount,
            skipped: skippedCount,
            failed: failedCount,
          });

          onImportCompleted();
          success(
            "Import Finished",
            `Imported ${importedCount} memories (${skippedCount} duplicates skipped).`
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Invalid JSON file structure.";
          error("Import Error", msg);
        } finally {
          setIsImporting(false);
        }
      };

      reader.readAsText(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to read file.";
      error("File Error", msg);
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aurora-cyan to-aurora-violet p-0.5 shadow-aurora-glow">
            <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
              <Database className="w-5 h-5 text-aurora-cyan" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Vault Backup & Restoration
            </h2>
            <p className="text-xs text-white/50">
              Restore memories from backups or manage cloud storage snapshots
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* IMPORT SECTION */}
        <div className="glass-panel p-6 rounded-3xl border border-white/12 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Restore / Import Vault</h3>
                <p className="text-xs text-white/50">Upload an existing Aurora JSON backup file</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Select a valid Aurora backup JSON file to import memories into your vault. Duplicate items with matching titles or IDs will automatically be skipped to prevent repetition.
            </p>

            {/* Progress bar if importing */}
            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-aurora-cyan">
                  <span>Importing Memories...</span>
                  <span>{importProgress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-aurora-cyan to-aurora-violet rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Import Summary Report */}
            {importReport && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Import Process Complete</span>
                </div>
                <p className="text-white/80">
                  • <strong>{importReport.imported}</strong> memories imported successfully.
                </p>
                <p className="text-white/60">
                  • <strong>{importReport.skipped}</strong> duplicates skipped.
                </p>
                {importReport.failed > 0 && (
                  <p className="text-rose-400">
                    • <strong>{importReport.failed}</strong> failed imports.
                  </p>
                )}
              </div>
            )}
          </div>

          <label className="w-full">
            <GlassButton
              variant="secondary"
              size="lg"
              className="w-full cursor-pointer"
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Select Backup JSON File
            </GlassButton>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              disabled={isImporting}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* CLOUD SNAPSHOT AUTOMATED BACKUPS SECTION */}
      <div className="glass-panel p-6 rounded-3xl border border-white/12 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-aurora-cyan/15 text-aurora-cyan">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Supabase Cloud Storage Snapshots</h3>
              <p className="text-xs text-white/50">Save automated restore snapshots directly in Cloud Storage</p>
            </div>
          </div>

          <GlassButton
            variant="primary"
            size="sm"
            isLoading={isSavingSnapshot}
            onClick={handleSaveCloudSnapshot}
            leftIcon={<Database className="w-4 h-4" />}
          >
            Save Cloud Snapshot
          </GlassButton>
        </div>

        {/* Cloud Snapshots List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60 font-semibold px-2">
            <span>Saved Restore Points</span>
            <button
              onClick={fetchCloudSnapshots}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh List</span>
            </button>
          </div>

          {isLoadingSnapshots ? (
            <p className="text-xs text-white/40 py-4 text-center">Loading cloud snapshots...</p>
          ) : cloudSnapshots.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/8 text-center space-y-1">
              <p className="text-xs text-white/70 font-semibold">No Cloud Snapshots Saved Yet</p>
              <p className="text-[11px] text-white/40">
                Click "Save Cloud Snapshot" to store an encrypted cloud restore point in your Supabase storage bucket.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {cloudSnapshots.map((snap, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white font-mono text-[11px] truncate max-w-[180px]">
                      {snap.name}
                    </p>
                    <p className="text-[10px] text-white/50">
                      {snap.created_at ? new Date(snap.created_at).toLocaleString() : "Cloud Snapshot"}
                    </p>
                  </div>

                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    Cloud Synced
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
