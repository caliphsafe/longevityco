const UNLOCK_AT = Date.parse("2026-10-08T19:00:00-04:00");
const ACCESS_COOKIE = "lc_site_access";
const ACCESS_TOKEN = "bd022849df745ba0c022582d333478031d1ab5e4b098790a4191401c87a424b0";

function getCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return "";
}

function isGateAsset(pathname) {
  return (
    pathname === "/password.html" ||
    pathname === "/password.css" ||
    pathname === "/password.js" ||
    pathname === "/api/site-gate-login" ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  );
}

function isAdminPath(pathname) {
  return (
    pathname === "/admin" ||
    pathname === "/admin.html" ||
    pathname.startsWith("/admin-") ||
    pathname.startsWith("/api/admin-")
  );
}

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (Date.now() >= UNLOCK_AT) return;
  if (isGateAsset(pathname) || isAdminPath(pathname)) return;

  if (getCookie(request, ACCESS_COOKIE) === ACCESS_TOKEN) return;

  const gateUrl = new URL("/password.html", request.url);
  gateUrl.searchParams.set("next", `${pathname}${url.search}`);
  return Response.redirect(gateUrl, 307);
}

export const config = {
  matcher: "/:path*",
};
