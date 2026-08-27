import {
  createSession,
  credentialsAreValid,
  sessionCookie,
} from "./_admin-auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username = "", password = "" } = req.body || {};

    if (!credentialsAreValid(username, password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = createSession(username);
    res.setHeader("Set-Cookie", sessionCookie(token));
    return res.status(200).json({ ok: true, username });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
