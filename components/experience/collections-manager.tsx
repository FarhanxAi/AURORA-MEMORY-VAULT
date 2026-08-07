"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, Folder, Trash2, Plus, Sparkles, X, Edit2, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { Collection, Memory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

interface CollectionsManagerProps {
  memories: Memory[];
  onSelectMemory: (memory: Memory) => void;
}

export function CollectionsManager({ memories, onSelectMemory }: CollectionsManagerProps) {
  const { success, error } = useToast();

  const [collections, setCollections] = useState<Collection[]>([
    { id: "col-1", user_id: "", name: "Travel Adventures", description: "Vacations and trips", icon: "Compass", created_at: "" },
    { id: "col-2", user_id: "", name: "Family & Heritage", description: "Family gatherings and milestones", icon: "Heart", created_at: "" },
    { id: "col-3", user_id: "", name: "AI Projects", description: "Inventions and code builds", icon: "Sparkles", created_at: "" },
  ]);

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");

  const activeCollection = collections.find((c) => c.id === activeCollectionId);

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol: Collection = {
      id: Math.random().toString(36).substring(2, 9),
      user_id: "",
      name: newColName,
      description: newColDesc || null,
      icon: "Folder",
      created_at: new Date().toISOString(),
    };

    setCollections([newCol, ...collections]);
    success("Collection Created", `"${newColName}" collection was added.`);
    setNewColName("");
    setNewColDesc("");
    setIsCreating(false);
  };

  const handleDeleteCollection = (id: string, name: string) => {
    if (!confirm(`Delete collection "${name}"? Memories inside will remain intact.`)) return;
    setCollections(collections.filter((c) => c.id !== id));
    if (activeCollectionId === id) setActiveCollectionId(null);
    success("Collection Deleted", `"${name}" removed.`);
  };

  return (
    <div className="space-y-8 my-8">
      {/* Header Bar */}
      <div className="p-4 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-aurora-violet" />
          <h3 className="font-display text-lg font-bold text-white">Custom Collections</h3>
        </div>

        <GlassButton
          variant="primary"
          size="sm"
          onClick={() => setIsCreating(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Collection
        </GlassButton>
      </div>

      {/* Create Modal Form */}
      {isCreating && (
        <GlassCard className="p-6 border-aurora-violet/40 max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="font-display font-bold text-white text-base">New Collection</h4>
            <button onClick={() => setIsCreating(false)} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreateCollection} className="space-y-4">
            <GlassInput
              label="Collection Name *"
              type="text"
              placeholder="e.g. Travel, Birthday, AI Projects"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              required
            />
            <GlassInput
              label="Description (Optional)"
              type="text"
              placeholder="Short summary of this group"
              value={newColDesc}
              onChange={(e) => setNewColDesc(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <GlassButton type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" size="sm">
                Create
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Collections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {collections.map((col) => (
          <GlassCard
            key={col.id}
            glowColor="violet"
            onClick={() => setActiveCollectionId(col.id)}
            className={`p-6 cursor-pointer space-y-4 group border-white/12 ${
              activeCollectionId === col.id ? "border-aurora-violet/60 bg-white/[0.08]" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-aurora-violet/10 border border-aurora-violet/30 text-aurora-violet group-hover:scale-110 transition-transform">
                <Folder className="w-6 h-6" />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCollection(col.id, col.name);
                }}
                className="p-2 rounded-full text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-display text-lg font-bold text-white group-hover:text-aurora-violet transition-colors">
                {col.name}
              </h4>
              {col.description && (
                <p className="text-xs text-white/60 font-light">{col.description}</p>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
