import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/panel") && !session) {
    const url = new URL("/acceder", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/acceder" || pathname === "/registro") && session) {
    return NextResponse.redirect(new URL("/panel", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/panel/:path*", "/acceder", "/registro"] };
