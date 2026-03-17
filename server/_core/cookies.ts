import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request): boolean {
  // En producción (NODE_ENV=production) siempre es HTTPS
  if (process.env.NODE_ENV === "production") return true;

  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // "lax" allows cookies to be sent on top-level navigations (OAuth redirects).
    // "none" requires secure=true AND causes issues with OAuth redirect flows in
    // some browsers (Chrome, Safari) because the cookie is set in a cross-site
    // redirect context and then immediately lost on the next same-site request.
    sameSite: "lax",
    secure,
  };
}
