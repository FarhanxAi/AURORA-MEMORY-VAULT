import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar View",
  description: "Relive memories and daily journals organized by date across days, months, and years.",
  alternates: {
    canonical: "/dashboard/calendar",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
