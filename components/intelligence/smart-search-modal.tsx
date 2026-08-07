"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  History,
  Tag,
  MapPin,
  Smile,
  Calendar as CalendarIcon,
  Film,
  Image as ImageIcon,
  Mic,
  BookOpen,
  ArrowRight,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Memory, SearchHistoryItem } from "@/lib/types";
import { filterSmartSearch } from "@/lib/intelligence";
import { createClient } from "@/lib/supabase/client";

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
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter memories matching query
  const searchResults = filterSmartSearch(memories, query);

  // Fetch search history from Supabase
  const fetchSearchHistory = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      if (data) {
        setHistoryItems(data as SearchHistoryItem[]);
      }
    } catch (err) {
      console.error("Search history fetch error:", err);
    }
  }, []);

  // Save query to search history in Supabase
  const saveSearchHistory = async (searchTerm: string) => {
    const cleanTerm = searchTerm.trim();
    if (!cleanTerm) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Avoid duplicates
      const existing = historyItems.find(
        (h) => h.query.toLowerCase() === cleanTerm.toLowerCase()
      );
      if (existing) return;

      const { data, error } = await supabase
        .from("search_history")
        .insert({ user_id: user.id, query: cleanTerm })
        .select()
        .single();

      if (!error && data) {
        setHistoryItems((prev) => [data as SearchHistoryItem, ...prev.slice(0, 7)]);
      }
    } catch (err) {
      console.error("Save search history error:", err);
    }
  };

  // Delete search history item
  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("search_history").delete().eq("id", id).eq("user_id", user.id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete search history item error:", err);
    }
  };

  // Focus input when opened & register Cmd+K
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      fetchSearchHistory();
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen, fetchSearchHistory]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered by parent if passing isOpen state
        }
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
      if (query.trim()) {
        saveSearchHistory(query);
      }
      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        onSelectMemory(searchResults[selectedIndex]);
        onClose();
      }
    }
  };

  // Term highlighter helper
  const highlightMatches = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark
          key={i}
          className="bg-aurora-cyan/30 text-aurora-cyan px-0.5 rounded font-semibold"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
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
          <Search className="w-5 h-5 text-aurora-cyan shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
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
          {/* Recent Searches Header if query is empty */}
          {!query.trim() && historyItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-white/50 px-2">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-aurora-cyan" />
                  Recent Searches
                </span>
                <span className="text-[10px] text-white/40">Synced with Supabase</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setQuery(item.query);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-white/80 cursor-pointer transition-all group"
                  >
                    <span>{item.query}</span>
                    <button
                      onClick={(e) => deleteHistoryItem(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-400 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Quick Categories Hint */}
          {!query.trim() && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-white/50 px-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-aurora-violet" />
                Quick Search Filters
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Photos", q: "photo" },
                  { label: "Videos", q: "video" },
                  { label: "Journals", q: "journal" },
                ].map((cat) => (
                  <button
                    key={cat.q}
                    onClick={() => setQuery(cat.q)}
                    className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/8 text-left transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-white/80">{cat.label}</span>
                    <ArrowRight className="w-3 h-3 text-white/40" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          {query.trim() && (
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
                        saveSearchHistory(query);
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
                              {highlightMatches(mem.title, query)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-white/60 capitalize font-medium shrink-0">
                              {mem.memory_type}
                            </span>
                          </div>

                          {mem.description && (
                            <p className="text-xs text-white/60 truncate max-w-md">
                              {highlightMatches(mem.description, query)}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[10px] text-white/40 flex-wrap">
                            {mem.memory_date && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 text-aurora-cyan" />
                                {mem.memory_date}
                              </span>
                            )}
                            {mem.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-400" />
                                {highlightMatches(mem.location, query)}
                              </span>
                            )}
                            {mem.mood && (
                              <span className="flex items-center gap-1">
                                <Smile className="w-3 h-3 text-amber-400" />
                                {mem.mood}
                              </span>
                            )}
                            {mem.tags && mem.tags.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3 text-aurora-violet" />
                                {mem.tags.join(", ")}
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
          )}
        </div>

        {/* Footer Navigation bar */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-white/40">
          <span>Search Intelligence Active</span>
          <div className="flex items-center gap-3">
            <span>Press Enter to View</span>
            <span>ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
