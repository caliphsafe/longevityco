import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === "GET") {
      const data = await shopifyAdminGraphql(`
        query AdminDraftOrders {
          draftOrders(first: 100, sortKey: UPDATED_AT, reverse: true) {
            nodes {
              id name status createdAt updatedAt completedAt email invoiceSentAt invoiceUrl
              totalQuantityOfLineItems
              totalPriceSet { shopMoney { amount currencyCode } }
              customer { id firstName lastName }
              lineItems(first: 50) {
                nodes {
                  id name quantity
                  variant { id title }
                  product { id title }
                }
              }
            }
          }
        }
      `);
      return res.status(200).json({ draftOrders:data.draftOrders?.nodes || [] });
    }

    if (req.method === "POST") {
      const { email = "", note = "", lineItems = [] } = req.body || {};
      const cleanItems = Array.isArray(lineItems)
        ? lineItems.filter(i => i.variantId).map(i => ({ variantId:i.variantId, quantity:Math.max(1, Number(i.quantity || 1)) }))
        : [];
      if (!cleanItems.length) return res.status(400).json({ error:"At least one product is required" });

      const input = { lineItems:cleanItems };
      if (email) input.email = email;
      if (note) input.note = note;

      const data = await shopifyAdminGraphql(`
        mutation AdminDraftCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id name status email invoiceUrl
              totalPriceSet { shopMoney { amount currencyCode } }
            }
            userErrors { field message }
          }
        }
      `, { input });

      throwUserErrors(data.draftOrderCreate?.userErrors);
      return res.status(200).json({ ok:true, draftOrder:data.draftOrderCreate?.draftOrder });
    }

    return res.status(405).json({ error:"Method not allowed" });
  } catch (error) {
    console.error("ADMIN DRAFT ORDERS ERROR:", error);
    return res.status(500).json({ error:error.message });
  }
}
