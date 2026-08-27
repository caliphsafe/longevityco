import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return res.status(400).json({ error: "Missing product id" });

  try {
    const data = await shopifyAdminGraphql(`
      query AdminProduct($id: ID!) {
        product(id: $id) {
          id
          handle
          title
          productType
          vendor
          status
          descriptionHtml
          featuredImage {
            url
            altText
          }
          media(first: 50) {
            nodes {
              id
              alt
              mediaContentType
              preview {
                image {
                  url
                }
              }
            }
          }
          collections(first: 100) {
            nodes {
              id
              title
              handle
            }
          }
          variants(first: 100) {
            nodes {
              id
              title
              price
              inventoryQuantity
              inventoryItem {
                id
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    `, { id });

    if (!data.product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(200).json({ product: data.product });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
