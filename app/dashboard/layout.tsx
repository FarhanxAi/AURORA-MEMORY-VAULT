import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Private Aurora Memory Vault dashboard.",
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
