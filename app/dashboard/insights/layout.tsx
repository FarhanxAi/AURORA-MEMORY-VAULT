import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intelligence & Analytics",
  description: "Discover memory journey patterns, life milestones, yearly aggregates, and storage analytics.",
  alternates: {
    canonical: "/dashboard/insights",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
