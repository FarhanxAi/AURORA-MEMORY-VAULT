import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memory Gallery",
  description: "Browse your complete high-resolution photo collection and visual memories in a unified gallery.",
  alternates: {
    canonical: "/dashboard/gallery",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
