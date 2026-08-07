import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memory Map",
  description: "View and explore your memories and reflections plotted geographically across an interactive global map.",
  alternates: {
    canonical: "/dashboard/map",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
