import { NextResponse, type NextRequest } from "next/server";

import { unauthorizedResponse, verifyBasicAuth } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};

export function proxy(req: NextRequest) {
  const result = verifyBasicAuth(req.headers.get("authorization"));
  if (!result.ok) {
    return unauthorizedResponse();
  }
  return NextResponse.next();
}
