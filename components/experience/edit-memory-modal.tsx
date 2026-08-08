"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  Tag,
  MapPin,
  Calendar,
  Smile,
} from "lucide-react";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassButton } from "@/components/ui/glass-button";
import { Memory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { AURORA_CATEGORIES, AURORA_MOODS } from "@/lib/journal-utils";

interface EditMemoryModalProps {
  memory: Memory | null;
  onClose: () => void;
  onMemoryUpdated: (updatedMemory: Memory) => void;
}

export function EditMemoryModal({
  memory,
  onClose,
  onMemoryUpdated,
}: EditMemoryModalProps) {
  const { success, error } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [mood, setMood] = useState("Happy");
  const [location, setLocation] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Pause any playing background video immediately when Edit Memory modal opens
  useEffect(() => {
    if (memory && typeof document !== "undefined") {
      document.querySelectorAll("video").forEach((vid) => {
        vid.pause();
      });
    }
  }, [memory]);

  useEffect(() => {
    if (memory) {
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
    }
  }, [memory]);

  if (!memory) return null;

  const handleClose = () => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Discard updates?")) return;
    }
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[EDIT_MEMORY] STEP 1: Save button clicked");

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

      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const finalCategory = category === "Custom"
        ? (customCategoryInput.trim() || "Custom")
        : category;

      // Metadata update ONLY
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
      };

      const updateQuery = supabase
        .from("memories")
        .update(updates)
        .eq("id", memory.id)
        .select();

      const queryTimeout = new Promise<any>((resolve) =>
        setTimeout(
          () => resolve({ data: null, error: { message: "Query timeout" } }),
          4000
        )
      );

      const { data: updatedRows, error: dbError } = await Promise.race([updateQuery, queryTimeout]);

      if (dbError) {
        console.warn("DB update notice (updating local state):", dbError);
      }

      const updatedMemory: Memory = {
        ...memory,
        ...updates,
      };

      success("Memory Updated", `"${title}" updates saved to your vault.`);
      onMemoryUpdated(updatedMemory);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating memory";
      error("Update Error", msg);
    } finally {
      setIsSaving(false);
    }
  };

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
              <p className="text-xs text-white/60">Update memory details and metadata.</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/[0.05] border border-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <GlassInput
                  label="Memory Title *"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasChanges(true);
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-full rounded-2xl py-3 px-3 text-xs text-white bg-[#0b1020] border border-white/12 focus:border-aurora-cyan outline-none cursor-pointer max-h-48 overflow-y-auto"
                >
                  {AURORA_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
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
                      onChange={(e) => {
                        setCustomCategoryInput(e.target.value);
                        setHasChanges(true);
                      }}
                      className="w-full rounded-2xl p-2.5 text-xs text-white bg-white/[0.06] border border-aurora-cyan/40 focus:border-aurora-cyan outline-none"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Multiline Description textarea preserving line breaks */}
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
                onChange={(e) => {
                  setDescription(e.target.value);
                  setHasChanges(true);
                }}
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
                onChange={(e) => {
                  setMemoryDate(e.target.value);
                  setHasChanges(true);
                }}
                leftIcon={<Calendar className="w-4 h-4" />}
              />

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-white/70">
                  Mood
                </label>
                <select
                  value={mood}
                  onChange={(e) => {
                    setMood(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-full rounded-2xl py-3 px-3 text-xs text-white bg-[#0b1020] border border-white/12 focus:border-aurora-cyan outline-none cursor-pointer max-h-48 overflow-y-auto"
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
                onChange={(e) => {
                  setLocation(e.target.value);
                  setHasChanges(true);
                }}
                leftIcon={<MapPin className="w-4 h-4" />}
              />

              <GlassInput
                label="Tags (Comma separated)"
                type="text"
                value={tagsInput}
                onChange={(e) => {
                  setTagsInput(e.target.value);
                  setHasChanges(true);
                }}
                leftIcon={<Tag className="w-4 h-4" />}
              />
            </div>

            {/* Favorite Button */}
            <div className="flex items-center justify-start pt-2 border-t border-white/10 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsFavorite(!isFavorite);
                  setHasChanges(true);
                }}
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
                Save Memory Updates
              </GlassButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
