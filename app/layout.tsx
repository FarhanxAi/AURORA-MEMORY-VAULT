import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/toast-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aurora-memory-vault.netlify.app";

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aurora Memory Vault – Secure Image & Journal Memory Vault",
    template: "%s – Aurora Memory Vault",
  },
  description:
    "Preserve every life moment, image, and reflection with pure client-side security, fluid glassmorphism, and instant search.",
  keywords: [
    "Aurora Memory Vault",
    "memory vault",
    "journal vault",
    "secure photo storage",
    "encrypted journals",
    "digital memories",
    "timeline gallery",
    "portable vault export",
    "Next.js",
    "React",
    "Supabase",
    "Glassmorphism",
  ],
  authors: [{ name: "Farhan Hussain", url: "https://github.com/FarhanxAi" }],
  creator: "Farhan Hussain",
  publisher: "Aurora Memory Vault",
  applicationName: "Aurora Memory Vault",
  category: "productivity",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Aurora Memory Vault",
    title: "Aurora Memory Vault – Secure Image & Journal Memory Vault",
    description:
      "Preserve every life moment, image, and reflection with pure client-side security, fluid glassmorphism, and instant search.",
    images: [
      {
        url: "/memory-vault.jpg",
        width: 1200,
        height: 630,
        alt: "Aurora Memory Vault Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurora Memory Vault – Secure Image & Journal Memory Vault",
    description:
      "Preserve every life moment, image, and reflection with pure client-side security, fluid glassmorphism, and instant search.",
    images: ["/memory-vault.jpg"],
    creator: "@FarhanxAi",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/memory-vault.jpg",
  },
  manifest: "/manifest.webmanifest",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": siteUrl,
      "name": "Aurora Memory Vault",
      "description": "Preserve every life moment, image, and reflection with client-side security and glassmorphic elegance.",
      "publisher": {
        "@id": `${siteUrl}/#organization`,
      },
      "inLanguage": "en-US",
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      "name": "Aurora Memory Vault",
      "url": siteUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/memory-vault.jpg`,
      },
      "founder": {
        "@type": "Person",
        "name": "Farhan Hussain",
        "sameAs": "https://github.com/FarhanxAi",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      "name": "Aurora Memory Vault",
      "url": siteUrl,
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "All",
      "browserRequirements": "Requires JavaScript. Requires HTML5.",
      "description": "Encrypted, AI-assisted personal memory & journal vault built with Next.js 15, React 19, and Supabase.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${outfit.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[#030712] text-foreground antialiased selection:bg-aurora-cyan/30 selection:text-white min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
