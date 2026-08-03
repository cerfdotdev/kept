import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export default function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";

  const requestHeaders = new Headers(request.headers);

  if (!isDev) {
    const nonce = randomBytes(16).toString("base64");
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com https://js.stripe.com https://r.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "0");
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers: requestHeaders }, headers: response.headers });
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return NextResponse.next({ request: { headers: requestHeaders }, headers: response.headers });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
};
