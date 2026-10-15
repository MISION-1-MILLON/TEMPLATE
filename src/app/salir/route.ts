import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/acceder", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
