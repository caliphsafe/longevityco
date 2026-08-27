import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const { productId } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const data = await shopifyAdminGraphql(`
      mutation AdminDeleteProduct($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }
    `, {
      input: { id: productId },
    });

    throwUserErrors(data.productDelete?.userErrors);

    if (!data.productDelete?.deletedProductId) {
      throw new Error("Shopify did not confirm the product deletion.");
    }

    return res.status(200).json({
      ok: true,
      deletedProductId: data.productDelete.deletedProductId,
    });
  } catch (error) {
    console.error("ADMIN PRODUCT DELETE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
