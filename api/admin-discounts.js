import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === "GET") {
      const data = await shopifyAdminGraphql(`
        query AdminDiscounts {
          discountNodes(first: 100, sortKey: CREATED_AT, reverse: true) {
            nodes {
              id
              discount {
                ... on DiscountCodeBasic {
                  title summary status startsAt endsAt
                  codes(first: 1) { nodes { code } }
                }
                ... on DiscountAutomaticBasic {
                  title summary status startsAt endsAt
                }
                ... on DiscountCodeFreeShipping {
                  title summary status startsAt endsAt
                  codes(first: 1) { nodes { code } }
                }
                ... on DiscountAutomaticFreeShipping {
                  title summary status startsAt endsAt
                }
                ... on DiscountCodeBxgy {
                  title summary status startsAt endsAt
                  codes(first: 1) { nodes { code } }
                }
                ... on DiscountAutomaticBxgy {
                  title summary status startsAt endsAt
                }
              }
            }
          }
        }
      `);

      const discounts = (data.discountNodes?.nodes || []).map(node => {
        const d = node.discount || {};
        return {
          id: node.id,
          title: d.title || "Discount",
          summary: d.summary || "",
          status: d.status || "",
          startsAt: d.startsAt || null,
          endsAt: d.endsAt || null,
          code: d.codes?.nodes?.[0]?.code || "",
          type: d.__typename || "",
        };
      });

      return res.status(200).json({ discounts });
    }

    if (req.method === "POST") {
      const { code, percent, usageLimit = null, endsAt = null, appliesOncePerCustomer = false } = req.body || {};
      if (!code || !percent || Number(percent) <= 0 || Number(percent) > 100) {
        return res.status(400).json({ error: "Valid code and percent are required" });
      }

      const input = {
        title: code,
        code,
        startsAt: new Date().toISOString(),
        endsAt: endsAt || null,
        context: { all: true },
        customerGets: {
          value: { percentage: Number(percent) / 100 },
          items: { all: true },
        },
        appliesOncePerCustomer: !!appliesOncePerCustomer,
      };
      if (usageLimit) input.usageLimit = Math.max(1, Number(usageLimit));

      const data = await shopifyAdminGraphql(`
        mutation AdminDiscountCreate($input: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $input) {
            codeDiscountNode { id }
            userErrors { field message }
          }
        }
      `, { input });

      throwUserErrors(data.discountCodeBasicCreate?.userErrors);
      return res.status(200).json({ ok:true, id:data.discountCodeBasicCreate?.codeDiscountNode?.id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("ADMIN DISCOUNTS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
