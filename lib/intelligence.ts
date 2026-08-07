import { Memory, InsightMetrics } from "./types";

/**
 * Calculates comprehensive real-time metrics for the Insights page from Supabase memories.
 * Automatically computes analytics using the complete available memory history.
 */
export function calculateInsightMetrics(memories: Memory[]): InsightMetrics {
  const activeMemories = memories.filter((m) => !m.deleted);

  const totalMemories = activeMemories.length;
  const favoriteCount = activeMemories.filter((m) => m.favorite).length;
  const photosCount = activeMemories.filter((m) => m.memory_type === "photo").length;
  const journalsCount = activeMemories.filter((m) => m.memory_type === "journal").length;

  // Month & Year calculations
  const monthCounts: Record<string, number> = {};
  const yearCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};
  const moodCounts: Record<string, number> = {};

  activeMemories.forEach((mem) => {
    const d = new Date(mem.memory_date || mem.created_at);
    if (!isNaN(d.getTime())) {
      const monthKey = d.toLocaleString("default", { month: "long", year: "numeric" });
      const yearKey = d.getFullYear().toString();
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      yearCounts[yearKey] = (yearCounts[yearKey] || 0) + 1;
    }

    // Tags
    if (Array.isArray(mem.tags)) {
      mem.tags.forEach((tag) => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag) {
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        }
      });
    }

    // Location
    if (mem.location) {
      const loc = mem.location.trim();
      if (loc) {
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }
    }

    // Mood
    if (mem.mood) {
      const mood = mem.mood.trim();
      if (mood) {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      }
    }
  });

  // Find most active month
  let mostActiveMonth = "N/A";
  let mostActiveMonthCount = 0;
  Object.entries(monthCounts).forEach(([m, count]) => {
    if (count > mostActiveMonthCount) {
      mostActiveMonthCount = count;
      mostActiveMonth = m;
    }
  });

  // Find most active year
  let mostActiveYear = "N/A";
  let mostActiveYearCount = 0;
  Object.entries(yearCounts).forEach(([y, count]) => {
    if (count > mostActiveYearCount) {
      mostActiveYearCount = count;
      mostActiveYear = y;
    }
  });

  // Top tags sorted
  const mostUsedTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Most visited location
  let mostVisitedLocation = "No Locations Logged";
  let maxLocCount = 0;
  Object.entries(locationCounts).forEach(([loc, count]) => {
    if (count > maxLocCount) {
      maxLocCount = count;
      mostVisitedLocation = `${loc} (${count} ${count === 1 ? "memory" : "memories"})`;
    }
  });

  // Average memories per month
  const uniqueMonthsCount = Object.keys(monthCounts).length || 1;
  const avgMemoriesPerMonth = Number((totalMemories / uniqueMonthsCount).toFixed(1));

  // Mood breakdown
  const moodBreakdown = Object.entries(moodCounts)
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalMemories,
    favoriteCount,
    photosCount,
    journalsCount,
    mostActiveMonth,
    mostActiveMonthCount,
    mostActiveYear,
    mostActiveYearCount,
    mostUsedTags,
    mostVisitedLocation,
    avgMemoriesPerMonth,
    moodBreakdown,
  };
}


/**
 * Searches memories across Title, Description, Tags, Location, Mood, Category, Date, and Media Type.
 */
export function filterSmartSearch(memories: Memory[], query: string): Memory[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return memories.filter((m) => !m.deleted);

  const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

  return memories
    .filter((m) => !m.deleted)
    .filter((m) => {
      const title = (m.title || "").toLowerCase();
      const description = (m.description || "").toLowerCase();
      const tags = (m.tags || []).join(" ").toLowerCase();
      const location = (m.location || "").toLowerCase();
      const mood = (m.mood || "").toLowerCase();
      const category = (m.category || "").toLowerCase();
      const date = (m.memory_date || m.created_at || "").toLowerCase();
      const mediaType = (m.memory_type || "").toLowerCase();

      const combinedText = `${title} ${description} ${tags} ${location} ${mood} ${category} ${date} ${mediaType}`;

      // All terms in query must match somewhere in combined text
      return queryTerms.every((term) => combinedText.includes(term));
    });
}

/**
 * Known geographic locations fallback map for rendering markers on Leaflet
 */
const KNOWN_LOCATIONS: Record<string, [number, number]> = {
  "paris": [48.8566, 2.3522],
  "paris, france": [48.8566, 2.3522],
  "london": [51.5074, -0.1278],
  "london, uk": [51.5074, -0.1278],
  "new york": [40.7128, -74.0060],
  "new york, usa": [40.7128, -74.0060],
  "san francisco": [37.7749, -122.4194],
  "san francisco, ca": [37.7749, -122.4194],
  "tokyo": [35.6762, 139.6503],
  "tokyo, japan": [35.6762, 139.6503],
  "los angeles": [34.0522, -118.2437],
  "sydney": [-33.8688, 151.2093],
  "rome": [41.9028, 12.4964],
  "berlin": [52.5200, 13.4050],
  "barcelona": [41.3851, 2.1734],
  "dubai": [25.2048, 55.2708],
  "toronto": [43.6532, -79.3832],
  "singapore": [1.3521, 103.8198],
  "amsterdam": [52.3676, 4.9041],
  "kyoto": [35.0116, 135.7681],
  "hawaii": [21.3069, -157.8583],
  "bali": [-8.4095, 115.1889],
  "mumbai": [19.0760, 72.8777],
  "delhi": [28.6139, 77.2090],
  "karachi": [24.8607, 67.0011],
  "lahore": [31.5204, 74.3587],
  "islamabad": [33.6844, 73.0479],
};

/**
 * Resolves location string or lat,lng pair into latitude & longitude coordinates.
 */
export function resolveLocationCoordinates(locationStr: string | null): [number, number] | null {
  if (!locationStr || !locationStr.trim()) return null;

  const str = locationStr.trim();

  // Check if coordinates format "37.7749, -122.4194" or "37.7749,-122.4194"
  const coordMatch = str.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[3]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }

  // Lookup in known locations map
  const cleanKey = str.toLowerCase();
  if (KNOWN_LOCATIONS[cleanKey]) {
    return KNOWN_LOCATIONS[cleanKey];
  }

  // Check partial key matches
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (cleanKey.includes(key) || key.includes(cleanKey)) {
      return coords;
    }
  }

  // Hash pseudo-coordinate generator for any unrecognized string (e.g. "Grandma's House")
  // generates deterministically placed coordinates on world map so every location gets rendered cleanly!
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const pseudoLat = (Math.abs(hash) % 120) - 60; // -60 to +60
  const pseudoLng = (Math.abs(hash * 31) % 360) - 180; // -180 to +180
  return [Number(pseudoLat.toFixed(4)), Number(pseudoLng.toFixed(4))];
}
