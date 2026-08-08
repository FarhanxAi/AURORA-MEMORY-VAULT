"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Tag,
  MapPin,
  Smile,
  Calendar as CalendarIcon,
  Film,
  Image as ImageIcon,
  Mic,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Memory } from "@/lib/types";
import { filterSmartSearch } from "@/lib/intelligence";
import { highlightMatchingText } from "@/lib/journal-utils";

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  onSelectMemory: (m: Memory) => void;
}

export function SmartSearchModal({
  isOpen,
  onClose,
  memories,
  onSelectMemory,
}: SmartSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter memories matching query strictly in memory
  const searchResults = filterSmartSearch(memories, query);

  // Focus input when opened & register Cmd+K
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle arrow key navigation inside modal
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        onSelectMemory(searchResults[selectedIndex]);
        onClose();
      }
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "photo":
        return <ImageIcon className="w-3.5 h-3.5 text-aurora-cyan" />;
      case "video":
        return <Film className="w-3.5 h-3.5 text-indigo-400" />;
      case "voice":
        return <Mic className="w-3.5 h-3.5 text-aurora-violet" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-xl animate-fadeIn">
      {/* Backdrop overlay click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Floating Vision Pro Glass Panel */}
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-white/20 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Top Search Header */}
        <div className="flex items-center px-5 py-4 border-b border-white/10 gap-3">
          <Search className="w-5 h-5 text-aurora-cyan shrink-0" />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search title, description, tags, location, mood, date..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-white/40 border border-white/10 px-2 py-0.5 rounded-lg bg-white/[0.04]">
            <span>ESC</span>
          </div>
        </div>

        {/* Search Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Results List */}
          {query.trim() ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/50 px-2 pb-1">
                <span>
                  Found <strong className="text-aurora-cyan">{searchResults.length}</strong> matching memories
                </span>
                <span className="text-[10px]">Use ↑ ↓ to navigate, Enter to select</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-semibold text-white/70">No memories found</p>
                  <p className="text-xs text-white/40">
                    Try searching with another keyword, tag, or location.
                  </p>
                </div>
              ) : (
                searchResults.map((mem, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={mem.id}
                      onClick={() => {
                        onSelectMemory(mem);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? "bg-gradient-to-r from-aurora-cyan/15 to-aurora-violet/15 border-aurora-cyan/60 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                          : "bg-white/[0.03] border-white/8 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 overflow-hidden">
                        {/* Memory Thumbnail or Icon */}
                        {mem.cover_image ? (
                          <img
                            src={mem.cover_image}
                            alt={mem.title}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                            {getMediaIcon(mem.memory_type)}
                          </div>
                        )}

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {highlightMatchingText(mem.title, query)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-white/60 capitalize font-medium shrink-0">
                              {highlightMatchingText(mem.memory_type, query)}
                            </span>
                          </div>

                          {mem.description && (
                            <p className="text-xs text-white/60 truncate max-w-md">
                              {highlightMatchingText(mem.description, query)}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[10px] text-white/40 flex-wrap">
                            {mem.memory_date && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 text-aurora-cyan" />
                                {highlightMatchingText(mem.memory_date, query)}
                              </span>
                            )}
                            {mem.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-400" />
                                {highlightMatchingText(mem.location, query)}
                              </span>
                            )}
                            {mem.mood && (
                              <span className="flex items-center gap-1">
                                <Smile className="w-3 h-3 text-amber-400" />
                                {highlightMatchingText(mem.mood, query)}
                              </span>
                            )}
                            {mem.tags && mem.tags.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3 text-aurora-violet" />
                                {mem.tags.map((t, tidx) => (
                                  <span key={tidx}>#{highlightMatchingText(t, query)}{tidx < mem.tags.length - 1 ? ", " : ""}</span>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ArrowRight
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isSelected ? "text-aurora-cyan translate-x-1" : "text-white/20"
                        }`}
                      />
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-white/70">Type to search</p>
              <p className="text-xs text-white/40">
                Search title, description, tags, location, mood, or date.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation bar */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-white/40">
          <span>Search Vault</span>
          <div className="flex items-center gap-3">
            <span>Press Enter to View</span>
            <span>ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
