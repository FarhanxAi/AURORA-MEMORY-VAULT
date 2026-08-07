import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    });

    const pathname = request.nextUrl.pathname;

    const protectedPaths = [
      "/dashboard",
      "/profile",
      "/add-memory",
      "/settings",
      "/insights",
      "/timeline",
      "/calendar",
      "/gallery",
      "/map",
      "/collections",
      "/search",
    ];

    const isProtectedRoute = protectedPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
    const isAuthRoute = pathname === "/login" || pathname === "/signup";

    // Quick auth cookie check
    const hasAuthCookie = request.cookies.getAll().some((c) => c.name.includes("sb-"));

    // Fast-path: If user has no auth cookie and is visiting an auth route or static page, skip remote network call
    if (!hasAuthCookie && isAuthRoute) {
      return supabaseResponse;
    }

    // 800ms fast timeout race for auth check
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null }; error: null }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: null }), 800)
    );

    const {
      data: { user },
    } = await Promise.race([userPromise, timeoutPromise]);

    if (!user && !hasAuthCookie && isProtectedRoute) {
      const url = request.nextUrl.clone();
      if (url.hostname.includes("0.0.0.0") || url.hostname.includes("127.0.0.1")) {
        url.hostname = "localhost";
      }
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);

      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, { path: "/" });
      });
      return redirectResponse;
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      if (url.hostname.includes("0.0.0.0") || url.hostname.includes("127.0.0.1")) {
        url.hostname = "localhost";
      }
      url.pathname = "/dashboard";

      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, { path: "/" });
      });
      return redirectResponse;
    }
  } catch (e) {
    console.error("Middleware session update error (handled safely):", e);
  }

  return supabaseResponse;
}
