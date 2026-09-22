import { requireAdmin } from "./_admin-auth.js";

function getConfig() {
  const url = process.env.MODELS_SCRIPT_URL;
  const secret = process.env.MODELS_API_SECRET;

  if (!url) throw new Error("Missing MODELS_SCRIPT_URL");
  if (!secret) throw new Error("Missing MODELS_API_SECRET");

  return { url, secret };
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

async function callModelsScript(action, payload = {}) {
  const { url, secret } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({ action, secret, ...payload }),
      redirect: "follow",
      signal: controller.signal,
    });

    const raw = await response.text();
    let data;

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("Models Apps Script returned a non-JSON response. Confirm the Web App is deployed and MODELS_SCRIPT_URL uses the /exec URL.");
    }

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Models request failed (${response.status})`);
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Models Google Sheet request timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    if (req.method === "GET") {
      const data = await callModelsScript("listModels");
      return res.status(200).json({ ok: true, models: data.models || [] });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = parseBody(req);
    const action = String(body.action || "").trim().toLowerCase();

    if (action === "add") {
      const data = await callModelsScript("addModel", { model: body.model || {} });
      return res.status(200).json(data);
    }

    if (action === "update") {
      const model = body.model || {};
      if (!model.modelId) return res.status(400).json({ error: "Model ID is required" });
      const data = await callModelsScript("updateModel", { model });
      return res.status(200).json(data);
    }

    if (action === "archive") {
      if (!body.modelId) return res.status(400).json({ error: "Model ID is required" });
      const data = await callModelsScript("archiveModel", { modelId: body.modelId });
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Unknown models action" });
  } catch (error) {
    console.error("ADMIN MODELS ERROR:", error?.message || error);
    return res.status(500).json({ error: error?.message || "Models request failed" });
  }
}
