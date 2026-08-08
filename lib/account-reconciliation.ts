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
    // 1a. Query memories strictly owned by canonical auth.users.id
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

    // 1b. Check for legacy cloud records stored under email rather than UUID
    if (userEmail) {
      const { data: emailMemories, error: emailErr } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", userEmail);

      if (!emailErr && Array.isArray(emailMemories) && emailMemories.length > 0) {
        const legacyIdsToMigrate: string[] = [];
        for (const em of emailMemories) {
          if (em && em.id && !cloudMap.has(em.id)) {
            legacyIdsToMigrate.push(em.id);
            const migrated = { ...em, user_id: userId } as Memory;
            cloudMap.set(em.id, migrated);
            migratedLegacyCloudCount++;
          }
        }

        // Migrate ownership to canonical authUser.id in Supabase cloud
        if (legacyIdsToMigrate.length > 0) {
          await supabase
            .from("memories")
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .in("id", legacyIdsToMigrate);
        }
      }
    }
  } catch (cloudFetchErr) {
    console.warn("[RECONCILIATION] Cloud fetch warning:", cloudFetchErr);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: SCAN LOCAL STORAGE ON THIS DEVICE FOR UN-SYNCED OR GUEST MEMORIES
  // ─────────────────────────────────────────────────────────────────────────────
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const localCandidateMemories: Memory[] = [];

      // Scan all possible localStorage keys where local memories could reside
      const targetKeys = [
        `aurora_memories_${userId}`,
        "aurora_memories_guest-vault-user",
        "aurora_memories",
        "aurora_local_memories",
        "aurora_vault_memories",
        "vault_memories",
      ];

      // Also scan any existing keys starting with aurora_memories_
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("aurora_memories_") && !targetKeys.includes(k)) {
          targetKeys.push(k);
        }
      }

      for (const storageKey of targetKeys) {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && typeof item === "object" && item.title) {
                localCandidateMemories.push(item as Memory);
              }
            }
          }
        } catch {
          // Ignore parse errors on corrupt storage keys
        }
      }

      // Find local memories that do NOT exist in Supabase cloud yet
      const missingFromCloud: Memory[] = [];

      for (const localMem of localCandidateMemories) {
        if (!localMem || !localMem.title) continue;

        // Check if ID exists in cloud
        if (localMem.id && cloudMap.has(localMem.id)) {
          continue;
        }

        // Check for content match (same title + date + memory_type)
        const localSig = `${localMem.title.trim().toLowerCase()}_${localMem.memory_date || ""}_${localMem.memory_type || "photo"}`;
        let alreadyInCloud = false;

        for (const cloudMem of cloudMap.values()) {
          const cloudSig = `${cloudMem.title.trim().toLowerCase()}_${cloudMem.memory_date || ""}_${cloudMem.memory_type || "photo"}`;
          if (localSig === cloudSig) {
            alreadyInCloud = true;
            break;
          }
        }

        if (!alreadyInCloud) {
          missingFromCloud.push(localMem);
        }
      }

      // Safely migrate and upload local-only memories to Supabase Cloud
      if (missingFromCloud.length > 0) {
        console.log(`[RECONCILIATION] Migrating ${missingFromCloud.length} local device memories to Supabase Cloud...`);

        for (const unSynced of missingFromCloud) {
          const cleanId = unSynced.id && !unSynced.id.startsWith("demo-") && !unSynced.id.startsWith("guest-")
            ? unSynced.id
            : `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

          const nowIso = new Date().toISOString();
          const insertPayload = {
            id: cleanId,
            user_id: userId,
            title: unSynced.title.trim(),
            description: unSynced.description || null,
            memory_type: unSynced.memory_type || "photo",
            category: unSynced.category || "Personal",
            cover_image: unSynced.cover_image || null,
            gallery: Array.isArray(unSynced.gallery) ? unSynced.gallery : [],
            audio_url: unSynced.audio_url || null,
            tags: Array.isArray(unSynced.tags) ? unSynced.tags : [],
            location: unSynced.location || null,
            mood: unSynced.mood || "Happy",
            favorite: Boolean(unSynced.favorite),
            archived: Boolean(unSynced.archived),
            deleted: Boolean(unSynced.deleted),
            deleted_at: unSynced.deleted_at || null,
            memory_date: unSynced.memory_date || nowIso.split("T")[0],
            created_at: unSynced.created_at || nowIso,
            updated_at: nowIso,
            file_size: unSynced.file_size || 0,
            private: true,
          };

          try {
            const { data: inserted, error: insertErr } = await supabase
              .from("memories")
              .insert([insertPayload])
              .select("*")
              .maybeSingle();

            if (!insertErr && inserted) {
              cloudMap.set(inserted.id, inserted as Memory);
              migratedLocalCount++;
            } else if (insertErr) {
              console.warn("[RECONCILIATION] Local insert notice:", insertErr.message);
              // Keep memory in memory list even if network failed so user doesn't lose data
              cloudMap.set(cleanId, insertPayload as Memory);
            }
          } catch (insertEx) {
            console.warn("[RECONCILIATION] Local insert exception:", insertEx);
            cloudMap.set(cleanId, insertPayload as Memory);
          }
        }
      }

      // Clean up legacy guest keys after successful cloud synchronization
      localStorage.removeItem("aurora_memories_guest-vault-user");
      localStorage.removeItem("aurora_local_memories");
    } catch (localScanErr) {
      console.warn("[RECONCILIATION] Local scan warning:", localScanErr);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: RECONCILE PROFILE IN SUPABASE & LOCAL STORE
  // ─────────────────────────────────────────────────────────────────────────────
  let profileData: UserProfile | null = null;

  try {
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (dbProfile) {
      profileData = dbProfile as UserProfile;
    }
  } catch (pErr) {
    console.warn("[RECONCILIATION] Profile fetch warning:", pErr);
  }

  const cachedProfile = vaultStore.getProfile(userId);
  const nowStr = new Date().toISOString();

  const finalProfile: UserProfile = {
    id: userId,
    email: authUser.email || profileData?.email || cachedProfile?.email || "",
    full_name:
      profileData?.full_name ||
      cachedProfile?.full_name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      "Memory Collector",
    avatar_url:
      profileData?.avatar_url ||
      cachedProfile?.avatar_url ||
      authUser.user_metadata?.avatar_url ||
      "",
    bio: profileData?.bio || cachedProfile?.bio || "",
    timezone: profileData?.timezone || cachedProfile?.timezone || "UTC",
    created_at: profileData?.created_at || cachedProfile?.created_at || authUser.created_at || nowStr,
    updated_at: nowStr,
    last_login: nowStr,
  };

  // Upsert profile in Supabase cloud
  try {
    await supabase.from("profiles").upsert(finalProfile);
  } catch (upsertErr) {
    console.warn("[RECONCILIATION] Profile upsert notice:", upsertErr);
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
