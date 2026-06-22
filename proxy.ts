import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/installations/:path*",
    "/renewals/:path*",
    "/stock/:path*",
    "/suppliers/:path*",
    "/payment-methods/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/import/:path*",
  ],
};
