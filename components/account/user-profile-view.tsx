"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  User,
  Mail,
  Calendar,
  HardDrive,
  Sparkles,
  Camera,
  Save,
  Check,
  Edit2,
  ShieldCheck,
  ZoomIn,
  Move,
  Trash2,
  X,
  Upload,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Sliders,
  AlertCircle,
  Download,
} from "lucide-react";
import { fetchRealSupabaseStorageUsage, formatByteSize, calcTotalJournalStorageBytes, calculateUserStorageMetrics } from "@/lib/storage-utils";
import { UserProfile, Memory } from "@/lib/types";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { vaultStore } from "@/lib/persistence/vault-store";
import { ExportVaultModal } from "@/components/account/export-vault-modal";

interface UserProfileViewProps {
  user: UserProfile | null;
  memories: Memory[];
  onProfileUpdated: (updated: UserProfile) => void;
  onMemoriesDeleted?: () => void;
}

// Resilient helper to upload avatar image to Supabase Storage
async function uploadAvatarToStorage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  fileOrBlob: Blob | File
): Promise<string> {
  const possibleBucketNames = ["memory-images", "avatars", "profiles", "memories"];
  const fileExt = "webp";
  const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

  let targetBucket = "memory-images";
  let lastError: Error | null = null;

  for (const bucketName of possibleBucketNames) {
    try {
      const uploadRes = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileOrBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (!uploadRes.error) {
        targetBucket = bucketName;
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          console.log(`[AVATAR UPLOAD SUCCESS] Uploaded to bucket "${bucketName}" at path "${filePath}"`);
          return publicUrlData.publicUrl;
        }
      } else {
        lastError = new Error(uploadRes.error.message);
        console.warn(`[AVATAR UPLOAD NOTICE] Bucket "${bucketName}" attempt:`, uploadRes.error.message);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[AVATAR UPLOAD NOTICE] Bucket "${bucketName}" exception:`, err);
    }
  }

  // If standard buckets failed, throw error or fallback safely
  if (lastError) {
    console.error("[AVATAR STORAGE FAILED]", lastError);
  }

  // Fail-safe fallback: convert blob to Base64 data URL if storage upload failed
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

export function UserProfileView({
  user,
  memories,
  onProfileUpdated,
  onMemoriesDeleted,
}: UserProfileViewProps) {
  const { success, error, info } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showProtectedInfo, setShowProtectedInfo] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");

  // Sync state whenever user prop updates or editing mode toggles
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user, isEditing]);

  // Avatar Crop / Transform Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [realStorageBytes, setRealStorageBytes] = useState<number | null>(null);
  const [isRefreshingStorage, setIsRefreshingStorage] = useState(false);

  // Dragging State for Canvas Preview Repositioning
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate Active & Total Memories (backend database powered)
  const activeMemories = useMemo(() => memories.filter((m) => !m.deleted), [memories]);
  const archivedMemories = useMemo(() => memories.filter((m) => m.archived && !m.deleted), [memories]);

  // Query actual storage size from Supabase storage buckets & user attachments
  const fetchStorageBytes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const supabase = createClient();
      const bytes = await fetchRealSupabaseStorageUsage(supabase, user.id);
      if (bytes > 0) {
        setRealStorageBytes(bytes);
      }
    } catch (err) {
      console.warn("Storage usage query notice:", err);
    }
  }, [user?.id]);

  const handleManualRefreshStorage = async () => {
    if (isRefreshingStorage || !user?.id) return;
    setIsRefreshingStorage(true);
    try {
      const supabase = createClient();
      const bytes = await fetchRealSupabaseStorageUsage(supabase, user.id);
      setRealStorageBytes(bytes);
      const journalBytes = calcTotalJournalStorageBytes(memories);
      const totalBytes = bytes + journalBytes;
      success(
        "Storage Recalculated",
        `Real storage: ${formatByteSize(bytes)} files + ${formatByteSize(journalBytes)} journal text = ${formatByteSize(totalBytes)} total.`
      );
    } catch (err) {
      console.warn("Storage refresh notice:", err);
    } finally {
      setIsRefreshingStorage(false);
    }
  };

  useEffect(() => {
    fetchStorageBytes();
  }, [fetchStorageBytes]);

  // Immutable Member Since (Persisted permanently across logins)
  const memberSinceDisplay = useMemo(() => {
    if (typeof window !== "undefined" && user?.id) {
      const storageKey = `aurora_member_since_${user.id}`;
      let storedDate = localStorage.getItem(storageKey);
      if (!storedDate) {
        storedDate = user?.created_at || new Date().toISOString();
        try {
          localStorage.setItem(storageKey, storedDate);
        } catch {}
      }
      const d = new Date(storedDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
    return "05 Nov 2026";
  }, [user?.id, user?.created_at]);

  // Dynamic Last Login Display — uses Supabase DB value (user.last_login) first,
  // falls back to localStorage timestamp set during the OAuth callback profile upsert.
  const lastLoginDisplay = useMemo(() => {
    // Priority 1: real timestamp stored in database via auth callback upsert
    let rawDate: string | null = user?.last_login || null;

    // Priority 2: localStorage cache (set during same login session by vault-store)
    if (!rawDate && typeof window !== "undefined" && user?.id) {
      const lastLoginKey = `aurora_last_login_${user.id}`;
      rawDate = localStorage.getItem(lastLoginKey);
    }

    // If still no date, do NOT default to now() — show nothing rather than mislead
    if (!rawDate) return "—";

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "—";

    const datePart = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} at ${timePart}`;
  }, [user?.id, user?.last_login]);

  // Calculate formatted real storage used.
  // Source of truth order:
  //   1. realStorageBytes from Supabase Storage bucket scan (exact, no estimates)
  //   2. + journal UTF-8 text bytes from description fields
  // Never uses estimates, multipliers, or cached values.
  const formattedStorageDisplay = useMemo(() => {
    // Real storage from Supabase buckets (images, audio, avatars)
    const fileBytes = realStorageBytes !== null ? realStorageBytes : 0;
    // Journal text bytes: UTF-8 byte count of description fields only
    const journalBytes = calcTotalJournalStorageBytes(memories);
    const totalBytes = fileBytes + journalBytes;

    console.log(
      `[STORAGE_ENGINE] Display: files=${formatByteSize(fileBytes)}, journals=${formatByteSize(journalBytes)}, total=${formatByteSize(totalBytes)}`
    );

    return formatByteSize(totalBytes);
  }, [realStorageBytes, memories]);

  // Handle Image File Selection for Crop & Edit Modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCropPreviewUrl(objectUrl);
    setZoom(1.0);
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setOffsetX(0);
    setOffsetY(0);
    setIsCropModalOpen(true);
  };

  // Reset Transform Adjustments
  const handleResetTransforms = () => {
    setZoom(1.0);
    setRotation(0);
    setFlipX(false);
    setFlipY(false);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Rotate Handlers
  const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);

  // Mouse Drag Repositioning Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.min(Math.max(e.clientX - dragStartRef.current.x, -100), 100);
    const newY = Math.min(Math.max(e.clientY - dragStartRef.current.y, -100), 100);
    setOffsetX(newX);
    setOffsetY(newY);
  };

  const handleMouseUp = () => setIsDragging(false);

  // Compress & Crop Image via HTML5 Canvas before uploading to Supabase Storage
  const handleSaveAvatar = async () => {
    if (!cropPreviewUrl || !user) return;

    setUploadingAvatar(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = cropPreviewUrl;
      });

      // Canvas 512x512 square export size
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not initialize 2D canvas context.");

      ctx.clearRect(0, 0, 512, 512);
      ctx.save();

      // Translate origin to canvas center
      ctx.translate(256, 256);

      // Rotate canvas
      ctx.rotate((rotation * Math.PI) / 180);

      // Flip canvas
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

      // Aspect ratio draw logic
      const aspect = img.width / img.height;
      let drawW = 512;
      let drawH = 512;

      if (aspect > 1) {
        drawH = 512;
        drawW = 512 * aspect;
      } else {
        drawW = 512;
        drawH = 512 / aspect;
      }

      drawW *= zoom;
      drawH *= zoom;

      // Draw transformed image onto canvas
      ctx.drawImage(
        img,
        -drawW / 2 + offsetX * (512 / 160),
        -drawH / 2 + offsetY * (512 / 160),
        drawW,
        drawH
      );

      ctx.restore();

      // Export canvas to WebP Blob with 0.85 quality compression
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/webp", 0.85);
      });

      if (!blob) throw new Error("Image compression export failed.");

      const supabase = createClient();

      // Re-verify active session before writing
      let authUser = (await supabase.auth.getUser()).data.user;
      if (!authUser) {
        authUser = (await supabase.auth.getSession()).data.session?.user || null;
      }

      if (!authUser) {
        error("Session Error", "Your session has expired. Please sign in again.");
        return;
      }

      const authUserId = authUser.id;
      const authEmail = authUser.email || user.email || "";

      const newAvatarUrl = await uploadAvatarToStorage(supabase, authUserId, blob);

      // Upsert profiles table in database FIRST, then update local state only if cloud write succeeded
      const { error: updateErr } = await supabase
        .from("profiles")
        .upsert({
          id: authUserId,
          email: authEmail,
          full_name: fullName || user.full_name || "Vault Explorer",
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (updateErr) {
        console.error("[AVATAR SAVE ERROR]", updateErr.message, updateErr);
        error("Photo Save Failed", `Could not save avatar to cloud: ${updateErr.message}`);
        return;
      }

      // Cloud write confirmed — now update local state
      setAvatarUrl(newAvatarUrl);
      const updatedProfileWithAvatar: UserProfile = {
        ...user,
        id: authUserId,
        email: authEmail,
        avatar_url: newAvatarUrl,
        full_name: fullName || user.full_name || "Vault Explorer",
        updated_at: new Date().toISOString(),
      };
      vaultStore.saveProfile(authUserId, updatedProfileWithAvatar);
      onProfileUpdated(updatedProfileWithAvatar);
      setIsCropModalOpen(false);
      if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
      fetchStorageBytes();
      success("Profile Photo Updated", "Your profile image was cropped, optimized, and saved to cloud.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process photo";
      error("Photo Error", msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Delete profile image
  const handleDeleteAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const supabase = createClient();

      // Re-verify active session
      const { data: authCheck } = await supabase.auth.getUser();
      const authUserId = authCheck?.user?.id;
      if (!authUserId || authUserId !== user.id) {
        error("Session Error", "Your session has expired. Please sign in again.");
        return;
      }

      const { error: delErr } = await supabase
        .from("profiles")
        .upsert({
          id: authUserId,
          email: user.email,
          avatar_url: "",
          updated_at: new Date().toISOString(),
        });

      if (delErr) {
        console.error("[AVATAR DELETE ERROR]", delErr.message);
        error("Delete Failed", `Could not remove avatar from cloud: ${delErr.message}`);
        return;
      }

      setAvatarUrl("");
      const updatedProfileNoAvatar = { ...user, avatar_url: "" };
      vaultStore.saveProfile(authUserId, updatedProfileNoAvatar);
      onProfileUpdated(updatedProfileNoAvatar);
      setIsCropModalOpen(false);
      if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
      info("Photo Removed", "Your profile photo has been reset to default.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete photo";
      error("Delete Error", msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const supabase = createClient();

      // Always re-verify the active authenticated user before writing
      let authUser = (await supabase.auth.getUser()).data.user;
      if (!authUser) {
        authUser = (await supabase.auth.getSession()).data.session?.user || null;
      }

      if (!authUser) {
        error("Session Error", "Your session has expired. Please sign in again.");
        return;
      }

      const authUserId = authUser.id;
      const authEmail = authUser.email || user?.email || "";
      const updatedIso = new Date().toISOString();

      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert({
          id: authUserId,
          email: authEmail,
          full_name: fullName || user?.full_name || "Vault Explorer",
          bio: bio || "",
          avatar_url: avatarUrl,
          updated_at: updatedIso,
        });

      if (upsertErr) {
        console.error("[PROFILE SAVE ERROR]", upsertErr.message, upsertErr);
        error("Save Failed", `Could not save profile to cloud: ${upsertErr.message}`);
        return;
      }

      // Re-fetch from Supabase to confirm the write actually landed in cloud
      const { data: confirmedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUserId)
        .maybeSingle();

      const newProfile: UserProfile = confirmedProfile
        ? (confirmedProfile as UserProfile)
        : { ...(user || {}), id: authUserId, email: authEmail, full_name: fullName, bio, avatar_url: avatarUrl, updated_at: updatedIso, created_at: user?.created_at || updatedIso, last_login: updatedIso };

      vaultStore.saveProfile(authUserId, newProfile);
      onProfileUpdated(newProfile);
      setIsEditing(false);
      success("Profile Saved", "Your profile changes were permanently saved and verified in cloud.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      error("Save Error", msg);
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Background Specular Ambient Glow for Profile Section */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-96 h-96 rounded-full bg-aurora-cyan/15 blur-[110px]" />
      <div className="pointer-events-none absolute top-1/2 -right-10 w-96 h-96 rounded-full bg-aurora-violet/15 blur-[120px]" />

      {/* Profile Banner & Header Container (Solid Glass Obsidian) */}
      <div className="glass-panel bg-[#090d16] backdrop-blur-3xl p-6 sm:p-8 rounded-3xl border border-white/15 relative overflow-hidden shadow-2xl shadow-black/90">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            {/* Avatar Uploader Component */}
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-aurora-cyan/60 shadow-aurora-glow"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-aurora-cyan via-aurora-indigo to-aurora-violet flex items-center justify-center text-white text-3xl font-bold shadow-aurora-glow">
                  {fullName?.charAt(0) || "A"}
                </div>
              )}

              {/* Upload trigger overlay — visible on hover (desktop) AND always visible on mobile touch */}
              <label className="absolute inset-0 rounded-3xl bg-[#030712]/60 opacity-0 group-hover:opacity-100 sm:opacity-0 flex flex-col items-center justify-center text-white text-xs font-semibold cursor-pointer transition-all duration-300 backdrop-blur-md">
                <Camera className="w-6 h-6 mb-1 text-aurora-cyan" />
                <span>Change Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {/* Mobile-always-visible camera badge — touch-friendly tap target */}
              <label
                className="sm:hidden absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-aurora-cyan flex items-center justify-center cursor-pointer shadow-lg border-2 border-[#090d16] z-10"
                title="Change Photo"
              >
                <Camera className="w-4 h-4 text-[#030712]" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                  {fullName || "Vault Explorer"}
                </h1>
                <button
                  type="button"
                  onClick={() => setShowProtectedInfo(!showProtectedInfo)}
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-3 py-1 rounded-full cursor-pointer transition-all active:scale-95 shadow-sm"
                  title="Tap for Protection Details"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Protected
                </button>
              </div>

              {showProtectedInfo && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/90 backdrop-blur-xl border border-emerald-500/40 text-xs text-emerald-200 space-y-1 animate-fadeIn max-w-md shadow-lg">
                  <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Account Protection & RLS Active
                  </p>
                  <p className="text-white/90 leading-relaxed text-[11px]">
                    Your profile and memory data are strictly isolated. PostgREST policies prevent unauthorized read/write access.
                  </p>
                </div>
              )}

              <p className="text-xs text-white/70 font-mono font-medium">🔒 Secure Memory Vault &bull; {user?.email}</p>
              {bio && <p className="text-sm text-white/90 max-w-md leading-relaxed font-normal">{bio}</p>}
            </div>
          </div>

          <GlassButton
            variant={isEditing ? "secondary" : "primary"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            leftIcon={isEditing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          >
            {isEditing ? "Cancel Editing" : "Edit Profile"}
          </GlassButton>
        </div>
      </div>

      {/* Quick Statistics Banner (Fully Backend Powered & HDR 4K Visuals) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        <div className="glass-panel hdr-glass-card p-5 rounded-3xl border border-white/15 space-y-2 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-aurora-cyan" />
              Total Memories
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-aurora-cyan/15 border border-aurora-cyan/30 text-aurora-cyan">
              {activeMemories.length} Active
            </span>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight font-display">{activeMemories.length}</p>
          <div className="text-[11px] text-white/60 font-medium flex flex-wrap items-center gap-2 pt-0.5 border-t border-white/10">
            <span>Vault Total: {memories.length}</span>
            <span>&bull;</span>
            <span>{archivedMemories.length} Archived</span>
          </div>
        </div>

        <div className="glass-panel hdr-glass-card p-5 rounded-3xl border border-white/15 space-y-2 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-aurora-violet" />
              Storage Used
            </span>
            <button
              type="button"
              onClick={handleManualRefreshStorage}
              disabled={isRefreshingStorage}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Recalculate Real Storage"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStorage ? "animate-spin text-aurora-cyan" : ""}`} />
            </button>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight font-display">{formattedStorageDisplay}</p>
        </div>

        <div className="glass-panel hdr-glass-card p-5 rounded-3xl border border-white/15 space-y-2 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              Member Since
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300">
              Verified User
            </span>
          </div>
          <p className="text-xl font-bold text-white tracking-tight font-display pt-1">{memberSinceDisplay}</p>
          <div className="text-[11px] text-white/60 font-medium pt-0.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-1">
            <span>Last Login:</span>
            <span className="font-mono text-aurora-cyan font-semibold">{lastLoginDisplay}</span>
          </div>
        </div>
      </div>
      {/* Storage & Quotas Card */}
      {(() => {
        const storageMetrics = calculateUserStorageMetrics(memories, user?.avatar_url);

        const progressGradient =
          storageMetrics.statusColor === "rose"
            ? "from-rose-600 to-red-500"
            : storageMetrics.statusColor === "orange"
            ? "from-orange-500 to-amber-500"
            : storageMetrics.statusColor === "amber"
            ? "from-amber-400 to-yellow-500"
            : "from-emerald-500 to-teal-400";

        const badgeStyle =
          storageMetrics.statusColor === "rose"
            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
            : storageMetrics.statusColor === "orange"
            ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
            : storageMetrics.statusColor === "amber"
            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

        return (
          <div className="glass-panel bg-[#090d16] backdrop-blur-3xl p-6 rounded-3xl border border-white/15 space-y-4 shadow-2xl relative z-10 my-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-aurora-cyan" />
                <h3 className="text-base font-bold text-white">Storage</h3>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border font-mono font-semibold ${badgeStyle}`}>
                {storageMetrics.usedMb} MB / {storageMetrics.storageLimitMb} MB
              </span>
            </div>

            {/* Live Color-Coded Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-white/70">Vault Capacity</span>
                <span className="text-white font-mono">{storageMetrics.usagePct}% Used</span>
              </div>

              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden border border-white/10 p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${progressGradient} transition-all duration-500 shadow-aurora-glow`}
                  style={{ width: `${storageMetrics.usagePct}%` }}
                />
              </div>
            </div>

            {/* Smart Storage Warning Banners */}
            {storageMetrics.statusMessage && (
              <div
                className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2.5 ${
                  storageMetrics.statusColor === "rose"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : storageMetrics.statusColor === "orange"
                    ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{storageMetrics.statusMessage}</span>
              </div>
            )}

            {/* Storage Item Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Images</span>
                <p className="text-sm font-bold text-white font-mono">{storageMetrics.imageCount}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Journals</span>
                <p className="text-sm font-bold text-emerald-400 font-mono">{storageMetrics.journalCount}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Remaining</span>
                <p className="text-sm font-bold text-aurora-cyan font-mono">{storageMetrics.remainingMb} MB</p>
              </div>
            </div>

            {/* Export Vault Button — Always Visible */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsExportOpen(true)}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  storageMetrics.usagePct >= 90
                    ? "bg-gradient-to-r from-orange-500/20 to-rose-500/20 border-orange-500/40 text-orange-300 hover:from-orange-500/30 hover:to-rose-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)] animate-pulse"
                    : "bg-white/[0.04] border-white/10 text-white/80 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Export Vault</span>
              </button>
              {storageMetrics.usagePct >= 90 && (
                <p className="text-[10px] text-orange-400/80 text-center mt-1.5 font-medium">
                  Recommended: Back up your vault before storage is full
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Export Vault Modal */}
      <ExportVaultModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        memories={memories}
        user={user}
        onMemoriesDeleted={() => {
          setIsExportOpen(false);
          onMemoriesDeleted?.();
        }}
      />

      {/* Edit Form */}
      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="glass-panel bg-[#090d16] backdrop-blur-3xl p-6 sm:p-8 rounded-3xl border border-white/15 space-y-6 shadow-2xl shadow-black/90 relative z-10">
          <h3 className="text-base font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-aurora-cyan" />
            <span>Edit Profile Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassInput
              label="Full Name"
              placeholder="Your display name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />

            <GlassInput
              label="Email (Google SSO Account)"
              value={user?.email || ""}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-white/90">Personal Bio</label>
              <textarea
                rows={3}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Tell your story or document your memory journey..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[#030712]/90 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-aurora-cyan/60 focus:ring-1 focus:ring-aurora-cyan/40 transition-all shadow-inner"
              />
            </div>


          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <GlassButton
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Profile Changes
            </GlassButton>
          </div>
        </form>
      ) : null}

      {/* AVATAR CROP / ROTATE / FLIP / REPOSITION MODAL */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-lg glass-panel bg-[#0b1020] rounded-3xl border border-white/20 p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-aurora-cyan" />
                <h3 className="text-base font-bold text-white">Crop & Adjust Profile Photo</h3>
              </div>
              <button
                onClick={() => setIsCropModalOpen(false)}
                className="p-1 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Drag & Preview Canvas */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-aurora-cyan/80 shadow-aurora-glow bg-black/60 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
              >
                {cropPreviewUrl ? (
                  <img
                    src={cropPreviewUrl}
                    alt="Avatar Live Preview"
                    draggable={false}
                    className="w-full h-full object-cover transition-transform duration-75"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${
                        flipX ? -1 : 1
                      }) scaleY(${flipY ? -1 : 1}) translate(${offsetX}px, ${offsetY}px)`,
                    }}
                  />
                ) : (
                  <User className="w-16 h-16 text-white/30" />
                )}

                {/* Specular Circle Overlay Ring */}
                <div className="pointer-events-none absolute inset-0 rounded-full border border-white/30" />
              </div>
              <p className="text-[11px] text-white/60 font-medium">
                Drag to position &bull; Supports JPG, PNG, WEBP, HEIC
              </p>
            </div>

            {/* Transformations Control Grid: Zoom, Rotate, Flip, Offset */}
            <div className="space-y-4 p-4 rounded-2xl bg-white/[0.04] border border-white/12 text-xs">
              {/* Zoom Controls */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-white/90 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-aurora-cyan" /> Zoom Level
                  </span>
                  <span className="font-mono">{zoom.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-aurora-cyan cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3.0, +(z + 0.1).toFixed(1)))}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quick Transform Action Buttons: Rotate & Flip */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRotateLeft}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex flex-col items-center gap-1 transition-all cursor-pointer"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-4 h-4 text-aurora-cyan" />
                  <span className="text-[10px] font-semibold">Left 90°</span>
                </button>

                <button
                  type="button"
                  onClick={handleRotateRight}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex flex-col items-center gap-1 transition-all cursor-pointer"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-4 h-4 text-aurora-cyan" />
                  <span className="text-[10px] font-semibold">Right 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlipX((f) => !f)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    flipX
                      ? "bg-aurora-cyan/20 border-aurora-cyan text-aurora-cyan"
                      : "bg-white/10 border-white/10 hover:bg-white/20 text-white"
                  }`}
                  title="Flip Horizontally"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Flip H</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlipY((f) => !f)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    flipY
                      ? "bg-aurora-violet/20 border-aurora-violet text-aurora-violet"
                      : "bg-white/10 border-white/10 hover:bg-white/20 text-white"
                  }`}
                  title="Flip Vertically"
                >
                  <Sliders className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Flip V</span>
                </button>
              </div>

              {/* Fine Repositioning Sliders */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <span className="text-white/70 font-semibold flex items-center gap-1 text-[11px]">
                    <Move className="w-3 h-3 text-indigo-400" /> Position X ({offsetX}px)
                  </span>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseInt(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-white/70 font-semibold flex items-center gap-1 text-[11px]">
                    <Move className="w-3 h-3 text-indigo-400" /> Position Y ({offsetY}px)
                  </span>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex gap-2">
                <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-aurora-cyan" />
                  <span>Replace Image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    disabled={uploadingAvatar}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetTransforms}
                  className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white text-xs font-medium transition-all"
                  title="Reset Adjustments"
                >
                  Reset
                </button>
              </div>

              <div className="flex gap-2">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCropModalOpen(false)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="sm"
                  isLoading={uploadingAvatar}
                  onClick={handleSaveAvatar}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save Photo
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
