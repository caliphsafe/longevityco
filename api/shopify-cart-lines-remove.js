export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) {
    return res.status(500).json({ error: "Missing Shopify environment variables" });
  }

  const { cartId, lineIds } = req.body || {};

  if (!cartId || !Array.isArray(lineIds) || !lineIds.length) {
    return res.status(400).json({ error: "cartId and lineIds are required" });
  }

  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const query = `
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 100) {
            nodes {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  image {
                    url
                    altText
                  }
                  selectedOptions {
                    name
                    value
                  }
                  product {
                    handle
                    title
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
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
      body: JSON.stringify({
        query,
        variables: { cartId, lineIds },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(500).json({
        error: "Shopify cartLinesRemove failed",
        details: data.errors,
      });
    }

    const payload = data?.data?.cartLinesRemove;

    if (payload?.userErrors?.length) {
      return res.status(400).json({
        error: "Shopify cartLinesRemove userErrors",
        details: payload.userErrors,
      });
    }

    return res.status(200).json({ cart: payload.cart });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected server error",
      details: error.message,
    });
  }
}
