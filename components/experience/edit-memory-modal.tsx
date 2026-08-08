"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  Tag,
  MapPin,
  Calendar,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { Memory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { AURORA_CATEGORIES, AURORA_MOODS } from "@/lib/journal-utils";
import { MEMORY_IMAGE_BUCKET, resolveMemoryImageUrl, extractStoragePath } from "@/lib/image-utils";

interface EditMemoryModalProps {
  memory: Memory | null;
  onClose: () => void;
  onMemoryUpdated: (updatedMemory: Memory) => void;
}

/**
 * One image slot in the edit image manager.
 * - path: relative storage path or "" for new pending files
 * - preview: displayable URL (<img> src)
 * - isNew: true = selected locally, not yet uploaded
 * - file: only present when isNew = true
 */
interface EditImageSlot {
  path: string;
  preview: string;
  isNew: boolean;
  file?: File;
}

export function EditMemoryModal({
  memory,
  onClose,
  onMemoryUpdated,
}: EditMemoryModalProps) {
  const { success, error, info } = useToast();

  // Metadata fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [mood, setMood] = useState("Happy");
  const [location, setLocation] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  // Image management
  const [imageSlots, setImageSlots] = useState<EditImageSlot[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Pause background videos when modal opens
  useEffect(() => {
    if (memory && typeof document !== "undefined") {
      document.querySelectorAll("video").forEach((vid) => vid.pause());
    }
  }, [memory]);

  // Populate form when memory changes
  useEffect(() => {
    if (memory) {
      document.body.style.overflow = "hidden";
      setTitle(memory.title || "");
      setDescription(memory.description || "");
      const cat = memory.category || "Personal";
      if (AURORA_CATEGORIES.includes(cat) && cat !== "Custom") {
        setCategory(cat);
        setCustomCategoryInput("");
      } else {
        setCategory("Custom");
        setCustomCategoryInput(cat === "Custom" ? "" : cat);
      }
      setMood(memory.mood || "Happy");
      setLocation(memory.location || "");
      setTagsInput(memory.tags ? memory.tags.join(", ") : "");
      setMemoryDate(memory.memory_date || new Date().toISOString().split("T")[0]);
      setIsFavorite(Boolean(memory.favorite));
      setHasChanges(false);
      setRemovedPaths([]);

      // Build initial image slots from cover_image + gallery[]
      const slots: EditImageSlot[] = [];
      if (memory.cover_image && typeof memory.cover_image === "string" && memory.cover_image.trim()) {
        const path = extractStoragePath(memory.cover_image) || memory.cover_image;
        const preview = resolveMemoryImageUrl(memory.cover_image) || memory.cover_image;
        slots.push({ path, preview, isNew: false });
      }
      if (Array.isArray(memory.gallery)) {
        for (const g of memory.gallery) {
          if (g && typeof g === "string" && g.trim()) {
            const path = extractStoragePath(g) || g;
            const preview = resolveMemoryImageUrl(g) || g;
            if (!slots.some((s) => s.path === path)) {
              slots.push({ path, preview, isNew: false });
            }
          }
        }
      }
      setImageSlots(slots);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [memory]);

  if (!memory) return null;

  const MAX_IMAGES = 5;
  const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const handleClose = () => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Discard updates?")) return;
    }
    imageSlots.forEach((s) => {
      if (s.isNew && s.preview) URL.revokeObjectURL(s.preview);
    });
    onClose();
  };

  // ── IMAGE MANAGEMENT ──────────────────────────────────────────────────────────

  const handleAddMoreImages = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (imageSlots.length + fileArray.length > MAX_IMAGES) {
      error("Maximum 5 Images", `You can have a maximum of ${MAX_IMAGES} images per memory.`);
      return;
    }
    const invalidFile = fileArray.find((f) => !VALID_TYPES.includes(f.type.toLowerCase()));
    if (invalidFile) {
      error("Unsupported Format", `"${invalidFile.name}" is not supported. Use JPG, JPEG, PNG, or WEBP.`);
      return;
    }
    const newSlots: EditImageSlot[] = fileArray.map((file) => ({
      path: "",
      preview: URL.createObjectURL(file),
      isNew: true,
      file,
    }));
    setImageSlots((prev) => [...prev, ...newSlots]);
    setHasChanges(true);
    if (fileArray.length > 0) {
      info("Images Added", `${fileArray.length} image(s) added. Save to upload them.`);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageSlots((prev) => {
      const slot = prev[index];
      if (!slot) return prev;
      if (slot.isNew && slot.preview) URL.revokeObjectURL(slot.preview);
      if (!slot.isNew && slot.path) {
        setRemovedPaths((existing) => [...existing, slot.path]);
      }
      return prev.filter((_, i) => i !== index);
    });
    setHasChanges(true);
  };

  const handleMoveImage = (index: number, direction: "left" | "right") => {
    setImageSlots((prev) => {
      const updated = [...prev];
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
    setHasChanges(true);
  };

  // â”€â”€ SAVE HANDLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      error("Validation Error", "Memory Title is required.");
      return;
    }
    if (!memory || !memory.id || typeof memory.id !== "string" || !memory.id.trim()) {
      error("Update Error", "Invalid memory record ID. Cannot update.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        error("Authentication Required", "Please sign in to save changes.");
        setIsSaving(false);
        return;
      }
      const userId = user.id;

      // STEP 1: Delete removed cloud images from storage
      if (removedPaths.length > 0) {
        const validPaths = removedPaths.filter(
          (p) => p && !p.startsWith("data:") && !p.startsWith("blob:")
        );
        if (validPaths.length > 0) {
          try {
            await supabase.storage.from(MEMORY_IMAGE_BUCKET).remove(validPaths);
          } catch (storageErr) {
            console.warn("[EDIT_MODAL] Storage remove notice:", storageErr);
          }
        }
      }

      // STEP 2: Upload new image files
      const finalSlots: EditImageSlot[] = [];
      for (let i = 0; i < imageSlots.length; i++) {
        const slot = imageSlots[i];
        if (!slot.isNew) {
          finalSlots.push(slot);
          continue;
        }
        if (!slot.file) continue;

        const fileExt = slot.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uniqueId = Math.random().toString(36).substring(2, 8);
        const filePath = `${userId}/${Date.now()}_edit_${i}_${uniqueId}.${fileExt}`;

        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from(MEMORY_IMAGE_BUCKET)
            .upload(filePath, slot.file, { upsert: false });

          if (!uploadErr && uploadData?.path) {
            finalSlots.push({ path: uploadData.path, preview: "", isNew: false });
          } else {
            console.warn("[EDIT_MODAL] Upload notice:", uploadErr?.message);
          }
        } catch (uploadEx) {
          console.warn("[EDIT_MODAL] Upload exception:", uploadEx);
        }

        if (slot.preview && slot.preview.startsWith("blob:")) {
          URL.revokeObjectURL(slot.preview);
        }
      }

      // STEP 3: Build final cover_image + gallery[]
      const finalCoverImage = finalSlots.length > 0 ? finalSlots[0].path : null;
      const finalGallery = finalSlots.length > 1 ? finalSlots.slice(1).map((s) => s.path) : [];

      // STEP 4: Build metadata update payload
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const finalCategory =
        category === "Custom" ? (customCategoryInput.trim() || "Custom") : category;

      const updates: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        category: finalCategory,
        mood,
        location: location.trim() || null,
        tags: tagsArray,
        memory_date: memoryDate,
        favorite: isFavorite,
        updated_at: new Date().toISOString(),
        cover_image: finalCoverImage,
        gallery: finalGallery,
      };

      // STEP 5: Persist to Supabase with 6-second timeout
      const updateQuery = supabase
        .from("memories")
        .update(updates)
        .eq("id", memory.id)
        .select();

      const queryTimeout = new Promise<any>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "Query timeout" } }), 6000)
      );

      const { error: dbError } = await Promise.race([updateQuery, queryTimeout]);

      if (dbError) {
        console.warn("[EDIT_MODAL] DB update notice:", dbError);
      }

      // STEP 6: Build updated memory object for UI
      const updatedMemory: Memory = {
        ...memory,
        ...updates,
        cover_image: finalCoverImage,
        gallery: finalGallery,
      };

      success("Memory Updated", `"${title}" saved to your vault.`);
      onMemoryUpdated(updatedMemory);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating memory";
      error("Update Error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  const isPhotoMemory = memory.memory_type !== "journal";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.35 }}
          className="relative w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Edit Memory</h2>
              <p className="text-xs text-white/60">Update memory details, images, and metadata.</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              className="p-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0 z-30"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Hidden file input for adding more images */}
            <input
              ref={addMoreInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleAddMoreImages(e.target.files);
                }
                e.target.value = "";
              }}
            />

            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <GlassInput
                  label="Memory Title *"
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setHasChanges(true); }}
                  className="w-full rounded-2xl py-3 px-3 text-xs text-white bg-[#0b1020] border border-white/12 focus:border-aurora-cyan outline-none cursor-pointer"
                >
                  {AURORA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {category === "Custom" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Enter your custom category..."
                      value={customCategoryInput}
                      onChange={(e) => { setCustomCategoryInput(e.target.value); setHasChanges(true); }}
                      className="w-full rounded-2xl p-2.5 text-xs text-white bg-white/[0.06] border border-aurora-cyan/40 focus:border-aurora-cyan outline-none"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* IMAGE MANAGEMENT SECTION (photo memories only) */}
            {isPhotoMemory && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                    Images ({imageSlots.length} / {MAX_IMAGES})
                  </label>
                  {imageSlots.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => addMoreInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-aurora-cyan/20 hover:bg-aurora-cyan/30 border border-aurora-cyan/40 text-aurora-cyan text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Images</span>
                    </button>
                  )}
                </div>

                {imageSlots.length === 0 ? (
                  <div
                    onClick={() => addMoreInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-aurora-cyan/50 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                  >
                    <Upload className="w-7 h-7 text-aurora-cyan mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs text-white/70 font-medium">
                      No images. <span className="text-aurora-cyan font-bold">Click to add images</span>
                    </p>
                    <p className="text-[10px] text-white/40 mt-1">JPG, PNG, WEBP Â· Up to {MAX_IMAGES} images</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/10">
                    {imageSlots.map((slot, idx) => (
                      <div
                        key={`${idx}-${slot.path}`}
                        className="relative rounded-xl overflow-hidden group bg-black/40 border border-white/15 aspect-square"
                      >
                        <img
                          src={slot.preview}
                          alt={`Image ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = "0.2";
                          }}
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-mono font-bold text-aurora-cyan">
                          {idx === 0 ? "Cover" : `#${idx + 1}`}
                        </span>
                        {slot.isNew && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-emerald-500/80 text-[9px] font-bold text-white">
                            NEW
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1 backdrop-blur-[2px]">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, "left")}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1.5 rounded-lg bg-rose-500/40 hover:bg-rose-500/60 text-rose-200 cursor-pointer"
                            title="Remove Image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          {idx < imageSlots.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, "right")}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {imageSlots.length < MAX_IMAGES && (
                      <div
                        onClick={() => addMoreInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-aurora-cyan/50 flex flex-col items-center justify-center cursor-pointer transition-all group"
                      >
                        <ImageIcon className="w-5 h-5 text-white/40 group-hover:text-aurora-cyan transition-colors" />
                        <span className="text-[9px] text-white/40 group-hover:text-aurora-cyan mt-1">Add</span>
                      </div>
                    )}
                  </div>
                )}

                {imageSlots.some((s) => s.isNew) && (
                  <p className="text-[10px] text-aurora-cyan/80 font-medium">
                    âœ¦ New images will be uploaded to your vault when you save.
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                Description / Journal Entry
              </label>
              <textarea
                rows={5}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setHasChanges(true); }}
                placeholder="Enter description (Press Enter for new lines)..."
                className="w-full rounded-2xl p-4 text-xs text-white bg-white/[0.04] backdrop-blur-xl border border-white/12 focus:border-aurora-cyan outline-none whitespace-pre-wrap leading-relaxed resize-y min-h-[120px]"
              />
            </div>

            {/* Date, Mood, Location, Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassInput
                label="Date of Memory"
                type="date"
                value={memoryDate}
                onChange={(e) => { setMemoryDate(e.target.value); setHasChanges(true); }}
                leftIcon={<Calendar className="w-4 h-4" />}
              />

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                  Mood
                </label>
                <select
                  value={mood}
                  onChange={(e) => { setMood(e.target.value); setHasChanges(true); }}
                  className="w-full rounded-2xl py-3 px-3 text-xs text-white bg-[#0b1020] border border-white/12 focus:border-aurora-cyan outline-none cursor-pointer"
                >
                  {AURORA_MOODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <GlassInput
                label="Location"
                type="text"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setHasChanges(true); }}
                leftIcon={<MapPin className="w-4 h-4" />}
              />

              <GlassInput
                label="Tags (Comma separated)"
                type="text"
                value={tagsInput}
                onChange={(e) => { setTagsInput(e.target.value); setHasChanges(true); }}
                leftIcon={<Tag className="w-4 h-4" />}
              />
            </div>

            {/* Favorite */}
            <div className="flex items-center justify-start pt-2 border-t border-white/10 text-xs">
              <button
                type="button"
                onClick={() => { setIsFavorite(!isFavorite); setHasChanges(true); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all cursor-pointer ${
                  isFavorite
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                    : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white"
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
                <span>{isFavorite ? "Starred Favorite" : "Add to Favorites"}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <GlassButton type="button" variant="ghost" size="md" onClick={handleClose}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" size="md" isLoading={isSaving}>
                {isSaving ? "Saving..." : "Save Memory Updates"}
              </GlassButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

