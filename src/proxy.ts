import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/signin", "/register"];

//Fast first gate: no cookie at all means straight to sign-in. The real checks
//(valid session, idle timeout, role) run on the server in requireUser().
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.has("guild_session")) return NextResponse.redirect(new URL("/signin", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|api/cron).*)"],
};
