import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const data = await shopifyAdminGraphql(`
      query AdminCollections {
        collections(first: 100, sortKey: TITLE) {
          nodes {
            id
            title
            handle
            updatedAt
          }
        }
      }
    `);

    return res.status(200).json({
      collections: data.collections?.nodes || [],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
