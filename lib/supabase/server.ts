import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const PROD_SUPABASE_URL = "https://ynjristkqkakfbubzywy.supabase.co";
const PROD_SUPABASE_ANON_KEY = "sb_publishable_t0XH0a4hlglJCOsjt7SvVA_6IxFevT6";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || PROD_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PROD_SUPABASE_ANON_KEY;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch {
          // Handled when called from Server Component
        }
      },
    },
  });
}
