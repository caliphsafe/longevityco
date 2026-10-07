import { createHash } from "node:crypto";

const UNLOCK_AT = Date.parse("2026-10-08T19:00:00-04:00");
const PASSWORD_HASH = "18274cfeeec1ebac0e05d2da68131f6e20e9b2ac52d9320ba06a8236e7511789";
const ACCESS_COOKIE = "lc_site_access";
const ACCESS_TOKEN = "bd022849df745ba0c022582d333478031d1ab5e4b098790a4191401c87a424b0";

function sha256(value = "") {
  return createHash("sha256").update(String(value)).digest("hex");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (Date.now() >= UNLOCK_AT) {
    return res.status(200).json({ ok: true, unlocked: true });
  }

  const submitted = String(req.body?.password || "");

  if (sha256(submitted) !== PASSWORD_HASH) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  const secondsUntilLaunch = Math.max(
    60,
    Math.ceil((UNLOCK_AT - Date.now()) / 1000)
  );

  res.setHeader(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${ACCESS_TOKEN}; Path=/; Max-Age=${secondsUntilLaunch}; HttpOnly; Secure; SameSite=Lax`
  );

  return res.status(200).json({ ok: true });
}
