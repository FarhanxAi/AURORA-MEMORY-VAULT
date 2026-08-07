import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections",
  description: "Organize your favorite photos, moments, and personal reflections into curated custom collections.",
  alternates: {
    canonical: "/dashboard/collections",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CollectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
