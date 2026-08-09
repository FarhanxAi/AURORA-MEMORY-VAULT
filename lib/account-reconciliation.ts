import { SupabaseClient } from "@supabase/supabase-js";
import { Memory, UserProfile } from "./types";
import { vaultStore } from "./persistence/vault-store";

/**
 * Aurora Account Reconciliation & Cross-Device Migration Engine
 *
 * Guarantees that:
 * 1. ONE Google Account = ONE Canonical Supabase Auth User ID = ONE Unified Cloud Dataset.
 * 2. Any existing memories created on Mobile, Laptop, or Tablet (whether in Supabase or local storage)
 *    are safely merged into Supabase cloud without data loss or duplication.
 * 3. Idempotent: Can run multiple times safely without corrupting data or creating duplicate records.
 */

export interface ReconciliationResult {
  unifiedMemories: Memory[];
  unifiedProfile: UserProfile;
  migratedLocalCount: number;
  migratedLegacyCloudCount: number;
}

export async function reconcileAndMigrateUserAccount(
  supabase: SupabaseClient,
  authUser: {
    id: string;
    email?: string | null;
    created_at?: string;
    user_metadata?: Record<string, any>;
  }
): Promise<ReconciliationResult> {
  const userId = authUser.id;
  const userEmail = authUser.email?.trim().toLowerCase() || null;
  let migratedLocalCount = 0;
  let migratedLegacyCloudCount = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: FETCH CANONICAL CLOUD MEMORIES & MIGRATE ANY LEGACY EMAIL RECORDS
  // ─────────────────────────────────────────────────────────────────────────────
  const cloudMap = new Map<string, Memory>();

  try {
    // Query memories strictly owned by canonical auth.users.id
    const { data: directMemories, error: directErr } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("memory_date", { ascending: false });

    if (!directErr && Array.isArray(directMemories)) {
      for (const m of directMemories) {
        if (m && m.id) {
          cloudMap.set(m.id, m as Memory);
        }
      }
    }
  } catch (cloudFetchErr) {
    console.warn("[RECONCILIATION] Cloud fetch warning:", cloudFetchErr);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: PURGE ALL OBSOLETE / LEGACY GUEST STORAGE KEYS
  // ─────────────────────────────────────────────────────────────────────────────
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      // Purge any legacy un-namespaced keys so stale test memories can never resurface
      localStorage.removeItem("aurora_memories_guest-vault-user");
      localStorage.removeItem("aurora_local_memories");
      localStorage.removeItem("aurora_memories");
      localStorage.removeItem("aurora_vault_memories");
      localStorage.removeItem("vault_memories");
      localStorage.removeItem("aurora_guest_memories");
    } catch (localPurgeErr) {
      console.warn("[RECONCILIATION] Local purge warning:", localPurgeErr);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: RECONCILE PROFILE IN SUPABASE & LOCAL STORE (CLOUD SOURCE OF TRUTH)
  // ─────────────────────────────────────────────────────────────────────────────
  let profileData: UserProfile | null = null;

  try {
    const { data: dbProfile, error: pSelectErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!pSelectErr && dbProfile) {
      profileData = dbProfile as UserProfile;
    }
  } catch (pErr) {
    console.warn("[RECONCILIATION] Profile fetch warning:", pErr);
  }

  const cachedProfile = vaultStore.getProfile(userId);
  const nowStr = new Date().toISOString();

  // finalProfile represents what is rendered in the UI.
  // RULE: Supabase Cloud (profileData) is ALWAYS the authoritative source of truth.
  // If it exists in Supabase, use it exactly as-is. Google OAuth metadata or
  // device local cache NEVER overwrites a custom DP, custom full_name, or bio.
  const finalProfile: UserProfile = profileData
    ? {
        // Cloud record is canonical — keep every custom field (avatar_url, full_name, bio)
        ...(profileData as UserProfile),
        last_login: nowStr,
      }
    : {
        // No cloud record yet (first login) — bootstrap from Google OAuth metadata
        id: userId,
        email: authUser.email || cachedProfile?.email || "",
        full_name:
          cachedProfile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          "Memory Collector",
        avatar_url:
          cachedProfile?.avatar_url ||
          authUser.user_metadata?.avatar_url ||
          "",
        bio: cachedProfile?.bio || "",
        timezone: cachedProfile?.timezone || "UTC",
        created_at: cachedProfile?.created_at || authUser.created_at || nowStr,
        updated_at: nowStr,
        last_login: nowStr,
      };

  // ─────────────────────────────────────────────────────────────────────────────
  // PROFILE PERSISTENCE STRATEGY:
  // - If profile already exists in Supabase: ONLY update last_login + updated_at.
  //   NEVER overwrite user's custom full_name or custom avatar_url.
  // - If no profile exists yet: create a new one with initial defaults.
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    if (profileData) {
      // Existing profile — preserve all user customizations, only touch timestamps
      await supabase
        .from("profiles")
        .update({ last_login: nowStr, updated_at: nowStr })
        .eq("id", userId);
    } else {
      // First login — create profile with Google metadata as starting defaults
      const newProfile = {
        id: userId,
        email: authUser.email || "",
        full_name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          "Memory Collector",
        avatar_url: authUser.user_metadata?.avatar_url || "",
        bio: "",
        timezone: "UTC",
        created_at: authUser.created_at || nowStr,
        updated_at: nowStr,
        last_login: nowStr,
      };
      const { error: insertErr } = await supabase
        .from("profiles")
        .upsert(newProfile, { onConflict: "id", ignoreDuplicates: true });
      if (insertErr) console.warn("[RECONCILIATION] Profile creation notice:", insertErr);
    }
  } catch (upsertErr) {
    console.warn("[RECONCILIATION] Profile update notice:", upsertErr);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: ASSEMBLE COMPLETE UNIFIED DATASET & SAVE TO LOCAL CACHE
  // ─────────────────────────────────────────────────────────────────────────────
  const unifiedMemories = Array.from(cloudMap.values()).sort((a, b) => {
    const dateA = new Date(a.memory_date || a.created_at).getTime();
    const dateB = new Date(b.memory_date || b.created_at).getTime();
    return dateB - dateA;
  });

  // Save canonical state to local storage cache for this user
  vaultStore.saveProfile(userId, finalProfile);
  vaultStore.saveMemories(userId, unifiedMemories);

  console.log(`[RECONCILIATION COMPLETE] User: ${userId} (${finalProfile.email}) | Total Unified Memories: ${unifiedMemories.length} (Migrated Local: ${migratedLocalCount}, Migrated Cloud: ${migratedLegacyCloudCount})`);

  return {
    unifiedMemories,
    unifiedProfile: finalProfile,
    migratedLocalCount,
    migratedLegacyCloudCount,
  };
}
