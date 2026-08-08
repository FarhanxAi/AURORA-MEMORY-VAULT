import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights",
  description: "Private memory analytics and reflections.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
