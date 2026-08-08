import { UserProfile, Memory, Collection } from "@/lib/types";

class VaultPersistenceEngine {
  private isClient = typeof window !== "undefined";

  // --- PROFILE PERSISTENCE ---
  saveProfile(userId: string, profile: UserProfile): void {
    if (!this.isClient || !userId) return;
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
      if (!localStorage.getItem(memberSinceKey)) {
        localStorage.setItem(memberSinceKey, permanentCreatedAt);
      }

      // Record latest login timestamp (Namespaced per user)
      const lastLoginKey = `aurora_last_login_${userId}`;
      localStorage.setItem(lastLoginKey, new Date().toISOString());

      localStorage.setItem(key, JSON.stringify(updatedProfile));
    } catch (err) {
      console.warn("VaultStore saveProfile notice:", err);
    }
  }

  getProfile(userId: string): UserProfile | null {
    if (!this.isClient || !userId) return null;
    try {
      const key = `aurora_profile_${userId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as UserProfile;
      }
    } catch (err) {
      console.warn("VaultStore getProfile notice:", err);
    }
    return null;
  }

  deleteProfile(userId: string): void {
    if (!this.isClient || !userId) return;
    try {
      localStorage.removeItem(`aurora_profile_${userId}`);
      localStorage.removeItem(`aurora_member_since_${userId}`);
      localStorage.removeItem(`aurora_last_login_${userId}`);
    } catch (err) {
      console.warn("VaultStore deleteProfile notice:", err);
    }
  }

  // --- MEMORIES PERSISTENCE ---
  saveMemories(userId: string, memories: Memory[]): void {
    if (!this.isClient || !userId) return;
    try {
      // STRICT USER ISOLATION: Filter memories to verify they belong exclusively to this userId
      const userMemories = memories.filter((m) => !m.user_id || m.user_id === userId);
      const key = `aurora_memories_${userId}`;
      localStorage.setItem(key, JSON.stringify(userMemories));
    } catch (err) {
      console.warn("VaultStore saveMemories notice:", err);
    }
  }

  getMemories(userId: string): Memory[] {
    if (!this.isClient || !userId) return [];
    try {
      const key = `aurora_memories_${userId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Memory[];
        // Filter strictly to userId to prevent cross-account leaks
        return parsed.filter((m) => !m.user_id || m.user_id === userId);
      }
    } catch (err) {
      console.warn("VaultStore getMemories notice:", err);
    }
    return [];
  }

  saveMemoryItem(userId: string, memory: Memory): void {
    if (!this.isClient || !userId) return;
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
    if (!this.isClient || !userId) return;
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
    if (!this.isClient) return;
    try {
      sessionStorage.clear();
      // Purge any legacy un-namespaced global keys to ensure complete isolation
      localStorage.removeItem("aurora_tags");
      localStorage.removeItem("aurora_locations");
      localStorage.removeItem("aurora_recent_activity");
      localStorage.removeItem("aurora_search_history");
    } catch (err) {
      console.warn("VaultStore clearSessionCachesOnLogout notice:", err);
    }
  }

  deleteUserVault(userId: string): void {
    if (!this.isClient || !userId) return;
    try {
      localStorage.removeItem(`aurora_profile_${userId}`);
      localStorage.removeItem(`aurora_memories_${userId}`);
      localStorage.removeItem(`aurora_collections_${userId}`);
      localStorage.removeItem(`aurora_tags_${userId}`);
      localStorage.removeItem(`aurora_locations_${userId}`);
      localStorage.removeItem(`aurora_member_since_${userId}`);
      localStorage.removeItem(`aurora_last_login_${userId}`);
    } catch (err) {
      console.warn("VaultStore deleteUserVault notice:", err);
    }
  }
}

export const vaultStore = new VaultPersistenceEngine();
