import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse("google-site-verification: googled7b86416dff8c351.html", {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
