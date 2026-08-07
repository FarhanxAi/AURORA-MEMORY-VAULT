import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Vault Account",
  description: "Start preserving your personal reflections, photo memories, and life journals in your encrypted vault.",
  alternates: {
    canonical: "/signup",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
