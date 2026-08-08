import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password – Aurora Memory Vault",
  description: "Recover access to your private Aurora Memory Vault securely.",
  alternates: {
    canonical: "/forgot-password",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
