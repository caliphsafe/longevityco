import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });
  if (!requireAdmin(req, res)) return;

  try {
    const data = await shopifyAdminGraphql(`
      query AdminAbandoned {
        abandonedCheckouts(first: 100, reverse: true) {
          nodes {
            id createdAt updatedAt completedAt email phone recoveryUrl
            totalPriceSet { shopMoney { amount currencyCode } }
            customer {
              id firstName lastName
              defaultEmailAddress { emailAddress }
            }
            lineItems(first: 50) {
              nodes {
                id title quantity
                variantTitle
              }
            }
          }
        }
      }
    `);
    return res.status(200).json({ checkouts:data.abandonedCheckouts?.nodes || [] });
  } catch (error) {
    console.error("ADMIN ABANDONED ERROR:", error);
    return res.status(500).json({ error:error.message });
  }
}
