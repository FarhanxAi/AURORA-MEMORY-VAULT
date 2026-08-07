import { Memory } from "./types";

export const PRESET_TAG_DICTIONARY: Record<string, string[]> = {
  Travel: ["travel", "trip", "tour", "journey", "vacation", "flight", "hotel", "airport", "passport", "sightseeing", "explore"],
  Friends: ["friend", "friends", "hangout", "buddy", "buddies", "squad", "reunion", "party", "get-together"],
  Family: ["family", "mom", "dad", "parents", "brother", "sister", "cousin", "home", "reunion", "relative"],
  School: ["school", "teacher", "classroom", "homework", "principal", "campus", "student", "classmate"],
  College: ["college", "university", "professor", "lecture", "campus", "semester", "dorm"],
  Madrasa: ["madrasa", "madrasah", "ustaad", "hifz", "quran", "islamic school", "deeni"],
  "Annual Day": ["annual day", "function", "stage", "performance", "annual event", "chief guest", "prize"],
  Birthday: ["birthday", "bday", "cake", "candles", "celebration", "gifts", "wishes"],
  Vacation: ["vacation", "resort", "holiday", "getaway", "beach", "mountains", "staycation"],
  Food: ["food", "dinner", "lunch", "breakfast", "cafe", "restaurant", "delicious", "cooking", "snack"],
  Festival: ["festival", "eid", "diwali", "christmas", "celebration", "festive", "festivities"],
  Prayer: ["prayer", "namaz", "salah", "dua", "tahajjud", "fajr", "praying", "worship"],
  Mosque: ["mosque", "masjid", "minaret", "jamaat", "jummah"],
  Achievement: ["achievement", "award", "win", "won", "success", "milestone", "passed", "trophy", "medal", "promotion"],
  Work: ["work", "office", "job", "meeting", "client", "project", "boss", "colleague", "deadline"],
  Study: ["study", "studying", "revision", "notes", "library", "exam", "test", "preparation"],
  Coding: ["code", "coding", "developer", "programming", "software", "bug", "git", "react", "nextjs", "python", "app"],
  Nature: ["nature", "trees", "forest", "sunset", "sunrise", "sky", "flowers", "greenery", "river", "lake"],
  Sports: ["sports", "football", "cricket", "match", "game", "run", "gym", "workout", "fitness"],
  Photography: ["photography", "photo", "camera", "click", "picture", "snapshot", "portrait"],
  Books: ["book", "books", "reading", "novel", "chapter", "author", "library"],
  Goals: ["goals", "resolution", "target", "dream", "planning", "vision", "habit"],
  Health: ["health", "hospital", "doctor", "recovery", "medicine", "wellness", "diet", "sleep"],
  Wedding: ["wedding", "marriage", "bride", "groom", "ceremony", "reception"],
  Shopping: ["shopping", "mall", "clothes", "store", "purchase", "bought"],
  Adventure: ["adventure", "trekking", "camping", "zipline", "climbing", "explore", "wild"],
  Love: ["love", "heart", "special someone", "date", "anniversary", "precious"],
  Childhood: ["childhood", "memories", "nostalgia", "kid", "old days", "growing up"],
  Parents: ["parents", "mother", "father", "mama", "papa", "blessing"],
  Graduation: ["graduation", "degree", "convocation", "graduated", "gown", "hat"],
  Exams: ["exam", "exams", "test", "results", "marks", "grades", "score"],
  Business: ["business", "startup", "revenue", "sales", "launch", "venture"],
  AI: ["ai", "artificial intelligence", "gemini", "chatgpt", "machine learning", "bot"],
  Technology: ["technology", "tech", "gadget", "laptop", "phone", "software", "hardware"],
  Gaming: ["gaming", "game", "playstation", "xbox", "pc gaming", "stream", "esports"],
  Movies: ["movie", "cinema", "film", "theater", "popcorn", "series", "show"],
  Music: ["music", "song", "concert", "melody", "playlist", "singing", "guitar"],
  Pets: ["pet", "cat", "dog", "kitten", "puppy", "animal", "vet"],
  Rain: ["rain", "monsoon", "raining", "rainy", "downpour", "thunder"],
  Winter: ["winter", "cold", "snow", "fog", "sweater", "jacket"],
  Summer: ["summer", "sunny", "heat", "sun", "warm", "pool"],
  Hiking: ["hiking", "hike", "trail", "mountain", "climb", "peak"],
  "Road Trip": ["road trip", "drive", "car", "highway", "biking", "ride"],
  Flight: ["flight", "plane", "airline", "boarding", "airport"],
  Hotel: ["hotel", "resort", "room", "stay", "airbnb"],
  Restaurant: ["restaurant", "cafe", "diner", "bistro", "eatery"],
};

export const POPULAR_SUGGESTED_TAGS = [
  "Travel", "Friends", "Family", "School", "College", "Madrasa",
  "Annual Day", "Birthday", "Vacation", "Food", "Festival", "Prayer",
  "Mosque", "Achievement", "Work", "Study", "Coding", "Nature",
  "Sports", "Photography", "Books", "Goals", "Health", "Wedding",
  "Shopping", "Adventure", "Love", "Childhood", "Parents", "Graduation",
  "Exams", "Business", "AI", "Technology", "Gaming", "Movies", "Music",
  "Pets", "Rain", "Winter", "Summer", "Hiking", "Road Trip", "Flight",
  "Hotel", "Restaurant"
];

// Topic Mappings
const TOPIC_RULES: { topic: string; keywords: string[] }[] = [
  { topic: "School Event", keywords: ["school", "annual day", "class", "teacher", "exam", "homework", "principal"] },
  { topic: "Travel", keywords: ["trip", "vacation", "flight", "hotel", "airport", "road trip", "resort", "tour", "beach"] },
  { topic: "Islamic", keywords: ["madrasa", "mosque", "masjid", "namaz", "prayer", "quran", "eid", "ramadan", "dua"] },
  { topic: "Achievement", keywords: ["award", "passed", "graduated", "trophy", "winner", "promotion", "milestone", "success"] },
  { topic: "Festival", keywords: ["eid", "festival", "celebration", "festive", "diwali", "christmas"] },
  { topic: "Family", keywords: ["family", "parents", "mom", "dad", "brother", "sister", "home"] },
  { topic: "Friendship", keywords: ["friends", "friend", "hangout", "squad", "reunion", "party"] },
  { topic: "Education", keywords: ["college", "university", "study", "exam", "degree", "lecture"] },
  { topic: "Work", keywords: ["office", "work", "job", "client", "project", "boss", "business", "coding"] },
  { topic: "Health", keywords: ["health", "hospital", "doctor", "workout", "fitness", "medicine", "recovery"] },
  { topic: "Life Update", keywords: ["today", "journal", "life", "thought", "feeling", "day", "memory"] },
];

/**
 * Analyzes journal title and content in real-time to return suggested tags and detected topic.
 */
export function analyzeJournalContent(title: string, content: string, currentTags: string[] = []) {
  const combinedText = `${title} ${content}`.toLowerCase();
  const matchedTags: string[] = [];

  // Find tags whose keywords match the text
  Object.entries(PRESET_TAG_DICTIONARY).forEach(([tag, keywords]) => {
    if (currentTags.includes(tag)) return; // skip existing
    const hasMatch = keywords.some((kw) => combinedText.includes(kw));
    if (hasMatch) {
      matchedTags.push(tag);
    }
  });

  // Detect Topic
  let detectedTopic = "Daily Diary";
  let highestScore = 0;

  TOPIC_RULES.forEach((rule) => {
    let score = 0;
    rule.keywords.forEach((kw) => {
      if (combinedText.includes(kw)) score += 1;
    });
    if (score > highestScore) {
      highestScore = score;
      detectedTopic = rule.topic;
    }
  });

  return {
    suggestedTags: matchedTags.slice(0, 12),
    detectedTopic,
  };
}

/**
 * Calculates reading metrics for journal text.
 */
export function calculateReadingMetrics(text: string | null | undefined) {
  if (!text || !text.trim()) {
    return { words: 0, characters: 0, readingTimeMinutes: 1 };
  }
  const cleanText = text.trim();
  const words = cleanText.split(/\s+/).filter(Boolean).length;
  const characters = cleanText.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  return {
    words,
    characters,
    readingTimeMinutes,
  };
}

/**
 * Formats date into day of week, full date, and strict 12-hour time (e.g. 02:56 PM).
 */
export function formatExactDateTime(d: Date) {
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const dayNum = String(d.getDate()).padStart(2, "0");
  const monthName = d.toLocaleDateString("en-US", { month: "long" });
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour becomes 12
  const hoursStr = String(hours).padStart(2, "0");

  return {
    dayAndDate: `${dayName} • ${dayNum} ${monthName} ${year}`,
    timeStr: `${hoursStr}:${minutes} ${ampm}`,
  };
}

export function formatJournalDateTime(dateStr?: string | null) {
  if (!dateStr) {
    return formatExactDateTime(new Date());
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { dayAndDate: String(dateStr), timeStr: "12:00 PM" };
    }
    return formatExactDateTime(d);
  } catch (e) {
    return { dayAndDate: String(dateStr || "Today"), timeStr: "12:00 PM" };
  }
}

/**
 * Complete Production Aurora Mood Library
 */
export const AURORA_MOODS = [
  // ─── Positive ───────────────────────────────────────────────────────────
  { value: "Happy",       emoji: "😊", label: "Happy",       group: "Positive" },
  { value: "Excited",     emoji: "😁", label: "Excited",     group: "Positive" },
  { value: "Celebrating", emoji: "🥳", label: "Celebrating", group: "Positive" },
  { value: "Loved",       emoji: "😍", label: "Loved",       group: "Positive" },
  { value: "Peaceful",    emoji: "😌", label: "Peaceful",    group: "Positive" },
  { value: "Inspired",    emoji: "🤩", label: "Inspired",    group: "Positive" },
  { value: "Grateful",    emoji: "🥹", label: "Grateful",    group: "Positive" },
  { value: "Motivated",   emoji: "💪", label: "Motivated",   group: "Positive" },
  { value: "Proud",       emoji: "😎", label: "Proud",       group: "Positive" },
  { value: "Comfortable", emoji: "🤗", label: "Comfortable", group: "Positive" },
  { value: "Blessed",     emoji: "😇", label: "Blessed",     group: "Positive" },
  { value: "Hopeful",     emoji: "🌸", label: "Hopeful",     group: "Positive" },
  { value: "Optimistic",  emoji: "✨", label: "Optimistic",  group: "Positive" },
  { value: "Joyful",      emoji: "🎉", label: "Joyful",      group: "Positive" },
  { value: "Content",     emoji: "💖", label: "Content",     group: "Positive" },
  // ─── Neutral ────────────────────────────────────────────────────────────
  { value: "Calm",        emoji: "😐", label: "Calm",        group: "Neutral" },
  { value: "Thoughtful",  emoji: "🤔", label: "Thoughtful",  group: "Neutral" },
  { value: "Reflective",  emoji: "📝", label: "Reflective",  group: "Neutral" },
  { value: "Tired",       emoji: "😴", label: "Tired",       group: "Neutral" },
  { value: "Normal",      emoji: "😶", label: "Normal",      group: "Neutral" },
  { value: "Relaxed",     emoji: "🧘", label: "Relaxed",     group: "Neutral" },
  { value: "Quiet",       emoji: "🌙", label: "Quiet",       group: "Neutral" },
  { value: "Focused",     emoji: "📖", label: "Focused",     group: "Neutral" },
  // ─── Negative ───────────────────────────────────────────────────────────
  { value: "Sad",         emoji: "😢", label: "Sad",         group: "Negative" },
  { value: "Heartbroken", emoji: "😭", label: "Heartbroken", group: "Negative" },
  { value: "Disappointed",emoji: "😞", label: "Disappointed",group: "Negative" },
  { value: "Lonely",      emoji: "😔", label: "Lonely",      group: "Negative" },
  { value: "Worried",     emoji: "😟", label: "Worried",     group: "Negative" },
  { value: "Stressed",    emoji: "😣", label: "Stressed",    group: "Negative" },
  { value: "Exhausted",   emoji: "😩", label: "Exhausted",   group: "Negative" },
  { value: "Angry",       emoji: "😤", label: "Angry",       group: "Negative" },
  { value: "Frustrated",  emoji: "😠", label: "Frustrated",  group: "Negative" },
  { value: "Anxious",     emoji: "😨", label: "Anxious",     group: "Negative" },
  { value: "Nervous",     emoji: "😰", label: "Nervous",     group: "Negative" },
  { value: "Confused",    emoji: "😶", label: "Confused",    group: "Negative" },
  { value: "Regretful",   emoji: "💔", label: "Regretful",   group: "Negative" },
  { value: "Overwhelmed", emoji: "😓", label: "Overwhelmed", group: "Negative" },
  { value: "Burned Out",  emoji: "😵", label: "Burned Out",  group: "Negative" },
  // ─── Mental Health ───────────────────────────────────────────────────────
  { value: "Empty",           emoji: "🫥", label: "Empty",           group: "Mental Health" },
  { value: "Depressed",       emoji: "🌧", label: "Depressed",       group: "Mental Health" },
  { value: "Hopeless",        emoji: "🥀", label: "Hopeless",        group: "Mental Health" },
  { value: "Guilty",          emoji: "😖", label: "Guilty",          group: "Mental Health" },
  { value: "Emotional",       emoji: "😢", label: "Emotional",       group: "Mental Health" },
  { value: "Seeking Comfort", emoji: "🫂", label: "Seeking Comfort", group: "Mental Health" },
  { value: "Lost",            emoji: "🌫", label: "Lost",            group: "Mental Health" },
  { value: "Panic",           emoji: "😵", label: "Panic",           group: "Mental Health" },
  { value: "Healing",         emoji: "🤍", label: "Healing",         group: "Mental Health" },
  { value: "Recovering",      emoji: "🌱", label: "Recovering",      group: "Mental Health" },
];

/** Groups for dropdown rendering */
export const AURORA_MOOD_GROUPS = ["Positive", "Neutral", "Negative", "Mental Health"] as const;

/**
 * Complete Production Aurora Category Library
 */
export const AURORA_CATEGORIES = [
  "Personal",
  "Family",
  "Friends",
  "School",
  "College",
  "Work",
  "Business",
  "Travel",
  "Vacation",
  "Adventure",
  "Nature",
  "Birthday",
  "Wedding",
  "Festival",
  "Achievement",
  "Sports",
  "Gaming",
  "Photography",
  "Books",
  "Movies",
  "Food",
  "Religion",
  "Ramadan",
  "Eid",
  "Madrasa",
  "Learning",
  "Programming",
  "Technology",
  "Finance",
  "Health",
  "Fitness",
  "Dreams",
  "Goals",
  "Childhood",
  "Relationship",
  "Pets",
  "Music",
  "Art",
  "Memories",
  "Graduation",
  "Custom",
];

export const MOOD_MAP: Record<string, { emoji: string; label: string }> = {};
AURORA_MOODS.forEach((m) => {
  MOOD_MAP[m.value.toLowerCase()] = { emoji: m.emoji, label: m.label };
});

export const DEFAULT_MOOD = { emoji: "😊", label: "Happy", full: "😊 Happy" };

export function getSafeMood(moodValue?: string | null): { emoji: string; label: string; full: string } {
  if (!moodValue || typeof moodValue !== "string" || !moodValue.trim()) {
    return DEFAULT_MOOD;
  }

  const clean = moodValue.trim();
  const lower = clean.toLowerCase();

  for (const item of AURORA_MOODS) {
    if (lower.includes(item.value.toLowerCase()) || lower.includes(item.label.toLowerCase())) {
      return { emoji: item.emoji, label: item.label, full: `${item.emoji} ${item.label}` };
    }
  }

  // If clean string has an emoji character
  if (/[\u{1F300}-\u{1F9FF}]/u.test(clean)) {
    const parts = clean.split(" ");
    const emoji = parts[0] || "😊";
    const label = parts.slice(1).join(" ") || clean;
    return { emoji, label, full: clean };
  }

  return { emoji: "😊", label: clean, full: `😊 ${clean}` };
}

/**
 * Robust Timestamp Extractor for Strict Sorting (created_at -> memory_date -> updated_at)
 */
export function getMemoryTimestamp(m?: Memory | null): number {
  if (!m) return 0;

  if (m.created_at) {
    const t = new Date(m.created_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  if (m.memory_date) {
    const t = new Date(m.memory_date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  if (m.updated_at) {
    const t = new Date(m.updated_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  return 0;
}

