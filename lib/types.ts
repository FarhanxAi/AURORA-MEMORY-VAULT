export type MemoryType = "photo" | "journal";

export interface Memory {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  memory_type: MemoryType;
  category: string;
  cover_image: string | null;
  gallery: string[];
  audio_url: string | null;
  tags: string[];
  location: string | null;
  mood: string | null;
  favorite: boolean;
  private: boolean;
  archived: boolean;
  deleted: boolean;
  deleted_at: string | null;
  memory_date: string;
  created_at: string;
  updated_at: string;
  file_size?: number;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  created_at: string;
  item_count?: number;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  memory_id: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  timezone?: string | null;
  created_at: string;
  updated_at: string;
  last_login: string;
}

export interface UserSettings {
  user_id: string;
  theme: string;
  date_format: string;
  time_format: string;
  email_notifications: boolean;
  memory_reminders: boolean;
  weekly_summary: boolean;
  security_alerts: boolean;
  private_by_default: boolean;
  auto_lock: boolean;
  session_timeout: string;
  updated_at: string;
}

export interface ExportVaultData {
  exported_at: string;
  version: string;
  profile: UserProfile | null;
  settings: UserSettings | null;
  memories: Memory[];
  collections: Collection[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "success" | "info" | "warning" | "error";
  read: boolean;
}

export interface RecentActivityItem {
  id: string;
  user_id: string;
  memory_id: string;
  action_type: "opened" | "edited" | "created";
  timestamp: string;
  memory?: Memory;
}

export interface PinnedCollection {
  id: string;
  user_id: string;
  collection_key: string;
  created_at: string;
}

export interface SmartCollectionDef {
  key: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  badgeColor: string;
  filterFn: (memories: Memory[]) => Memory[];
}

export interface InsightMetrics {
  totalMemories: number;
  favoriteCount: number;
  photosCount: number;
  journalsCount: number;
  mostActiveMonth: string;
  mostActiveMonthCount: number;
  mostActiveYear: string;
  mostActiveYearCount: number;
  mostUsedTags: { tag: string; count: number }[];
  mostVisitedLocation: string;
  avgMemoriesPerMonth: number;
  moodBreakdown: { mood: string; count: number }[];
}

