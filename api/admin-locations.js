import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const data = await shopifyAdminGraphql(`
      query AdminLocations {
        locations(first: 50, includeInactive: false) {
          nodes {
            id
            name
            isActive
            fulfillsOnlineOrders
          }
        }
      }
    `);

    const locations = data.locations?.nodes || [];
    locations.sort((a, b) => Number(b.fulfillsOnlineOrders) - Number(a.fulfillsOnlineOrders));

    return res.status(200).json({ locations });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
