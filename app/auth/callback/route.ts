import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const errorCode = searchParams.get("error_code");

  console.log("=== OAUTH CALLBACK RECEIVED ===");
  console.log("Full Request URL:", request.url);
  console.log("SearchParams - code:", code ? `${code.substring(0, 10)}...` : "null");
  console.log("SearchParams - error:", errorParam);
  console.log("SearchParams - error_code:", errorCode);
  console.log("SearchParams - error_description:", errorDescription);

  // Determine base origin (strictly enforce localhost:3000, never 0.0.0.0)
  let baseOrigin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  if (baseOrigin.includes("0.0.0.0")) {
    baseOrigin = baseOrigin.replace("0.0.0.0", "localhost");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  const redirectResponse = NextResponse.redirect(`${baseOrigin}${next}`);

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
    console.log("Attempting exchangeCodeForSession with code:", `${code.substring(0, 10)}...`);
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log("OAuth Code Exchange Successful! Redirecting to:", `${baseOrigin}${next}`);
      if (sessionData?.user) {
        // Asynchronous non-blocking profile synchronization for instant OAuth redirect speed
        (async () => {
          try {
            await supabase.from("profiles").upsert({
              id: sessionData.user.id,
              email: sessionData.user.email || "",
              full_name:
                sessionData.user.user_metadata?.full_name ||
                sessionData.user.user_metadata?.name ||
                "Vault Explorer",
              avatar_url: sessionData.user.user_metadata?.avatar_url || "",
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
            });
          } catch (e) {
            console.error("Profile initialization background error during OAuth callback:", e);
          }
        })();
      }
      return redirectResponse;
    } else {
      console.error("OAuth code exchange error from Supabase:", error.message);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        console.log("User already authenticated via session cookie. Redirecting to dashboard.");
        return redirectResponse;
      }
      const msg = encodeURIComponent(error.message);
      return NextResponse.redirect(`${baseOrigin}/login?error=${msg}`);
    }
  }

  // 2. Fallback check: user already authenticated via cookies
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      console.log("Existing user session found. Redirecting to dashboard.");
      return redirectResponse;
    }
  } catch (err) {
    console.error("Callback user check error:", err);
  }

  // 3. Handle explicit OAuth errors from provider / Supabase
  if (errorParam || errorDescription) {
    console.error("Supabase OAuth Error Callback Payload:", {
      errorParam,
      errorCode,
      errorDescription,
    });
    const msg = encodeURIComponent(errorDescription || errorParam || "oauth_failed");
    return NextResponse.redirect(`${baseOrigin}/login?error=${msg}`);
  }

  return NextResponse.redirect(`${baseOrigin}/login?error=oauth_failed`);
}
