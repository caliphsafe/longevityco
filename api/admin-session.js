import { requireAdmin } from "./_admin-auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = requireAdmin(req, res);
  if (!session) return;

  return res.status(200).json({
    authenticated: true,
    username: session.username,
  });
}
