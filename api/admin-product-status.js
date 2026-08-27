import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

async function publishProductEverywhere(productId) {
  const publicationsData = await shopifyAdminGraphql(`
    query AdminPublications {
      publications(first: 100) {
        nodes {
          id
        }
      }
    }
  `);

  const publicationIds = (publicationsData.publications?.nodes || [])
    .map((publication) => publication.id)
    .filter(Boolean);

  if (!publicationIds.length) {
    throw new Error("Product status was changed to ACTIVE, but Shopify returned no publications.");
  }

  const data = await shopifyAdminGraphql(`
    mutation AdminPublishProduct($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors {
          field
          message
        }
      }
    }
  `, {
    id: productId,
    input: publicationIds.map((publicationId) => ({ publicationId })),
  });

  throwUserErrors(data.publishablePublish?.userErrors);
}

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

    const product = data.productChangeStatus?.product;

    if (status === "ACTIVE" && product?.id) {
      await publishProductEverywhere(product.id);
    }

    return res.status(200).json({
      ok: true,
      product,
      published: status === "ACTIVE",
    });
  } catch (error) {
    console.error("ADMIN PRODUCT STATUS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
