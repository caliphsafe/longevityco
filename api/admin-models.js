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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJson(raw) {
  const cleaned = String(raw || "").replace(/^\uFEFF/, "").trim();
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {}

  // Some Google responses can contain harmless leading/trailing text around
  // the ContentService payload. Recover a JSON object when one is present.
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {}
  }

  return null;
}

async function fetchModelsScript(action, payload = {}) {
  const { url, secret } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        Accept: "application/json,text/plain,*/*",
      },
      body: JSON.stringify({ action, secret, ...payload }),
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    const raw = await response.text();
    return {
      response,
      raw,
      data: safeJson(raw),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function listModelsWithRetry() {
  const waits = [0, 450, 1000];

  for (let attempt = 0; attempt < waits.length; attempt += 1) {
    if (waits[attempt]) await sleep(waits[attempt]);

    let result;
    try {
      result = await fetchModelsScript("listModels");
    } catch (error) {
      if (error?.name === "AbortError") {
        if (attempt === waits.length - 1) {
          throw new Error("Models Google Sheet request timed out.");
        }
        continue;
      }
      if (attempt === waits.length - 1) throw error;
      continue;
    }

    if (result.data && result.response.ok && result.data.ok !== false) {
      return result.data;
    }

    // Retry transient Google HTML / redirect / 429 / 5xx responses for reads.
    const retryable =
      !result.data ||
      result.response.status === 429 ||
      result.response.status >= 500;

    if (!retryable || attempt === waits.length - 1) {
      if (result.data?.ok === false) {
        throw new Error(result.data.error || "Models request failed.");
      }

      console.error("MODELS LIST NON-JSON RESPONSE:", {
        status: result.response.status,
        contentType: result.response.headers.get("content-type"),
        preview: String(result.raw || "").slice(0, 500),
      });

      throw new Error(
        "Models Apps Script returned a non-JSON response. Confirm the Web App is deployed and MODELS_SCRIPT_URL uses the /exec URL."
      );
    }
  }

  throw new Error("Unable to load models from Google Sheet.");
}

function modelMatchesAdd(candidate, requested) {
  const same = (a, b) =>
    String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  return (
    same(candidate?.name, requested?.name) &&
    same(candidate?.email, requested?.email) &&
    same(candidate?.igHandle, requested?.igHandle)
  );
}

function modelMatchesUpdate(candidate, requested) {
  if (!candidate || String(candidate.modelId || "") !== String(requested?.modelId || "")) {
    return false;
  }

  const same = (a, b) =>
    String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  return (
    same(candidate.name, requested.name) &&
    same(candidate.email, requested.email) &&
    same(candidate.status, requested.status || "Applicant")
  );
}

async function verifyMutation(action, payload = {}) {
  // Apps Script occasionally completes the Sheet write but Google returns a
  // temporary HTML response to the caller. Never repeat the write, because
  // repeating "addModel" could create a duplicate. Instead, reload the Sheet
  // and verify that the requested change is present.
  await sleep(500);
  const listed = await listModelsWithRetry();
  const models = Array.isArray(listed.models) ? listed.models : [];

  if (action === "addModel") {
    const matches = models
      .filter((model) => modelMatchesAdd(model, payload.model || {}))
      .sort((a, b) => new Date(b.lastUpdated || b.timestamp || 0) - new Date(a.lastUpdated || a.timestamp || 0));

    if (matches[0]) {
      return { ok: true, model: matches[0], recovered: true };
    }
  }

  if (action === "updateModel") {
    const found = models.find(
      (model) => String(model.modelId || "") === String(payload.model?.modelId || "")
    );

    if (modelMatchesUpdate(found, payload.model || {})) {
      return { ok: true, model: found, recovered: true };
    }
  }

  if (action === "archiveModel") {
    const found = models.find(
      (model) => String(model.modelId || "") === String(payload.modelId || "")
    );

    if (found && String(found.status || "").toLowerCase() === "archived") {
      return { ok: true, model: found, recovered: true };
    }
  }

  throw new Error(
    "Google Sheet may have received the change, but the admin could not confirm it. Refresh Models before trying again."
  );
}

async function callModelsScript(action, payload = {}) {
  if (action === "listModels") {
    return listModelsWithRetry();
  }

  let result;
  try {
    result = await fetchModelsScript(action, payload);
  } catch (error) {
    if (error?.name === "AbortError") {
      // Do not retry writes. Confirm against the Sheet instead.
      return verifyMutation(action, payload);
    }
    throw error;
  }

  if (result.data && result.response.ok && result.data.ok !== false) {
    return result.data;
  }

  if (result.data?.ok === false) {
    throw new Error(result.data.error || `Models request failed (${result.response.status})`);
  }

  if (!result.response.ok) {
    console.error("MODELS MUTATION HTTP ERROR:", {
      action,
      status: result.response.status,
      contentType: result.response.headers.get("content-type"),
      preview: String(result.raw || "").slice(0, 500),
    });
    throw new Error(`Models request failed (${result.response.status})`);
  }

  console.warn("MODELS MUTATION NON-JSON RESPONSE; VERIFYING SHEET:", {
    action,
    status: result.response.status,
    contentType: result.response.headers.get("content-type"),
    preview: String(result.raw || "").slice(0, 300),
  });

  return verifyMutation(action, payload);
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
