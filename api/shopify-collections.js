export default async function handler(req, res) {
  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) {
    return res.status(500).json({ error: "Missing Shopify environment variables" });
  }

  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const query = `
    query Collections {
      collections(first: 100, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          id
          title
          handle
          updatedAt
          products(first: 100) {
            nodes {
              id
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(500).json(data.errors);
    }

    const collections = (data.data.collections.nodes || []).map((collection) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      updatedAt: collection.updatedAt,
      itemCount: collection.products?.nodes?.length || 0,
    }));

    return res.status(200).json(collections);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
