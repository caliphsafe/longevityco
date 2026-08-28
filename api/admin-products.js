import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const data = await shopifyAdminGraphql(`
      query AdminProducts {
        products(first: 100, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id
            handle
            title
            productType
            vendor
            status
            tags
            createdAt
            updatedAt
            descriptionHtml
            featuredImage {
              url
              altText
            }
            media(first: 12) {
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
            collections(first: 20) {
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
      }
    `);

    return res.status(200).json({ products: data.products?.nodes || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
