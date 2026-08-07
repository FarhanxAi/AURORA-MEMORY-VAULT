import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Access your encrypted Aurora Memory Vault to view, journal, and preserve your life moments.",
  alternates: {
    canonical: "/login",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
