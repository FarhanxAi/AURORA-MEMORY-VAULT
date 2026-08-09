import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aurora-memory-vault.pages.dev";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/auth/",
          "/auth/callback",
          "/auth/confirm",
          "/api/",
          "/_next/",
          "/reset-password",
          "/forgot-password",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/auth/",
          "/auth/callback",
          "/auth/confirm",
          "/api/",
          "/_next/",
          "/reset-password",
          "/forgot-password",
        ],
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/auth/",
          "/auth/callback",
          "/auth/confirm",
          "/api/",
          "/_next/",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
