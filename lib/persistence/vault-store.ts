import { UserProfile, Memory, Collection } from "@/lib/types";

class VaultPersistenceEngine {
  private getStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  // --- PROFILE PERSISTENCE ---
  saveProfile(userId: string, profile: UserProfile): void {
    const storage = this.getStorage();
    if (!storage || !userId) return;
    try {
      const key = `aurora_profile_${userId}`;
      const existing = this.getProfile(userId);

      // Preserve immutable creation date permanently across all logins
      const permanentCreatedAt = existing?.created_at || profile.created_at || new Date().toISOString();
      const updatedProfile: UserProfile = {
        ...profile,
        created_at: permanentCreatedAt,
      };

      // Set member since key in localStorage ONCE ONLY (Namespaced per user)
      const memberSinceKey = `aurora_member_since_${userId}`;
      if (!storage.getItem(memberSinceKey)) {
        storage.setItem(memberSinceKey, permanentCreatedAt);
      }

      // Record latest login timestamp (Namespaced per user)
      const lastLoginKey = `aurora_last_login_${userId}`;
      storage.setItem(lastLoginKey, new Date().toISOString());

      storage.setItem(key, JSON.stringify(updatedProfile));
    } catch (err) {
      console.warn("VaultStore saveProfile notice:", err);
    }
  }

  getProfile(userId: string): UserProfile | null {
    const storage = this.getStorage();
    if (!storage || !userId) return null;
    try {
      const key = `aurora_profile_${userId}`;
      const raw = storage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as UserProfile;
      }
    } catch (err) {
      console.warn("VaultStore getProfile notice:", err);
    }
    return null;
  }

  deleteProfile(userId: string): void {
    const storage = this.getStorage();
    if (!storage || !userId) return;
    try {
      storage.removeItem(`aurora_profile_${userId}`);
      storage.removeItem(`aurora_member_since_${userId}`);
      storage.removeItem(`aurora_last_login_${userId}`);
    } catch (err) {
      console.warn("VaultStore deleteProfile notice:", err);
    }
  }

  // --- MEMORIES PERSISTENCE ---
  saveMemories(userId: string, memories: Memory[]): void {
    const storage = this.getStorage();
    if (!storage || !userId) return;
    try {
      // STRICT USER ISOLATION: Filter memories to verify they belong exclusively to this userId
      const userMemories = (memories || []).filter((m) => m && (!m.user_id || m.user_id === userId));
      const key = `aurora_memories_${userId}`;
      storage.setItem(key, JSON.stringify(userMemories));
    } catch (err) {
      console.warn("VaultStore saveMemories notice:", err);
    }
  }

  getMemories(userId: string): Memory[] {
    const storage = this.getStorage();
    if (!storage || !userId) return [];
    try {
      const key = `aurora_memories_${userId}`;
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Memory[];
        if (Array.isArray(parsed)) {
          // Filter strictly to userId to prevent cross-account leaks
          return parsed.filter((m) => m && (!m.user_id || m.user_id === userId));
        }
      }
    } catch (err) {
      console.warn("VaultStore getMemories notice:", err);
    }
    return [];
  }

  saveMemoryItem(userId: string, memory: Memory): void {
    const storage = this.getStorage();
    if (!storage || !userId || !memory) return;
    try {
      const existing = this.getMemories(userId);
      const index = existing.findIndex((m) => m.id === memory.id);
      if (index >= 0) {
        existing[index] = memory;
      } else {
        existing.unshift(memory);
      }
      this.saveMemories(userId, existing);
    } catch (err) {
      console.warn("VaultStore saveMemoryItem notice:", err);
    }
  }

  deleteMemoryItem(userId: string, memoryId: string): void {
    const storage = this.getStorage();
    if (!storage || !userId || !memoryId) return;
    try {
      const existing = this.getMemories(userId);
      const filtered = existing.filter((m) => m.id !== memoryId);
      this.saveMemories(userId, filtered);
    } catch (err) {
      console.warn("VaultStore deleteMemoryItem notice:", err);
    }
  }

  // --- LOGOUT / ACCOUNT SWITCH CLEANUP ---
  clearSessionCachesOnLogout(): void {
    const storage = this.getStorage();
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.clear();
      }
      if (storage) {
        // Purge any legacy un-namespaced global keys to ensure complete isolation
        storage.removeItem("aurora_tags");
        storage.removeItem("aurora_locations");
        storage.removeItem("aurora_recent_activity");
        storage.removeItem("aurora_search_history");
      }
    } catch (err) {
      console.warn("VaultStore clearSessionCachesOnLogout notice:", err);
    }
  }

  /**
   * Wipes ALL aurora_* keys that belong to a DIFFERENT user.
   * Called on login so stale data from a previous session (or a
   * different account on the same device) can never leak into the UI.
   */
  purgeOtherUserCaches(currentUserId: string): void {
    const storage = this.getStorage();
    if (!storage || !currentUserId) return;
    try {
      const keysToRemove: string[] = [];
      const len = storage.length;
      for (let i = 0; i < len; i++) {
        const key = storage.key(i);
        if (!key) continue;
        // Only touch aurora-namespaced keys
        if (!key.startsWith("aurora_")) continue;
        // Keep keys belonging to the current user
        if (key.includes(`_${currentUserId}`)) continue;
        // Everything else is another user's data — mark for removal
        keysToRemove.push(key);
      }
      for (const key of keysToRemove) {
        storage.removeItem(key);
      }
    } catch (err) {
      console.warn("VaultStore purgeOtherUserCaches notice:", err);
    }
  }

  deleteUserVault(userId: string): void {
    const storage = this.getStorage();
    if (!storage || !userId) return;
    try {
      storage.removeItem(`aurora_profile_${userId}`);
      storage.removeItem(`aurora_memories_${userId}`);
      storage.removeItem(`aurora_collections_${userId}`);
      storage.removeItem(`aurora_tags_${userId}`);
      storage.removeItem(`aurora_locations_${userId}`);
      storage.removeItem(`aurora_member_since_${userId}`);
      storage.removeItem(`aurora_last_login_${userId}`);
    } catch (err) {
      console.warn("VaultStore deleteUserVault notice:", err);
    }
  }
}

export const vaultStore = new VaultPersistenceEngine();
