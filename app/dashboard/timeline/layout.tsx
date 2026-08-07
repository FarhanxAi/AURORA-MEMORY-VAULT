import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Explore your life moments and journal reflections in chronological timeline order.",
  alternates: {
    canonical: "/dashboard/timeline",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
