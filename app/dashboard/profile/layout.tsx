import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Profile & Vault Export",
  description: "Manage your user profile and download your complete portable Aurora Vault offline backup.",
  alternates: {
    canonical: "/dashboard/profile",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
