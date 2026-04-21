export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id: cartId } = req.query;

  if (!cartId || typeof cartId !== "string") {
    return res.status(400).json({ error: "Missing cart id" });
  }

  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) {
    return res.status(500).json({ error: "Missing Shopify environment variables" });
  }

  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const query = `
    query GetCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        checkoutUrl
        totalQuantity
        note
        lines(first: 100) {
          nodes {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                availableForSale
                product {
                  id
                  handle
                  title
                  featuredImage {
                    url
                    altText
                  }
                }
                image {
                  url
                  altText
                }
                price {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
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
        buyerIdentity {
          email
          phone
          countryCode
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
        variables: { cartId },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(500).json({
        error: "Shopify query failed",
        details: data.errors,
      });
    }

    const cart = data?.data?.cart;

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    return res.status(200).json({ cart });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected server error",
      details: error.message,
    });
  }
}
