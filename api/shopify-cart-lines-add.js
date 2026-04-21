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

  const { cartId, lines } = req.body || {};

  if (!cartId || typeof cartId !== "string") {
    return res.status(400).json({ error: "Missing cartId" });
  }

  if (!Array.isArray(lines) || !lines.length) {
    return res.status(400).json({ error: "Missing cart lines" });
  }

  const normalizedLines = lines
    .filter((line) => line && typeof line.merchandiseId === "string")
    .map((line) => ({
      merchandiseId: line.merchandiseId,
      quantity: Number(line.quantity) > 0 ? Number(line.quantity) : 1,
    }));

  if (!normalizedLines.length) {
    return res.status(400).json({ error: "No valid cart lines provided" });
  }

  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const mutation = `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          totalQuantity
          lines(first: 50) {
            nodes {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                      altText
                    }
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
        }
        userErrors {
          field
          message
        }
        warnings {
          code
          message
          target
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
        query: mutation,
        variables: {
          cartId,
          lines: normalizedLines,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(500).json({
        error: "Shopify mutation failed",
        details: data.errors,
      });
    }

    const payload = data?.data?.cartLinesAdd;

    if (!payload) {
      return res.status(500).json({
        error: "Invalid Shopify response",
      });
    }

    if (payload.userErrors?.length) {
      return res.status(400).json({
        error: "Cart line add returned user errors",
        details: payload.userErrors,
        warnings: payload.warnings || [],
      });
    }

    return res.status(200).json({
      cart: payload.cart,
      warnings: payload.warnings || [],
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected server error",
      details: error.message,
    });
  }
}
