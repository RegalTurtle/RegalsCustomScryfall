import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Cookie");
  return response;
}

export const config = {
  matcher: ["/api/collection/:path*", "/api/decks/:path*", "/api/games/:path*", "/collection/:path*", "/decks/:path*", "/games/:path*", "/settings/:path*"],
};
