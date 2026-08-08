import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In – Aurora Memory Vault",
  description: "Sign in to your private Aurora Memory Vault to view, journal, and preserve your life memories and reflections.",
  alternates: {
    canonical: "/login",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Sign In – Aurora Memory Vault",
    description: "Sign in to your private Aurora Memory Vault to view, journal, and preserve your life memories and reflections.",
    url: "/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
