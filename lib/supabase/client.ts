import { createBrowserClient } from "@supabase/ssr";

const PROD_SUPABASE_URL = "https://ynjristkqkakfbubzywy.supabase.co";
const PROD_SUPABASE_ANON_KEY = "sb_publishable_t0XH0a4hlglJCOsjt7SvVA_6IxFevT6";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || PROD_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PROD_SUPABASE_ANON_KEY;
  return (
    Boolean(url) &&
    Boolean(key) &&
    !url.includes("placeholder") &&
    !key.includes("placeholder")
  );
}

// Persistent browser client singleton instance to maintain auth session headers permanently
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || PROD_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PROD_SUPABASE_ANON_KEY;

  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return clientInstance;
}
