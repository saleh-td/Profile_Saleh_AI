import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SUPPORTED_LOCALES } from "@/i18n/locales";

const PUBLIC_FILE = /\.[^/]+$/;

// Next.js 16: `middleware.ts` was renamed to `proxy.ts`.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // `/` -> `/fr`
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/fr";
    return NextResponse.redirect(url);
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const hasLocale = SUPPORTED_LOCALES.includes(firstSegment as any);

  // Toute route sans locale est considérée FR.
  if (!hasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/fr${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
