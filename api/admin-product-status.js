import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const { productId, status } = req.body || {};
    if (!productId || !["ACTIVE", "DRAFT", "ARCHIVED"].includes(status)) {
      return res.status(400).json({ error: "Invalid product or status" });
    }

    const data = await shopifyAdminGraphql(`
      mutation AdminProductStatus($productId: ID!, $status: ProductStatus!) {
        productChangeStatus(productId: $productId, status: $status) {
          product {
            id
            title
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `, { productId, status });

    throwUserErrors(data.productChangeStatus?.userErrors);

    return res.status(200).json({
      ok: true,
      product: data.productChangeStatus?.product,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
