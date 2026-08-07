import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Recover access to your private Aurora Memory Vault securely.",
  alternates: {
    canonical: "/forgot-password",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
