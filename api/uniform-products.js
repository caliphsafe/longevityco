import { shopifyAdminGraphql } from "./_shopify-admin.js";

const UNIFORM_PREFIX = "LC_UNIFORM:";

function shopDomain() {
  const raw = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_SHOP;
  if (!raw) throw new Error("Missing SHOPIFY_STORE_DOMAIN");

  let cleaned = String(raw)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");

  if (!cleaned.endsWith(".myshopify.com")) {
    cleaned = `${cleaned}.myshopify.com`;
  }

  return cleaned;
}

function apiVersion() {
  return process.env.SHOPIFY_API_VERSION || "2026-07";
}

function explicitUniform(tags = []) {
  const tag = tags
    .map(String)
    .find((value) =>
      /^LC_UNIFORM:(HEADWEAR|TOPS|BOTTOMS|OFF)$/i.test(value)
    );

  return tag ? tag.slice(UNIFORM_PREFIX.length).toUpperCase() : "";
}

function inferUniform(product = {}) {
  const source = `${product.productType || ""} ${product.title || ""}`.toLowerCase();

  if (/headwear|hat\b|cap\b|beanie|snapback|trucker|bucket hat/.test(source)) {
    return "HEADWEAR";
  }

  if (/hoodie|sweatshirt|crewneck|t-shirt|t shirt|tee\b|shirt\b|top\b|sweater|longsleeve|long sleeve|jersey/.test(source)) {
    return "TOPS";
  }

  if (/pants?\b|shorts?\b|jogger|trouser|bottom|denim|jean|cargo|chino/.test(source)) {
    return "BOTTOMS";
  }

  return "";
}

async function storefrontProducts() {
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!token) throw new Error("Missing SHOPIFY_STOREFRONT_TOKEN");

  const endpoint = `https://${shopDomain()}/api/${apiVersion()}/graphql.json`;

  const query = `
    query UniformShopAll($handle: String!) {
      collectionByHandle(handle: $handle) {
        products(first: 100, sortKey: MANUAL) {
          nodes {
            id
            handle
            title
            description
            createdAt
            productType
            tags
            featuredImage {
              url
              altText
            }
            images(first: 10) {
              nodes {
                url
                altText
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 100) {
              nodes {
                id
                title
                availableForSale
                selectedOptions {
                  name
                  value
                }
                price {
                  amount
                  currencyCode
                }
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({
      query,
      variables: { handle: "shop-all" },
    }),
    cache: "no-store",
  });

  const raw = await response.text();
  let data;

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Shopify Storefront returned a non-JSON response.");
  }

  if (!response.ok || data.errors?.length) {
    const message =
      data.errors?.map((error) => error.message).join("; ") ||
      `Storefront request failed (${response.status})`;
    throw new Error(message);
  }

  const collection = data?.data?.collectionByHandle;
  if (!collection) throw new Error("The shop-all Shopify collection could not be found.");

  return collection.products?.nodes || [];
}

async function adminMetadata(productIds = []) {
  if (!productIds.length) return new Map();

  const data = await shopifyAdminGraphql(`
    query UniformAdminMetadata($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          productType
          status
          tags
          updatedAt
        }
      }
    }
  `, { ids: productIds });

  const map = new Map();

  for (const node of data.nodes || []) {
    if (node?.id) map.set(node.id, node);
  }

  return map;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    const products = await storefrontProducts();

    let admin = new Map();
    let adminConnected = true;

    try {
      admin = await adminMetadata(products.map((product) => product.id).filter(Boolean));
    } catch (error) {
      adminConnected = false;
      console.error("UNIFORM ADMIN METADATA ERROR:", error);
    }

    const included = [];
    const excluded = [];

    for (const product of products) {
      const meta = admin.get(product.id);
      const status = String(meta?.status || "ACTIVE").toUpperCase();

      if (meta && status !== "ACTIVE") {
        excluded.push({ id: product.id, reason: `STATUS_${status}` });
        continue;
      }

      const adminTags = Array.isArray(meta?.tags) ? meta.tags : [];
      const storefrontTags = Array.isArray(product.tags) ? product.tags : [];
      const tags = adminTags.length ? adminTags : storefrontTags;

      const explicit = explicitUniform(tags);
      const uniformCategory =
        explicit ||
        inferUniform({
          title: meta?.title || product.title,
          productType: meta?.productType || product.productType,
        });

      if (!uniformCategory || uniformCategory === "OFF") {
        excluded.push({
          id: product.id,
          reason: explicit === "OFF" ? "UNIFORM_OFF" : "NO_UNIFORM_CATEGORY",
        });
        continue;
      }

      included.push({
        ...product,
        tags,
        productType: meta?.productType || product.productType || "",
        uniformCategory,
      });
    }

    return res.status(200).json({
      ok: true,
      adminConnected,
      source: "shop-all+admin-merchandising",
      itemCount: included.length,
      products: included,
      excludedCount: excluded.length,
    });
  } catch (error) {
    console.error("UNIFORM PRODUCTS ERROR:", error);
    return res.status(500).json({
      error: error.message || "Unable to load Uniform products.",
    });
  }
}
