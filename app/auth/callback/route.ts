import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const errorCode = searchParams.get("error_code");

  // Determine dynamic origin based on request headers (Cloudflare & edge friendly)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const baseOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : request.nextUrl.origin;

  const targetUrl = new URL(next, baseOrigin);
  const redirectResponse = NextResponse.redirect(targetUrl);

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ynjristkqkakfbubzywy.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_t0XH0a4hlglJCOsjt7SvVA_6IxFevT6";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          redirectResponse.cookies.set(
            name,
            value,
            options as Parameters<typeof redirectResponse.cookies.set>[2]
          );
        });
      },
    },
  });

  // 1. If authorization code is present, exchange it for a session
  if (code) {
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData?.user) {
      // Profile initialization (strictly preserves user's custom name and DP across all devices)
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", sessionData.user.id)
          .maybeSingle();

        if (existingProfile) {
          // Preserve user's custom profile across all devices, updating only email and last_login
          await supabase
            .from("profiles")
            .update({
              email: sessionData.user.email || undefined,
              last_login: new Date().toISOString(),
            })
            .eq("id", sessionData.user.id);
        } else {
          // First time profile creation for brand new user
          await supabase.from("profiles").insert({
            id: sessionData.user.id,
            email: sessionData.user.email || "",
            full_name:
              sessionData.user.user_metadata?.full_name ||
              sessionData.user.user_metadata?.name ||
              "Vault Explorer",
            avatar_url: sessionData.user.user_metadata?.avatar_url || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Profile synchronization error during OAuth callback:", e);
      }

      return redirectResponse;
    } else {
      // Fallback: check if session cookie is already active
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        return redirectResponse;
      }

      const msg = encodeURIComponent(error?.message || "Authentication code exchange failed");
      return NextResponse.redirect(new URL(`/login?error=${msg}`, baseOrigin));
    }
  }

  // 2. Check existing user session from cookie
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return redirectResponse;
    }
  } catch (err) {
    console.error("Callback user check error:", err);
  }

  // 3. Handle explicit OAuth error params
  if (errorParam || errorDescription) {
    const msg = encodeURIComponent(errorDescription || errorParam || "oauth_failed");
    return NextResponse.redirect(new URL(`/login?error=${msg}`, baseOrigin));
  }

  return NextResponse.redirect(new URL("/login?error=oauth_failed", baseOrigin));
}
