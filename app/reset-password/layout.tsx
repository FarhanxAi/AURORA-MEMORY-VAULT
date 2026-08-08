import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set New Password – Aurora Memory Vault",
  description: "Set a new secure password for your Aurora Memory Vault account.",
  alternates: {
    canonical: "/reset-password",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
