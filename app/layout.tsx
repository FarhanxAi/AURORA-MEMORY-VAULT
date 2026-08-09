import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import Script from "next/script";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aurora-memory-vault.myfarhan-h.workers.dev";
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

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
    default: "Aurora Memory Vault – Private Digital Memory & Journal Vault",
    template: "%s – Aurora Memory Vault",
  },
  description:
    "Aurora Memory Vault is a private digital memory vault for preserving photographs, personal journals, and life reflections with secure cloud storage, fluid timeline exploration, and portable offline export.",
  keywords: [
    "Aurora Memory Vault",
    "Aurora Memory Vault app",
    "Aurora Memory Vault website",
    "Aurora memory journal",
    "Aurora digital memory vault",
    "memory vault",
    "digital memory vault",
    "private journal app",
    "photo journal",
    "secure photo storage",
    "life reflection vault",
    "timeline memories",
    "offline vault export",
  ],
  authors: [{ name: "Farhan Hussain", url: "https://github.com/FarhanxAi" }],
  creator: "Farhan Hussain",
  publisher: "Aurora Memory Vault",
  applicationName: "Aurora Memory Vault",
  category: "lifestyle",
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
    title: "Aurora Memory Vault – Private Digital Memory & Journal Vault",
    description:
      "Aurora Memory Vault is a private digital memory vault for preserving photographs, personal journals, and life reflections with secure cloud storage, fluid timeline exploration, and portable offline export.",
    images: [
      {
        url: "/memory-vault.jpg",
        width: 1200,
        height: 630,
        alt: "Aurora Memory Vault — Private Digital Memory & Journal Vault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurora Memory Vault – Private Digital Memory & Journal Vault",
    description:
      "Aurora Memory Vault is a private digital memory vault for preserving photographs, personal journals, and life reflections with secure cloud storage, fluid timeline exploration, and portable offline export.",
    images: ["/memory-vault.jpg"],
    creator: "@FarhanxAi",
  },
  verification: {
    google: "g41AagDU6YtDoVjKu9Ww9Zp_0yOxxIcL6dPIQSzuIyY",
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "bing-site-verification-code",
    },
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
      "alternateName": [
        "Aurora Memory Vault App",
        "Aurora Memory Vault Website",
        "Aurora Digital Memory Vault",
        "Aurora Memory Journal",
      ],
      "description":
        "Aurora Memory Vault is a private digital memory vault for preserving photographs, personal journals, and life reflections with secure cloud storage, fluid timeline exploration, and portable offline export.",
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
      "alternateName": "Aurora Digital Memory Vault",
      "url": siteUrl,
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "All (Web, iOS, Android, macOS, Windows, Linux)",
      "browserRequirements": "Requires JavaScript. Requires HTML5.",
      "description":
        "Aurora Memory Vault is a secure digital memory and journal vault designed to store, organize, and export personal life memories, photographs, and reflections.",
      "featureList": [
        "High-resolution multi-image memory storage",
        "Intimate text journals and life reflection writing",
        "Chronological timeline and gallery visual stream",
        "100% offline portable ZIP export with standalone companion viewer",
        "Smart tag categorization, mood logging, and instant search",
        "Strict Row-Level Security encryption",
      ],
      "screenshot": `${siteUrl}/memory-vault.jpg`,
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
        <meta name="google-site-verification" content="g41AagDU6YtDoVjKu9Ww9Zp_0yOxxIcL6dPIQSzuIyY" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        )}
        {gtmId && (
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `}
          </Script>
        )}
      </head>
      <body className="bg-[#030712] text-foreground antialiased selection:bg-aurora-cyan/30 selection:text-white min-h-screen">
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
