import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your Aurora Memory Vault preferences, privacy, dark mode, and security controls.",
  alternates: {
    canonical: "/dashboard/settings",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
