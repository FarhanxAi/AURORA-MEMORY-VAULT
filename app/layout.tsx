import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/toast-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Aurora | Your Memories. Protected Forever.",
  description:
    "Aurora is a luxury digital memory vault engineered with Apple Vision Pro liquid glass design and Supabase zero-knowledge security.",
  keywords: ["Memory Vault", "Digital Storage", "Secure Photos", "Encrypted Memories", "Supabase Auth"],
  authors: [{ name: "Aurora Engineers" }],
  openGraph: {
    title: "Aurora | Your Memories. Protected Forever.",
    description: "Store your memories securely. Relive them beautifully. Protect them forever.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${outfit.variable}`}>
      <body className="bg-[#030712] text-foreground antialiased selection:bg-aurora-cyan/30 selection:text-white min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
