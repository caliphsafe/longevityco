import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const { inventoryItemId, locationId, quantity } = req.body || {};

    if (!inventoryItemId || !locationId) {
      return res.status(400).json({ error: "Missing inventory item or location" });
    }

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
        ignoreCompareQuantity: true,
        quantities: [{
          inventoryItemId,
          locationId,
          quantity: Math.max(0, Number(quantity || 0)),
        }],
      },
    });

    throwUserErrors(data.inventorySetQuantities?.userErrors);

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
