import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse("google-site-verification: google506961f12d2a7ce7.html", {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
