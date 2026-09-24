import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

function normalizeUpdate(update = {}) {
  const inventoryItemId = String(update.inventoryItemId || "").trim();
  const locationId = String(update.locationId || "").trim();
  const quantity = Math.max(0, Math.floor(Number(update.quantity || 0)));

  if (!inventoryItemId || !locationId) return null;

  return {
    inventoryItemId,
    locationId,
    quantity,
    // Current Shopify Admin API requires this field to be present.
    // null intentionally skips the compare-and-swap guard for admin corrections.
    changeFromQuantity: null,
  };
}

async function setInventoryBatch(updates) {
  const data = await shopifyAdminGraphql(`
    mutation AdminInventorySet($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup {
          createdAt
          reason
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    input: {
      name: "available",
      reason: "correction",
      quantities: updates,
    },
  });

  throwUserErrors(data.inventorySetQuantities?.userErrors);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const body = req.body || {};

    const rawUpdates = Array.isArray(body.updates)
      ? body.updates
      : [{
          inventoryItemId: body.inventoryItemId,
          locationId: body.locationId,
          quantity: body.quantity,
        }];

    const deduped = new Map();

    for (const raw of rawUpdates) {
      const update = normalizeUpdate(raw);
      if (!update) continue;
      deduped.set(`${update.inventoryItemId}::${update.locationId}`, update);
    }

    const updates = [...deduped.values()];

    if (!updates.length) {
      return res.status(400).json({
        error: "Missing inventory item, location, or quantity.",
      });
    }

    // Keep each Shopify mutation comfortably below common GraphQL input limits.
    const CHUNK_SIZE = 100;
    let updated = 0;

    for (let index = 0; index < updates.length; index += CHUNK_SIZE) {
      const chunk = updates.slice(index, index + CHUNK_SIZE);
      await setInventoryBatch(chunk);
      updated += chunk.length;
    }

    return res.status(200).json({
      ok: true,
      updated,
    });
  } catch (error) {
    console.error("ADMIN INVENTORY UPDATE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
