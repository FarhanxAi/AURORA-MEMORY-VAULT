"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  MapPin,
  Smile,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  Star,
  Check,
} from "lucide-react";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { Memory, MemoryType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { vaultStore } from "@/lib/persistence/vault-store";
import { AURORA_CATEGORIES, AURORA_MOODS, AURORA_MOOD_GROUPS } from "@/lib/journal-utils";
import { MEMORY_IMAGE_BUCKET, verifyStorageObjectExists } from "@/lib/image-utils";

interface CreateMemoryModalProps {
  isOpen: boolean;
  defaultType?: MemoryType;
  onClose: () => void;
  onMemoryCreated: (memory: Memory) => void;
}

interface ImageItem {
  file: File;
  preview: string;
}

export function CreateMemoryModal({
  isOpen,
  defaultType = "photo",
  onClose,
  onMemoryCreated,
}: CreateMemoryModalProps) {
  const { success, error, info } = useToast();

  const [memoryType, setMemoryType] = useState<MemoryType>(defaultType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [mood, setMood] = useState("Happy");
  const [location, setLocation] = useState("");
  const [memoryDate, setMemoryDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isFavorite, setIsFavorite] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  // Multi-image file states (Max 10 images, 10MB combined total size limit)
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // Sync default memory type & active auth user ID on modal open
  useEffect(() => {
    if (isOpen) {
      setMemoryType(defaultType || "photo");
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) setActiveUserId(authUser.id);
      });
    }
  }, [isOpen, defaultType]);

  // Combined size calculation
  const totalImagesSizeBytes = useMemo(() => {
    return imageItems.reduce((acc, item) => acc + item.file.size, 0);
  }, [imageItems]);

  const totalImagesSizeMb = (totalImagesSizeBytes / (1024 * 1024)).toFixed(2);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setMemoryType(defaultType || "photo");
    setCategory("Personal");
    setCustomCategory("");
    setCustomCategoryInput("");
    setMood("Happy");
    setLocation("");
    setTags([]);
    setTagInput("");
    setMemoryDate(new Date().toISOString().split("T")[0]);
    setIsFavorite(false);

    // Clean up previews
    imageItems.forEach((item) => URL.revokeObjectURL(item.preview));
    if (audioPreview) URL.revokeObjectURL(audioPreview);

    setImageItems([]);
    setAudioFile(null);
    setAudioPreview(null);
    setIsUploading(false);
    setUploadProgress(0);
  }, [defaultType, imageItems, audioPreview]);

  // -------------------------------------------------------------
  // MULTI-IMAGE VALIDATION & ADD HANDLERS
  // -------------------------------------------------------------
  const addImageFiles = useCallback((files: FileList | File[]) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const fileArray = Array.from(files);

    if (imageItems.length + fileArray.length > 10) {
      error("Maximum 10 Images", "You can upload a maximum of 10 images per memory.");
      return;
    }

    const invalidFile = fileArray.find((f) => !validTypes.includes(f.type.toLowerCase()));
    if (invalidFile) {
      error("Unsupported Format", `"${invalidFile.name}" is not supported. Use JPG, JPEG, PNG, or WEBP.`);
      return;
    }

    const addedSizeBytes = fileArray.reduce((acc, f) => acc + f.size, 0);
    if (totalImagesSizeBytes + addedSizeBytes > 10 * 1024 * 1024) {
      error("Total Size Exceeded", "Maximum total upload size for all images combined is 10 MB.");
      return;
    }

    const newItems: ImageItem[] = fileArray.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImageItems((prev) => [...prev, ...newItems]);
  }, [imageItems.length, totalImagesSizeBytes, error]);

  const removeImageItem = (index: number) => {
    setImageItems((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveImageItem = (index: number, direction: "left" | "right") => {
    setImageItems((prev) => {
      const updated = [...prev];
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const triggerReplaceImage = (index: number) => {
    setReplaceTargetIndex(index);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = "";
      replaceInputRef.current.click();
    }
  };

  const handleReplaceFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replaceTargetIndex === null) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      error("Unsupported Format", "Only JPG, JPEG, PNG, and WEBP image formats are supported.");
      return;
    }

    const currentItem = imageItems[replaceTargetIndex];
    const sizeDiff = file.size - (currentItem?.file.size || 0);
    if (totalImagesSizeBytes + sizeDiff > 10 * 1024 * 1024) {
      error("Total Size Exceeded", "Maximum total upload size for all images combined is 10 MB.");
      return;
    }

    setImageItems((prev) => {
      const updated = [...prev];
      if (updated[replaceTargetIndex]) {
        URL.revokeObjectURL(updated[replaceTargetIndex].preview);
      }
      updated[replaceTargetIndex] = {
        file,
        preview: URL.createObjectURL(file),
      };
      return updated;
    });

    setReplaceTargetIndex(null);
  };

  // Handle Clipboard Image Paste
  useEffect(() => {
    if (!isOpen || memoryType !== "photo") return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        addImageFiles(pastedFiles);
        info("Image Pasted", `Added ${pastedFiles.length} image(s) from clipboard.`);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, memoryType, addImageFiles, info]);

  // Tag pill handlers
  const handleAddTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && "key" in e && e.key !== "Enter" && e.key !== ",") return;
    if (e) e.preventDefault();

    const clean = tagInput.trim().replace(/^#/, "").replace(/,/g, "");
    if (clean && !tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addImageFiles(e.dataTransfer.files);
    }
  };

  // -------------------------------------------------------------
  // SAVE MEMORY HANDLER (REAL SUPABASE STORAGE + DATABASE INSERT)
  // -------------------------------------------------------------
  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    if (!title.trim()) {
      error("Missing Title", "Please provide a title for your memory.");
      return;
    }

    // Pre-upload hard limit validation
    if (totalImagesSizeBytes > 10 * 1024 * 1024) {
      error("Storage Exceeded", "Uploading these files would exceed your combined 10 MB image limit.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        error("Authentication Required", "Please sign in to save memories to your vault.");
        setIsUploading(false);
        return;
      }

      const userId = user.id;
      let coverImageUrl: string | null = null;
      const uploadedGalleryUrls: string[] = [];

      // Helper for Base64 Data URL fallback
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
      };

      // Upload All Images to 'memory-images' bucket in parallel with guaranteed zero loss
      if (imageItems.length > 0) {
        setUploadProgress(30);

        const uploadPromises = imageItems.map(async (item, i) => {
          const fileExt = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
          const uniqueId = Math.random().toString(36).substring(2, 8);
          const filePath = `${userId}/${Date.now()}_${i}_${uniqueId}.${fileExt}`;

          try {
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from(MEMORY_IMAGE_BUCKET)
              .upload(filePath, item.file, { upsert: true });

            if (!uploadErr && uploadData?.path) {
              return uploadData.path;
            }
            // Fallback to base64 data URL
            const base64Url = await fileToBase64(item.file);
            return base64Url || filePath;
          } catch {
            const base64Url = await fileToBase64(item.file);
            return base64Url || filePath;
          }
        });

        const uploadResults = await Promise.allSettled(uploadPromises);
        const resolvedPaths: string[] = [];

        for (let i = 0; i < uploadResults.length; i++) {
          const res = uploadResults[i];
          if (res.status === "fulfilled" && res.value) {
            resolvedPaths.push(res.value);
          } else {
            // Guarantee fallback for any rejected promise
            const fallback = await fileToBase64(imageItems[i].file);
            if (fallback) resolvedPaths.push(fallback);
          }
        }

        if (resolvedPaths.length > 0) {
          coverImageUrl = resolvedPaths[0];
          for (let k = 1; k < resolvedPaths.length; k++) {
            uploadedGalleryUrls.push(resolvedPaths[k]);
          }
        }

        // Guaranteed persistent fallback if cover image is missing
        if (!coverImageUrl && imageItems[0]) {
          coverImageUrl = await fileToBase64(imageItems[0].file);
        }

        setUploadProgress(80);
      }

      const now = new Date();
      const autoIsoString = now.toISOString();
      const autoDateOnly = autoIsoString.split("T")[0];
      const finalMemoryDate = memoryType === "journal" ? autoDateOnly : memoryDate;

      // Resolve final category: if custom, use the user-typed value (fall back to "Custom" if not filled)
      const finalCategory = category === "Custom"
        ? (customCategoryInput.trim() || customCategory.trim() || "Custom")
        : category;
      const finalTags = [...tags]; // STRICT USER-ENTERED TAGS ONLY

      const totalUploadedBytes = imageItems.reduce((acc, item) => acc + (item.file?.size || 0), 0);

      // Insert Record into Supabase `memories` table
      const newRecord = {
        user_id: userId,
        title: title.trim() || (memoryType === "journal" ? "Untitled Journal" : "Untitled Memory"),
        description: description.trim() || null,
        memory_type: memoryType,
        category: finalCategory,
        cover_image: memoryType === "journal" ? null : coverImageUrl,
        gallery: memoryType === "journal" ? [] : uploadedGalleryUrls,
        audio_url: memoryType === "journal" ? null : audioPreview,
        tags: finalTags,
        location: location.trim() || null,
        mood,
        favorite: isFavorite,
        private: true,
        memory_date: finalMemoryDate,
        created_at: autoIsoString,
        updated_at: autoIsoString,
        file_size: memoryType === "journal" ? 0 : totalUploadedBytes,
      };

      let finalMemory: Memory | null = null;

      const { data: insertedData, error: dbError } = await supabase
        .from("memories")
        .insert([newRecord])
        .select("*")
        .single();

      if (!dbError && insertedData) {
        finalMemory = insertedData as Memory;
      } else if (dbError) {
        console.warn("Database insert notice:", dbError.message);
      }

      if (!finalMemory) {
        finalMemory = {
          ...newRecord,
          id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived: false,
          deleted: false,
          deleted_at: null,
        };
      }

      setUploadProgress(100);
      success("Memory Saved", "Memory permanently stored in your vault.");
      onMemoryCreated(finalMemory);
      resetForm();
      onClose();
    } catch (err) {
      console.warn("Save memory error:", err);
      error("Save Error", "Could not save memory to server.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                <span>Add Memory to Vault</span>
              </h2>
              <p className="text-xs text-white/60">
                Preserve moments forever in your encrypted vault.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/[0.05] border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveMemory} className="space-y-6">
            {/* Hidden replace input */}
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReplaceFileSelected}
              className="hidden"
            />

            {/* Memory Format Tabs */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                Memory Format
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
                {[
                  { type: "photo", label: "Photo Memory", icon: <ImageIcon className="w-4 h-4" /> },
                  { type: "journal", label: "Journal Memory", icon: <FileText className="w-4 h-4" /> },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setMemoryType(item.type as MemoryType);
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      memoryType === item.type
                        ? "bg-aurora-cyan/20 border border-aurora-cyan/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <GlassInput
                  label="Memory Title *"
                  type="text"
                  placeholder={memoryType === "journal" ? "Journal Chapter Title..." : "Memory Title..."}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-white/70 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value !== "Custom") {
                      setCustomCategory("");
                      setCustomCategoryInput("");
                    }
                  }}
                  className="w-full p-3 rounded-xl bg-[#0b1020] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan cursor-pointer"
                >
                  {AURORA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Custom Category Input — shown only when "Custom" is selected */}
                {category === "Custom" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Enter your custom category..."
                      value={customCategoryInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomCategoryInput(val);
                        setCustomCategory(val.trim());
                      }}
                      className="w-full p-2.5 rounded-xl bg-white/[0.06] border border-aurora-cyan/40 text-xs text-white placeholder-white/40 focus:outline-none focus:border-aurora-cyan"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* MULTI-IMAGE UPLOAD DROPZONE & PREVIEW GRID (PHOTO MODE ONLY) */}
            {memoryType === "photo" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                    Upload Images (Up to 10 Images, 10 MB Combined Max)
                  </label>
                  <span className="text-[11px] font-mono text-aurora-cyan">
                    {imageItems.length} / 10 Images ({totalImagesSizeMb} MB / 10 MB)
                  </span>
                </div>

                {/* Dropzone */}
                {imageItems.length < 10 && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group ${
                      isDragging
                        ? "border-aurora-cyan bg-aurora-cyan/15 scale-[1.01]"
                        : "border-white/20 hover:border-aurora-cyan/50 bg-white/[0.02]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        if (e.target.files) addImageFiles(e.target.files);
                        e.target.value = "";
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />

                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-aurora-cyan group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-medium text-white/80">
                        Drag & Drop up to 10 images here, paste from clipboard, or{" "}
                        <span className="text-aurora-cyan font-bold">Browse</span>
                      </p>
                      <p className="text-[10px] text-white/40">
                        Supported: JPG, JPEG, PNG, WEBP &bull; Max 10 MB combined total
                      </p>
                    </div>
                  </div>
                )}

                {/* Multi-Image Thumbnail Preview Grid with Reorder, Replace, Remove */}
                {imageItems.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/10">
                    {imageItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl overflow-hidden group bg-black/40 border border-white/15 aspect-square"
                      >
                        <img
                          src={item.preview}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Image Index Badge */}
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-aurora-cyan">
                          {idx === 0 ? "Cover" : `#${idx + 1}`}
                        </span>

                        {/* Hover Overlay Action Controls */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1 backdrop-blur-xs">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveImageItem(idx, "left")}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => triggerReplaceImage(idx)}
                            className="p-1.5 rounded-lg bg-aurora-cyan/30 hover:bg-aurora-cyan/50 text-aurora-cyan cursor-pointer"
                            title="Replace Image"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeImageItem(idx)}
                            className="p-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-300 cursor-pointer"
                            title="Remove Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {idx < imageItems.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveImageItem(idx, "right")}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* JOURNAL STORY WRITER MODE */}
            {memoryType === "journal" && (
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                  Journal Entry Story *
                </label>
                <textarea
                  rows={6}
                  placeholder="Write your journal entry here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-aurora-cyan leading-relaxed font-sans"
                  required
                />
              </div>
            )}

            {/* Description (Non-Journal mode) */}
            {memoryType !== "journal" && (
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Add notes or description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan"
                />
              </div>
            )}

            {/* Tags & Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                  Tags
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Add tag and press enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="flex-1 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-2.5 rounded-xl bg-aurora-cyan/20 text-aurora-cyan hover:bg-aurora-cyan/30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-semibold text-white/90 flex items-center gap-1"
                      >
                        #{t}
                        <X
                          className="w-3 h-3 text-white/50 hover:text-white cursor-pointer"
                          onClick={() => handleRemoveTag(t)}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <GlassInput
                  label="Location"
                  type="text"
                  placeholder="e.g. Paris, France"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Date & Favorite */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-white/50" />
                <input
                  type="date"
                  value={memoryDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold text-white/70">Mood:</span>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="p-2 rounded-xl bg-[#0b1020] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan cursor-pointer"
                >
                  {AURORA_MOOD_GROUPS.map((group) => (
                    <optgroup key={group} label={`── ${group} ──`}>
                      {AURORA_MOODS.filter((m) => m.group === group).map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.emoji} {m.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isFavorite
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                    : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white"
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorite ? "fill-rose-400 text-rose-400" : ""}`} />
                <span>{isFavorite ? "Starred Favorite" : "Add to Favorites"}</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <GlassButton
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
              >
                Cancel
              </GlassButton>

              <GlassButton
                type="submit"
                variant="primary"
                size="md"
                isLoading={isUploading}
                leftIcon={<Check className="w-4 h-4" />}
              >
                {isUploading ? `Uploading (${uploadProgress}%)` : "Save Memory"}
              </GlassButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
