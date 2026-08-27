import crypto from "crypto";

const COOKIE_NAME = "longevity_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Missing ADMIN_SESSION_SECRET");
  return secret;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createSession(username) {
  const payload = base64url(JSON.stringify({
    username,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  }));
  return `${payload}.${sign(payload)}`;
}

export function readCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

export function verifySession(req) {
  const token = readCookies(req)[COOKIE_NAME];
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function requireAdmin(req, res) {
  const session = verifySession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
}

export function credentialsAreValid(username, password) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    throw new Error("Missing ADMIN_USERNAME or ADMIN_PASSWORD");
  }

  const userMatch = crypto.timingSafeEqual(
    Buffer.from(String(username)),
    Buffer.from(String(expectedUsername))
  );

  const passwordBuffer = Buffer.from(String(password));
  const expectedPasswordBuffer = Buffer.from(String(expectedPassword));

  const passwordMatch =
    passwordBuffer.length === expectedPasswordBuffer.length &&
    crypto.timingSafeEqual(passwordBuffer, expectedPasswordBuffer);

  return userMatch && passwordMatch;
}
