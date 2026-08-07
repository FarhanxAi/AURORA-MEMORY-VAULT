import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your preserved memories, reflections, storage usage, and recent activity in Aurora Memory Vault.",
  alternates: {
    canonical: "/dashboard",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
