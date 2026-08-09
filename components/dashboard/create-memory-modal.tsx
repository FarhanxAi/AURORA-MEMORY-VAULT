"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Upload,
  Image as ImageIcon,
  Images,
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
  AlertTriangle,
} from "lucide-react";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { Memory, MemoryType } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { vaultStore } from "@/lib/persistence/vault-store";
import { AURORA_CATEGORIES, AURORA_MOODS, AURORA_MOOD_GROUPS } from "@/lib/journal-utils";
import { MEMORY_IMAGE_BUCKET } from "@/lib/image-utils";

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

  // Group Images Mode: Default is OFF (Single Image)
  // When ON: allows up to 5 images max (2, 3, 4, or 5 images)
  const [isGroupImages, setIsGroupImages] = useState(false);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // Sync default memory type & active auth user ID on modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setMemoryType(defaultType || "photo");
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) setActiveUserId(authUser.id);
      });
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
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
    setIsGroupImages(false);

    // Clean up previews
    imageItems.forEach((item) => URL.revokeObjectURL(item.preview));
    if (audioPreview) URL.revokeObjectURL(audioPreview);

    setImageItems([]);
    setAudioFile(null);
    setAudioPreview(null);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatusText("");
  }, [defaultType, imageItems, audioPreview]);

  // -------------------------------------------------------------
  // IMAGE VALIDATION & ADD HANDLERS (ENFORCES 1 IMAGE vs MAX 5 GROUPED)
  // -------------------------------------------------------------
  const addImageFiles = useCallback(
    (files: FileList | File[]) => {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // 1. Single Image Mode (Group Images is OFF)
      if (!isGroupImages) {
        if (imageItems.length >= 1 || fileArray.length > 1) {
          error(
            "Single Image Limit",
            "A normal memory allows exactly 1 image. Enable 'Group Images' below to upload up to 5 images."
          );
          // If no image is currently selected, pick only the first file
          if (imageItems.length === 0 && fileArray.length > 1) {
            const firstFile = fileArray[0];
            if (!validTypes.includes(firstFile.type.toLowerCase())) {
              error("Unsupported Format", `"${firstFile.name}" is not supported. Use JPG, JPEG, PNG, or WEBP.`);
              return;
            }
            setImageItems([{ file: firstFile, preview: URL.createObjectURL(firstFile) }]);
            info("Single Image Selected", "Selected 1 image. Enable 'Group Images' to add more.");
          }
          return;
        }

        const singleFile = fileArray[0];
        if (!validTypes.includes(singleFile.type.toLowerCase())) {
          error("Unsupported Format", `"${singleFile.name}" is not supported. Use JPG, JPEG, PNG, or WEBP.`);
          return;
        }

        if (singleFile.size > 10 * 1024 * 1024) {
          error("File Too Large", "Maximum image size is 10 MB.");
          return;
        }

        // Clean existing preview
        imageItems.forEach((it) => URL.revokeObjectURL(it.preview));
        setImageItems([{ file: singleFile, preview: URL.createObjectURL(singleFile) }]);
        return;
      }

      // 2. Group Images Mode (Max 5 Images)
      const currentCount = imageItems.length;
      if (currentCount >= 5) {
        error("Maximum 5 Images", "You can upload a maximum of 5 images per memory.");
        return;
      }

      if (currentCount + fileArray.length > 5) {
        error(
          "5 Image Limit",
          `You selected ${fileArray.length} images, but only ${5 - currentCount} more can be added (Max 5 images total).`
        );
      }

      // Filter valid types
      const invalidFile = fileArray.find((f) => !validTypes.includes(f.type.toLowerCase()));
      if (invalidFile) {
        error("Unsupported Format", `"${invalidFile.name}" is not supported. Use JPG, JPEG, PNG, or WEBP.`);
        return;
      }

      // Check total combined size limit (10MB)
      const addedSizeBytes = fileArray.reduce((acc, f) => acc + f.size, 0);
      if (totalImagesSizeBytes + addedSizeBytes > 10 * 1024 * 1024) {
        error("Total Size Exceeded", "Maximum total upload size for all images combined is 10 MB.");
        return;
      }

      // Strictly take up to available slots (max 5)
      const availableSlots = 5 - currentCount;
      const allowedFiles = fileArray.slice(0, availableSlots);

      const newItems: ImageItem[] = allowedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setImageItems((prev) => [...prev, ...newItems]);
    },
    [isGroupImages, imageItems, totalImagesSizeBytes, error, info]
  );

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
  // Strict 5-image limit enforced in UI AND Backend logic
  // -------------------------------------------------------------
  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    if (!title.trim()) {
      error("Missing Title", "Please provide a title for your memory.");
      return;
    }

    // Strict validation: enforce max 5 images limit
    const filesToUpload = isGroupImages ? imageItems.slice(0, 5) : imageItems.slice(0, 1);
    if (filesToUpload.length > 5) {
      error("Limit Exceeded", "Maximum 5 images allowed per memory.");
      return;
    }

    if (totalImagesSizeBytes > 10 * 1024 * 1024) {
      error("Storage Exceeded", "Uploading these files would exceed your combined 10 MB image limit.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText("Connecting to Supabase Vault...");

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

      // Upload Images to 'memory-images' storage bucket with precise progress
      if (filesToUpload.length > 0) {
        const totalFiles = filesToUpload.length;
        const uploadedPaths: string[] = [];

        for (let i = 0; i < totalFiles; i++) {
          const item = filesToUpload[i];
          const pct = 15 + Math.round(((i + 0.5) / totalFiles) * 70);
          setUploadProgress(pct);
          setUploadStatusText(`Uploading Image ${i + 1} of ${totalFiles} (${Math.round(((i + 1) / totalFiles) * 100)}%)...`);

          const fileExt = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
          const uniqueId = Math.random().toString(36).substring(2, 9);
          const filePath = `${userId}/${Date.now()}_${i}_${uniqueId}.${fileExt}`;

          try {
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from(MEMORY_IMAGE_BUCKET)
              .upload(filePath, item.file, {
                cacheControl: "3600",
                upsert: true,
                contentType: item.file.type || "image/jpeg",
              });

            if (uploadErr) {
              // Try creating bucket or retry once if 404
              if (uploadErr.message?.toLowerCase().includes("not found")) {
                await supabase.storage.createBucket(MEMORY_IMAGE_BUCKET, {
                  public: true,
                  allowedMimeTypes: ["image/*"],
                });
                const retry = await supabase.storage
                  .from(MEMORY_IMAGE_BUCKET)
                  .upload(filePath, item.file, { upsert: true });
                if (retry.data?.path) {
                  uploadedPaths.push(retry.data.path);
                  continue;
                }
              }
              console.error(`[STORAGE UPLOAD ERROR] Image ${i + 1} failed:`, uploadErr);
              throw new Error(`Failed to upload image ${i + 1}: ${uploadErr.message}`);
            }

            if (uploadData?.path) {
              uploadedPaths.push(uploadData.path);
            } else {
              uploadedPaths.push(filePath);
            }
          } catch (fileErr: any) {
            console.error(`[UPLOAD FAILURE] Image ${i + 1}:`, fileErr);
            throw new Error(`Upload failed for image "${item.file.name}". ${fileErr?.message || ""}`);
          }
        }

        // Assign cover image (1st) and gallery (remaining up to 4)
        if (uploadedPaths.length > 0) {
          coverImageUrl = uploadedPaths[0];
          for (let k = 1; k < uploadedPaths.length; k++) {
            uploadedGalleryUrls.push(uploadedPaths[k]);
          }
        }

        setUploadProgress(88);
        setUploadStatusText("Saving memory record to database...");
      }

      const now = new Date();
      const autoIsoString = now.toISOString();
      const autoDateOnly = autoIsoString.split("T")[0];
      const finalMemoryDate = memoryType === "journal" ? autoDateOnly : memoryDate;

      // Resolve final category: if custom, use the user-typed value
      const finalCategory =
        category === "Custom"
          ? customCategoryInput.trim() || customCategory.trim() || "Custom"
          : category;
      const finalTags = [...tags];

      const totalUploadedBytes = filesToUpload.reduce((acc, item) => acc + (item.file?.size || 0), 0);

      // Insert Record into Supabase `memories` table
      // Connects ALL uploaded images to the SAME memory row (cover_image + gallery)
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

      const { data: insertedData, error: dbError } = await supabase
        .from("memories")
        .insert([newRecord])
        .select("*")
        .single();

      if (dbError) {
        console.error("[MEMORY INSERT ERROR]", dbError.message, dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      if (!insertedData) {
        throw new Error("Memory insert returned no data — the write may have been blocked by RLS. Please check your session.");
      }

      const finalMemory: Memory = insertedData as Memory;
      console.log("[MEMORY SAVED TO CLOUD] id:", finalMemory.id, "user_id:", finalMemory.user_id);

      setUploadProgress(100);
      setUploadStatusText("Memory Saved!");

      const imageCountMsg = filesToUpload.length > 1
        ? `Grouped memory with ${filesToUpload.length} photos saved.`
        : "Memory permanently stored in your vault.";
      success("Memory Saved", imageCountMsg);

      onMemoryCreated(finalMemory);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Save memory error:", err);
      const msg = err instanceof Error ? err.message : "Could not save memory to server.";
      error("Save Error", msg);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Scrollable viewport — lets the modal scroll naturally on small/mobile screens without touch trapping */}
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl glass-panel rounded-3xl p-4 sm:p-8 border border-white/20 shadow-2xl z-10 max-h-[90dvh] overflow-y-auto overscroll-contain"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 sticky top-0 bg-[#090d16]/90 backdrop-blur-md z-20 -mx-4 -mt-4 px-4 pt-4 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-6 rounded-t-3xl">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>Add Memory to Vault</span>
              </h2>
              <p className="text-xs text-white/60">
                Preserve moments forever in your encrypted vault.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] active:scale-95 border border-white/15 text-white/80 hover:text-white transition-all cursor-pointer shrink-0 z-30"
              title="Close"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveMemory} className="space-y-6 pb-2">
            {/* Hidden replace input */}
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
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
                    className={`flex items-center justify-center gap-2 min-h-[46px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-98 ${
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
                  className="w-full min-h-[46px] p-3 rounded-xl bg-[#0b1020] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan cursor-pointer"
                >
                  {AURORA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Custom Category Input */}
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
                      className="w-full min-h-[44px] p-2.5 rounded-xl bg-white/[0.06] border border-aurora-cyan/40 text-xs text-white placeholder-white/40 focus:outline-none focus:border-aurora-cyan"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* PHOTO MEMORY SECTION WITH SINGLE vs GROUP IMAGES TOGGLE */}
            {memoryType === "photo" && (
              <div className="space-y-4 rounded-3xl bg-white/[0.02] border border-white/10 p-4 sm:p-5">
                {/* Clear "Group Images" Option / Toggle */}
                <div
                  onClick={() => {
                    const next = !isGroupImages;
                    setIsGroupImages(next);
                    if (!next && imageItems.length > 1) {
                      imageItems.slice(1).forEach((item) => URL.revokeObjectURL(item.preview));
                      setImageItems([imageItems[0]]);
                      info("Single Image Mode", "Retained primary photo. Extra photos removed.");
                    }
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 active:scale-[0.99] transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                        isGroupImages
                          ? "bg-aurora-cyan/20 border-aurora-cyan/50 text-aurora-cyan"
                          : "bg-white/[0.05] border-white/10 text-white/50"
                      }`}
                    >
                      <Images className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {isGroupImages ? "Group Images" : "Single Image"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                            isGroupImages
                              ? "bg-aurora-cyan/20 border-aurora-cyan/40 text-aurora-cyan shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                              : "bg-white/[0.05] border-white/10 text-white/50"
                          }`}
                        >
                          {isGroupImages ? "Up to 5 images" : "1 image maximum"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        {isGroupImages
                          ? "Group multiple photos (up to 5 max) into this single memory."
                          : "Default: Exactly 1 photo. Tap to enable grouping up to 5 photos."}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isGroupImages}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = !isGroupImages;
                      setIsGroupImages(next);
                      if (!next && imageItems.length > 1) {
                        imageItems.slice(1).forEach((item) => URL.revokeObjectURL(item.preview));
                        setImageItems([imageItems[0]]);
                        info("Single Image Mode", "Retained primary photo. Extra photos removed.");
                      }
                    }}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isGroupImages ? "bg-aurora-cyan shadow-[0_0_12px_rgba(56,189,248,0.5)]" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isGroupImages ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Dropzone & Selector */}
                {((!isGroupImages && imageItems.length === 0) ||
                  (isGroupImages && imageItems.length < 5)) && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer group ${
                      isDragging
                        ? "border-aurora-cyan bg-aurora-cyan/15 scale-[1.01]"
                        : "border-white/20 hover:border-aurora-cyan/50 bg-white/[0.02]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple={isGroupImages}
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        if (e.target.files) addImageFiles(e.target.files);
                        e.target.value = "";
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />

                    <div className="flex flex-col items-center gap-2.5 pointer-events-none">
                      <Upload className="w-8 h-8 text-aurora-cyan group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-medium text-white/90">
                        {isGroupImages ? (
                          <>
                            Tap to choose <span className="text-aurora-cyan font-bold">up to 5 photos</span> (or drag & drop)
                          </>
                        ) : (
                          <>
                            Tap to choose <span className="text-aurora-cyan font-bold">1 photo</span> (or drag & drop)
                          </>
                        )}
                      </p>
                      <p className="text-[10px] text-white/50">
                        JPG, JPEG, PNG, WEBP &bull; Max 10 MB total
                      </p>
                    </div>
                  </div>
                )}

                {/* Single Image Mode Notification when 1 image is selected */}
                {!isGroupImages && imageItems.length === 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/70">
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Single Image Selected (1/1)
                    </span>
                    <span className="text-[11px] text-white/50">
                      Tap &ldquo;Group Images&rdquo; above to attach up to 5 photos.
                    </span>
                  </div>
                )}

                {/* Group Images Capacity Counter */}
                {isGroupImages && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-white/70">
                      Attached Images: <strong className="text-white">{imageItems.length} / 5</strong>
                    </span>
                    <span className="font-mono text-[11px] text-aurora-cyan font-bold">
                      {totalImagesSizeMb} MB / 10 MB
                    </span>
                  </div>
                )}

                {/* Preview Grid for Attached Images */}
                {imageItems.length > 0 && (
                  <div
                    className={`grid gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/10 ${
                      !isGroupImages
                        ? "grid-cols-1 max-w-xs mx-auto"
                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                    }`}
                  >
                    {imageItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-2xl overflow-hidden group bg-black/50 border border-white/15 aspect-square flex flex-col justify-between"
                      >
                        <img
                          src={item.preview}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-full object-cover absolute inset-0"
                        />

                        {/* Image Index Badge */}
                        <div className="relative z-10 p-1.5 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-aurora-cyan border border-white/10 shadow-sm">
                            {idx === 0 ? "Cover" : `#${idx + 1}`}
                          </span>
                        </div>

                        {/* Action Bar (Always visible on mobile, hover on desktop) */}
                        <div className="relative z-10 p-1.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-center gap-1.5 transition-opacity">
                          {isGroupImages && idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveImageItem(idx, "left")}
                              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-95"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => triggerReplaceImage(idx)}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-aurora-cyan/30 hover:bg-aurora-cyan/50 text-aurora-cyan cursor-pointer active:scale-95"
                            title="Replace Image"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeImageItem(idx)}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-300 cursor-pointer active:scale-95"
                            title="Remove Image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {isGroupImages && idx < imageItems.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveImageItem(idx, "right")}
                              className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-95"
                              title="Move Right"
                            >
                              <ChevronRight className="w-4 h-4" />
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
                    className="flex-1 min-h-[46px] p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="min-w-[46px] min-h-[46px] flex items-center justify-center rounded-xl bg-aurora-cyan/20 text-aurora-cyan hover:bg-aurora-cyan/30 active:scale-95 cursor-pointer"
                    aria-label="Add Tag"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-white/90 flex items-center gap-1.5"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="min-w-[20px] min-h-[20px] flex items-center justify-center text-white/50 hover:text-white cursor-pointer"
                          aria-label={`Remove tag ${t}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
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

            {/* Date, Mood & Favorite Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 min-h-[46px] p-2 rounded-xl bg-white/[0.04] border border-white/10">
                <CalendarIcon className="w-4 h-4 text-white/50 shrink-0" />
                <input
                  type="date"
                  value={memoryDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="w-full bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                />
              </div>

              <div className="min-h-[46px]">
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full min-h-[46px] p-2.5 rounded-xl bg-[#0b1020] border border-white/10 text-xs text-white focus:outline-none focus:border-aurora-cyan cursor-pointer"
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

              <div>
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border active:scale-98 ${
                    isFavorite
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                      : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  <Star className={`w-4 h-4 ${isFavorite ? "fill-rose-400 text-rose-400" : ""}`} />
                  <span>{isFavorite ? "Starred Favorite" : "Add to Favorites"}</span>
                </button>
              </div>
            </div>

            {/* Upload Progress Status Indicator */}
            {isUploading && (
              <div className="p-3.5 rounded-2xl bg-aurora-cyan/10 border border-aurora-cyan/30 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-semibold text-aurora-cyan">
                  <span>{uploadStatusText || "Uploading..."}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-aurora-cyan to-aurora-violet h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
            )}

            {/* Actions (Sticky or accessible on mobile) */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/10">
              <GlassButton
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={isUploading}
                className="w-full sm:w-auto min-h-[46px]"
              >
                Cancel
              </GlassButton>

              <GlassButton
                type="submit"
                variant="primary"
                size="md"
                isLoading={isUploading}
                leftIcon={<Check className="w-4 h-4" />}
                className="w-full sm:w-auto min-h-[46px]"
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
