export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) {
    return res.status(500).json({ error: "Missing Shopify environment variables" });
  }

  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const collectionHandle = typeof req.query.collection === "string" ? req.query.collection.trim() : "";

  const productFields = `
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
    options {
      name
      values
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    variants(first: 50) {
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
  `;

  const query = collectionHandle
    ? `
      query ProductsByCollection($handle: String!) {
        collectionByHandle(handle: $handle) {
          title
          handle
          products(first: 100, sortKey: MANUAL) {
            nodes { ${productFields} }
          }
        }
      }
    `
    : `
      query Products {
        products(first: 100, sortKey: CREATED_AT, reverse: true) {
          nodes { ${productFields} }
        }
      }
    `;

  const variables = collectionHandle ? { handle: collectionHandle } : {};

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(500).json({
        error: "Shopify query failed",
        details: data.errors,
      });
    }

    if (collectionHandle) {
      const collection = data?.data?.collectionByHandle;

      if (!collection) {
        return res.status(404).json({
          error: "Collection not found",
          collectionHandle,
        });
      }

      return res.status(200).json({
        collectionTitle: collection.title || "Collection",
        collectionHandle: collection.handle || collectionHandle,
        itemCount: collection.products?.nodes?.length || 0,
        products: collection.products?.nodes || [],
      });
    }

    const products = data?.data?.products?.nodes || [];

    return res.status(200).json({
      collectionTitle: "All Products",
      collectionHandle: "",
      itemCount: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected server error",
      details: error.message,
    });
  }
}
