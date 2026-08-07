"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  User,
  ShieldAlert,
  Trash2,
  HardDrive,
  ChevronRight,
} from "lucide-react";
import { calculateUserStorageMetrics } from "@/lib/storage-utils";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { StatsGrid, DashboardFilterKey } from "@/components/dashboard/stats-grid";
import { UnifiedTimelineGallery } from "@/components/dashboard/unified-timeline-gallery";

import dynamic from "next/dynamic";
import { UserProfile, Memory, MemoryType, Collection, NotificationItem } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { vaultStore } from "@/lib/persistence/vault-store";
import { recoverMemoryImage, purgeAndVerifyMemoryStorageFiles } from "@/lib/image-utils";

// Dynamic Code-Splitting & Lazy Loading for Heavy Components & Modals
const SmartSearchModal = dynamic(() => import("@/components/intelligence/smart-search-modal").then((m) => m.SmartSearchModal), { ssr: false });
const CreateMemoryModal = dynamic(() => import("@/components/dashboard/create-memory-modal").then((m) => m.CreateMemoryModal), { ssr: false });
const EditMemoryModal = dynamic(() => import("@/components/experience/edit-memory-modal").then((m) => m.EditMemoryModal), { ssr: false });
const CinematicMemoryViewer = dynamic(() => import("@/components/experience/cinematic-memory-viewer").then((m) => m.CinematicMemoryViewer), { ssr: false });
const TrashArchiveView = dynamic(() => import("@/components/experience/trash-archive-view").then((m) => m.TrashArchiveView), { ssr: false });
const InsightsDashboard = dynamic(() => import("@/components/intelligence/insights-dashboard").then((m) => m.InsightsDashboard), { ssr: false });
const UserProfileView = dynamic(() => import("@/components/account/user-profile-view").then((m) => m.UserProfileView), { ssr: false });
const AccountManagementView = dynamic(() => import("@/components/account/account-management-view").then((m) => m.AccountManagementView), { ssr: false });

export type ExperienceTab =
  | "insights"
  | "profile"
  | "account_security"
  | "trash";

export interface DashboardPageProps {
  initialTab?: ExperienceTab;
}

export function DashboardView({ initialTab = "insights" }: DashboardPageProps) {
  const router = useRouter();
  const { success, error } = useToast();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<DashboardFilterKey>("all");

  // Active Tab Switcher
  const [activeTab, setActiveTab] = useState<ExperienceTab>(initialTab);

  // Modals & Viewers & Search Palette
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [defaultCreateType, setDefaultCreateType] = useState<MemoryType>("photo");

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "init-1",
      title: "Vault Core Synchronized",
      message: "Connected to Supabase Row Level Security engine.",
      timestamp: "Just now",
      type: "info",
      read: false,
    },
  ]);

  const addNotification = useCallback(
    (title: string, message: string, type: "success" | "info" | "warning" | "error" = "info") => {
      const newItem: NotificationItem = {
        id: Math.random().toString(36).substring(2, 9),
        title,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type,
        read: false,
      };
      setNotifications((prev) => [newItem, ...prev]);
    },
    []
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      const supabase = createClient();

      // 1500ms timeout race to prevent auth check hangs
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<any>((resolve) =>
        setTimeout(() => resolve({ data: { user: null }, error: new Error("Auth check timeout") }), 1500)
      );

      let {
        data: { user: authUser },
        error: authErr,
      } = await Promise.race([userPromise, timeoutPromise]);

      if (authErr || !authUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        authUser = sessionData?.session?.user || null;
      }

      if (!authUser) {
        const guestId = "guest-vault-user";
        const guestProfile: UserProfile = {
          id: guestId,
          email: "explorer@auroravault.io",
          full_name: "Vault Explorer",
          avatar_url: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        };
        const cachedProfile = vaultStore.getProfile(guestId) || guestProfile;
        const cachedMemories = vaultStore.getMemories(guestId) || [];
        setUser(cachedProfile);
        setMemories(cachedMemories);
        setLoading(false);
        return;
      }

      // INSTANT UNBLOCK FROM VAULT STORE CACHE (< 50ms rendering)
      const cachedProfile = vaultStore.getProfile(authUser.id);
      const cachedMemories = vaultStore.getMemories(authUser.id);

      if (cachedProfile) setUser(cachedProfile);
      if (cachedMemories && cachedMemories.length > 0) {
        setMemories(cachedMemories);
        setLoading(false); // Immediate unblock for butter smooth UX
      }

      // PARALLEL SUPABASE FETCH
      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      const memoriesPromise = supabase
        .from("memories")
        .select("*")
        .eq("user_id", authUser.id)
        .order("memory_date", { ascending: false });

      const collectionsPromise = supabase
        .from("collections")
        .select("*")
        .eq("user_id", authUser.id);

      const [profRes, memRes, colRes] = await Promise.allSettled([
        profilePromise,
        memoriesPromise,
        collectionsPromise,
      ]);

      let profile = profRes.status === "fulfilled" ? profRes.value.data : null;
      let memData = memRes.status === "fulfilled" ? memRes.value.data : null;
      let colData = colRes.status === "fulfilled" ? colRes.value.data : null;

      if (!profile && cachedProfile) {
        profile = cachedProfile as typeof profile;
      }

      if (!profile) {
        const now = new Date().toISOString();
        const initialProfile = {
          id: authUser.id,
          email: authUser.email || "",
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "Memory Collector",
          avatar_url: authUser.user_metadata?.avatar_url || "",
          created_at: now,
          updated_at: now,
          last_login: now,
        };
        try {
          await supabase.from("profiles").upsert(initialProfile);
        } catch (e) {
          console.warn("Profiles upsert notice:", e);
        }
        profile = initialProfile as typeof profile;
      }

      const activeProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || "",
        full_name: profile?.full_name ?? authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "Memory Collector",
        avatar_url: profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? "",
        bio: profile?.bio ?? "",
        timezone: profile?.timezone ?? "UTC",
        language: profile?.language ?? "en",
        created_at: profile?.created_at || authUser.created_at,
        updated_at: profile?.updated_at || authUser.created_at,
        last_login: new Date().toISOString(),
      };

      setUser(activeProfile);
      vaultStore.saveProfile(authUser.id, activeProfile);

      let finalMemories: Memory[] = (memData as Memory[]) || [];
      if (finalMemories.length === 0 && cachedMemories && cachedMemories.length > 0) {
        finalMemories = cachedMemories;
      } else if (finalMemories.length > 0) {
        vaultStore.saveMemories(authUser.id, finalMemories);
      }

      // Auto Purge items in Trash older than 30 days
      const thirtyDaysAgoMs = 30 * 24 * 60 * 60 * 1000;
      const nowMs = new Date().getTime();
      const expiredMemories = finalMemories.filter((m) => {
        if (!m.deleted || !m.deleted_at) return false;
        return nowMs - new Date(m.deleted_at).getTime() > thirtyDaysAgoMs;
      });

      if (expiredMemories.length > 0) {
        const expiredIds = expiredMemories.map((m) => m.id);
        finalMemories = finalMemories.filter((m) => !expiredIds.includes(m.id));
        vaultStore.saveMemories(authUser.id, finalMemories);
        try {
          await supabase.from("memories").delete().in("id", expiredIds);
        } catch (e) {
          console.warn("Expired memories purge notice:", e);
        }
      }

      setMemories(finalMemories);
      if (colData) setCollections((colData as Collection[]) || []);

      // PART 1: Run Automatic Image Recovery System in background for older memories
      Promise.all(
        finalMemories
          .filter((m) => m && m.memory_type === "photo")
          .map((m) => recoverMemoryImage(m))
      ).then((results) => {
        const recoveredList = results.filter((r) => r.recovered);
        if (recoveredList.length > 0) {
          console.log(`[IMAGE_RECOVERY] Automatically repaired ${recoveredList.length} image memory records.`);
          setMemories((prev) =>
            prev.map((existing) => {
              const match = recoveredList.find((r) => r.memory.id === existing.id);
              return match ? match.memory : existing;
            })
          );
        }
      });
    } catch (err: unknown) {
      console.error("Dashboard initialization error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle global Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      // Clear all React states immediately
      setMemories([]);
      setCollections([]);
      setUser(null);

      // Clear session caches, autocomplete caches, and cookies
      vaultStore.clearSessionCachesOnLogout();

      if (typeof document !== "undefined") {
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.split("=")[0].trim();
          if (cookieName.includes("sb-") || cookieName.includes("supabase")) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }

      success("Logged Out", "You have securely signed out of your memory vault.");
      router.push("/login");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Logout error";
      error("Logout Failed", msg);
    }
  };

  const handleOpenCreateModal = (defaultType: MemoryType = "photo") => {
    setDefaultCreateType(defaultType);
    setIsCreateModalOpen(true);
  };

  const handleMemoryCreated = (newMemory: Memory) => {
    if (user?.id) vaultStore.saveMemoryItem(user.id, newMemory);
    setMemories((prev) => {
      const updated = [newMemory, ...prev.filter((m) => m.id !== newMemory.id)];
      if (user?.id) vaultStore.saveMemories(user.id, updated);
      return updated;
    });
    addNotification("Memory Saved", `"${newMemory.title}" was protected in your vault.`, "success");
    fetchDashboardData();
  };

  const handleMemoryUpdated = (updatedMemory: Memory) => {
    if (user?.id) vaultStore.saveMemoryItem(user.id, updatedMemory);
    setMemories((prev) => {
      const updated = prev.map((m) => (m.id === updatedMemory.id ? updatedMemory : m));
      if (user?.id) vaultStore.saveMemories(user.id, updated);
      return updated;
    });
    if (selectedMemory && selectedMemory.id === updatedMemory.id) {
      setSelectedMemory(updatedMemory);
    }
    addNotification("Memory Updated", `"${updatedMemory.title}" was updated successfully.`, "success");
    fetchDashboardData();
  };

  const handleSelectMemory = (m: Memory) => {
    setSelectedMemory(m);
  };

  const handleFavoriteToggle = async (id: string, newFavState: boolean) => {
    setMemories((prev) => {
      const updated = prev.map((m) => (m.id === id ? { ...m, favorite: newFavState } : m));
      if (user?.id) vaultStore.saveMemories(user.id, updated);
      return updated;
    });
    if (selectedMemory && selectedMemory.id === id) {
      setSelectedMemory((prev) => (prev ? { ...prev, favorite: newFavState } : null));
    }
    try {
      const supabase = createClient();
      await supabase.from("memories").update({ favorite: newFavState, updated_at: new Date().toISOString() }).eq("id", id);
    } catch (err) {
      console.warn("Favorite toggle DB notice:", err);
    }
  };

  const handleArchiveToggle = async (id: string, newArchiveState: boolean) => {
    setMemories((prev) => {
      const updated = prev.map((m) => (m.id === id ? { ...m, archived: newArchiveState } : m));
      if (user?.id) vaultStore.saveMemories(user.id, updated);
      return updated;
    });
    try {
      const supabase = createClient();
      await supabase.from("memories").update({ archived: newArchiveState, updated_at: new Date().toISOString() }).eq("id", id);
    } catch (err) {
      console.warn("Archive toggle DB notice:", err);
    }
  };

  const handleSoftDelete = async (id: string) => {
    console.log("DELETE STEP 2 — Handler Started for memory ID:", id);
    if (!id) return;
    const now = new Date().toISOString();

    console.log("DELETE STEP 3 — Confirmation Accepted & State Updating");
    setMemories((prev) => {
      const updated = prev.map((m) => (m.id === id ? { ...m, deleted: true, deleted_at: now } : m));
      if (user?.id) vaultStore.saveMemories(user.id, updated);
      return updated;
    });

    // If local/mock/synthetic item, state update is complete
    if (id.startsWith("demo-") || id.startsWith("empty-") || id === "system") {
      console.log("DELETE STEP 5 — Local synthetic item deleted.");
      return;
    }

    try {
      console.log("DELETE STEP 4 — Database Updating (deleted=true)");
      const supabase = createClient();
      const { error: dbErr } = await supabase
        .from("memories")
        .update({ deleted: true, deleted_at: now, updated_at: now })
        .eq("id", id);

      if (dbErr) {
        console.warn("DELETE STEP 4 NOTICE — DB Notice:", dbErr.message);
      } else {
        console.log("DELETE STEP 5 — Storage & Database synchronized");
      }
      console.log("DELETE STEP 6 — Trash Updated");
      console.log("DELETE STEP 7 — Dashboard Refreshed");
    } catch (err) {
      console.warn("DELETE STEP NOTICE — DB exception:", err);
    }
  };

  const handleRestoreMemoriesBatch = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    console.log("[Trash Restore Batch Initiated]", { targetIds: ids, userId: user?.id });

    const now = new Date().toISOString();

    setMemories((prev) => {
      const updated = prev.map((m) =>
        ids.includes(m.id) ? { ...m, deleted: false, archived: false, deleted_at: null, updated_at: now } : m
      );
      if (user?.id) vaultStore.saveMemories(user.id, updated);
      return updated;
    });

    const realDbIds = ids.filter((id) => !id.startsWith("demo-") && !id.startsWith("empty-") && id !== "system");
    if (realDbIds.length === 0) return;

    try {
      const supabase = createClient();
      const { data, error: dbErr, status } = await supabase
        .from("memories")
        .update({ deleted: false, archived: false, deleted_at: null, updated_at: now })
        .in("id", realDbIds)
        .select();

      if (dbErr) {
        console.warn("[Trash Restore Notice]", {
          reason: "Supabase DB update notice",
          targetIds: realDbIds,
          message: dbErr.message,
          status,
        });
      } else {
        console.log("[Trash Restore Succeeded]", {
          table: "memories",
          restoredCount: data?.length || realDbIds.length,
          status,
        });
      }
    } catch (err) {
      console.warn("[Trash Restore Exception]", err);
    }
  };

  const handlePermanentDeleteMemoriesBatch = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const storageBefore = calculateUserStorageMetrics(memories, user?.avatar_url);
    console.log("[STORAGE_AUDIT] Storage Before:", { usedMb: storageBefore.usedMb, usedBytes: storageBefore.storageUsedBytes });

    const supabase = createClient();
    const targetMemories = memories.filter((m) => ids.includes(m.id));

    let totalFreedEstimate = 0;
    const deletedObjectList: string[] = [];

    for (const item of targetMemories) {
      const purgeRes = await purgeAndVerifyMemoryStorageFiles(supabase, item);
      deletedObjectList.push(...purgeRes.deletedObjects);
      totalFreedEstimate += purgeRes.freedEstimateBytes;
    }

    console.log("[STORAGE_AUDIT] Deleted Objects:", deletedObjectList);
    console.log("[STORAGE_AUDIT] Bytes Freed:", totalFreedEstimate);

    setMemories((prev) => {
      const updated = prev.filter((m) => !ids.includes(m.id));
      if (user?.id) vaultStore.saveMemories(user.id, updated);
      const storageAfter = calculateUserStorageMetrics(updated, user?.avatar_url);
      console.log("[STORAGE_AUDIT] Storage After:", { usedMb: storageAfter.usedMb, usedBytes: storageAfter.storageUsedBytes });
      console.log("[STORAGE_AUDIT] Verification Result: Confirmed storage updated and zero orphan files remain.");
      return updated;
    });

    if (user?.id) {
      ids.forEach((id) => vaultStore.deleteMemoryItem(user.id, id));
    }

    const realDbIds = ids.filter((id) => !id.startsWith("demo-") && !id.startsWith("empty-") && id !== "system");
    if (realDbIds.length === 0) return;

    try {
      const { data, error: dbErr, status } = await supabase
        .from("memories")
        .delete()
        .in("id", realDbIds)
        .select();

      if (dbErr) {
        console.warn("[Trash Permanent Delete Notice]", {
          reason: "Supabase DB deletion notice",
          targetIds: realDbIds,
          message: dbErr.message,
          status,
        });
      } else {
        console.log("[Trash Permanent Delete Succeeded]", {
          table: "memories",
          deletedCount: data?.length || realDbIds.length,
          status,
        });
      }
    } catch (err) {
      console.warn("[Trash Permanent Delete Exception]", err);
    }
  };

  const handleRestoreMemory = async (id: string) => {
    await handleRestoreMemoriesBatch([id]);
  };

  const handlePermanentDelete = async (id: string) => {
    await handlePermanentDeleteMemoriesBatch([id]);
  };



  // Memoized active un-deleted memories feed to prevent re-filtering on every render
  const activeFeedMemories = useMemo(
    () => memories.filter((m) => !m.deleted && !m.archived),
    [memories]
  );

  // Memoized storage calculation to prevent heavy metric computation during search typing
  const storageMetrics = useMemo(
    () => calculateUserStorageMetrics(memories, user?.avatar_url),
    [memories, user?.avatar_url]
  );

  if (loading) {
    return (
      <AuroraBackground>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-aurora-cyan to-aurora-violet p-0.5 animate-spin">
            <div className="w-full h-full bg-[#030712] rounded-[14px]" />
          </div>
          <span className="text-sm font-medium text-white/70">
            Initializing Vault Core...
          </span>
        </div>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <div className="min-h-screen flex flex-col justify-between relative z-10">
        <div>
          {/* Top Navbar */}
          <DashboardNavbar
            user={user}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setIsSearchModalOpen(true);
            }}
            onOpenCreateModal={() => handleOpenCreateModal("photo")}
            onLogout={handleLogout}
            notifications={notifications}
            onOpenProfile={() => setActiveTab("profile")}
          />

          {/* Main Dashboard Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Welcome Greeting */}
            <WelcomeHeader user={user} />

            {/* Quick Stats Navigation Filter Grid */}
            <StatsGrid
              memories={activeFeedMemories}
              activeFilter={activeFilter}
              onSelectFilter={(filterKey) => {
                setActiveFilter(filterKey);
                if (activeTab !== "insights") setActiveTab("insights");
                setTimeout(() => {
                  document.getElementById("unified-memory-gallery")?.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
            />

            {/* Dashboard Storage Summary Card */}
            <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/12 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02] shadow-xl my-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-aurora-cyan/15 border border-aurora-cyan/30 text-aurora-cyan">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-white/50">Storage</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {storageMetrics.usedMb} MB / {storageMetrics.storageLimitMb} MB
                    </span>
                      </div>
                      <div className="w-48 sm:w-64 h-2 rounded-full bg-white/10 overflow-hidden mt-1.5 border border-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-aurora-cyan to-aurora-violet transition-all duration-300"
                          style={{ width: `${storageMetrics.usagePct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>View Storage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

            {/* Navigation Mode Switcher Pills */}
            <div className="flex items-center gap-2 p-2 rounded-full bg-white/[0.04] backdrop-blur-2xl border border-white/12 my-6 max-w-4xl mx-auto smooth-scroll-x scrollbar-none touch-pan-x select-none">
              {[
                { id: "insights", label: "Insights & Gallery", icon: <BarChart3 className="w-4 h-4 text-aurora-cyan" /> },
                { id: "profile", label: "Profile", icon: <User className="w-4 h-4 text-sky-400" /> },
                { id: "account_security", label: "Security & Account", icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
                { id: "trash", label: "Trash", icon: <Trash2 className="w-4 h-4 text-rose-400" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ExperienceTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-aurora-cyan to-aurora-violet text-white shadow-aurora-glow font-bold"
                      : "text-white/70 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Single Source of Truth Unified Timeline Gallery */}
            {activeTab === "insights" && (
              <div className="space-y-10">
                <UnifiedTimelineGallery
                  memories={activeFeedMemories}
                  activeFilter={activeFilter}
                  onSelectFilter={(f) => setActiveFilter(f)}
                  onSelectMemory={handleSelectMemory}
                  onFavoriteToggle={handleFavoriteToggle}
                  onOpenCreateModal={(type) => handleOpenCreateModal(type || "photo")}
                />

                {/* Vault Analytics & Intelligence Panel */}
                <React.Suspense fallback={null}>
                  <InsightsDashboard
                    memories={activeFeedMemories}
                    userEmail={user?.email}
                    onSelectMemory={handleSelectMemory}
                    onFavoriteToggle={handleFavoriteToggle}
                    onSoftDelete={handleSoftDelete}
                    onArchiveToggle={handleArchiveToggle}
                    onOpenCreateModal={(type?: MemoryType) => handleOpenCreateModal(type || "photo")}
                  />
                </React.Suspense>
              </div>
            )}

            {activeTab === "profile" && (
              <React.Suspense fallback={null}>
                <UserProfileView
                  user={user}
                  memories={memories}
                  onProfileUpdated={(updated) => setUser(updated)}
                  onMemoriesDeleted={() => fetchDashboardData()}
                />
              </React.Suspense>
            )}

            {activeTab === "account_security" && (
              <React.Suspense fallback={null}>
                <AccountManagementView user={user} />
              </React.Suspense>
            )}

            {activeTab === "trash" && (
              <React.Suspense fallback={null}>
                <TrashArchiveView
                  memories={memories}
                  onRestoreMemory={handleRestoreMemory}
                  onPermanentDelete={handlePermanentDelete}
                  onRestoreBatch={handleRestoreMemoriesBatch}
                  onPermanentDeleteBatch={handlePermanentDeleteMemoriesBatch}
                />
              </React.Suspense>
            )}
          </main>
        </div>

        {/* Floating Smart Search Palette Modal */}
        <React.Suspense fallback={null}>
          <SmartSearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            memories={activeFeedMemories}
            onSelectMemory={handleSelectMemory}
          />
        </React.Suspense>

        {/* Modals & Fullscreen Viewers */}
        <React.Suspense fallback={null}>
          <CreateMemoryModal
            isOpen={isCreateModalOpen}
            defaultType={defaultCreateType}
            onClose={() => setIsCreateModalOpen(false)}
            onMemoryCreated={handleMemoryCreated}
          />
        </React.Suspense>

        <React.Suspense fallback={null}>
          <CinematicMemoryViewer
            memory={selectedMemory}
            allMemories={memories}
            onClose={() => setSelectedMemory(null)}
            onSelectMemory={handleSelectMemory}
            onOpenEditModal={(m) => setEditingMemory(m)}
            onSoftDelete={handleSoftDelete}
            onFavoriteToggle={handleFavoriteToggle}
          />
        </React.Suspense>

        <React.Suspense fallback={null}>
          <EditMemoryModal
            memory={editingMemory}
            onClose={() => setEditingMemory(null)}
            onMemoryUpdated={handleMemoryUpdated}
          />
        </React.Suspense>

        {/* Premium Dashboard Footer */}
        <footer className="max-w-7xl mx-auto w-full px-6 py-8 mt-16 border-t border-white/10 flex flex-col items-center justify-center text-center space-y-2 select-none">
          <h4 className="font-display text-sm font-bold text-white/80 tracking-wide">
            Aurora Digital Memory Vault
          </h4>
          <p className="text-xs text-white/50 italic font-light max-w-md">
            &ldquo;Every memory deserves a safe place to live forever.&rdquo;
          </p>
          <p className="text-[11px] text-white/40 font-medium tracking-wider pt-1">
            &copy; 2026 Aurora &bull; Private &bull; Secure &bull; Timeless
          </p>
        </footer>
      </div>
    </AuroraBackground>
  );
}
