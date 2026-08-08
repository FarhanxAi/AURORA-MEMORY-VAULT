import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account – Aurora Memory Vault",
  description: "Create your private Aurora Memory Vault account to start preserving your personal reflections, photo memories, and life journals.",
  alternates: {
    canonical: "/signup",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Create Account – Aurora Memory Vault",
    description: "Create your private Aurora Memory Vault account to start preserving your personal reflections, photo memories, and life journals.",
    url: "/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
