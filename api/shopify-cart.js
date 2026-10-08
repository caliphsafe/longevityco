function cleanShopDomain(value = "") {
  let domain = String(value)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

  if (domain && !domain.endsWith(".myshopify.com")) {
    domain = `${domain}.myshopify.com`;
  }

  return domain;
}

function numericVariantId(gid = "") {
  const match = String(gid).match(/ProductVariant\/(\d+)(?:\?.*)?$/);
  return match ? match[1] : "";
}

function buildShopifyCheckoutPermalink(cart, storeDomain) {
  const shopDomain = cleanShopDomain(storeDomain);
  if (!shopDomain) return "";

  const parts = (cart?.lines?.nodes || [])
    .map((line) => {
      const variantId = numericVariantId(line?.merchandise?.id);
      const quantity = Math.max(1, Number(line?.quantity || 1));

      return variantId
        ? `${variantId}:${quantity}`
        : "";
    })
    .filter(Boolean);

  if (!parts.length) return "";

  const url = new URL(
    `https://${shopDomain}/cart/${parts.join(",")}`
  );

  const discountCodes = (cart?.discountCodes || [])
    .filter(
      (discount) =>
        discount?.code &&
        discount?.applicable !== false
    )
    .map((discount) => discount.code);

  if (discountCodes.length) {
    url.searchParams.set(
      "discount",
      discountCodes.join(",")
    );
  }

  if (cart?.buyerIdentity?.email) {
    url.searchParams.set(
      "checkout[email]",
      cart.buyerIdentity.email
    );
  }

  if (cart?.note) {
    url.searchParams.set(
      "note",
      cart.note
    );
  }

  return url.toString();
}

function isShopifyHostedCheckout(checkoutUrl) {
  if (!checkoutUrl) return false;

  try {
    const host =
      new URL(checkoutUrl).hostname.toLowerCase();

    return host.endsWith(".myshopify.com");
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({
        error: "Method not allowed",
      });
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );

  const { id: cartId } = req.query;

  if (
    !cartId ||
    typeof cartId !== "string"
  ) {
    return res
      .status(400)
      .json({
        error: "Missing cart id",
      });
  }

  const SHOPIFY_STORE_DOMAIN =
    process.env.SHOPIFY_STORE_DOMAIN;

  const SHOPIFY_STOREFRONT_TOKEN =
    process.env.SHOPIFY_STOREFRONT_TOKEN;

  const SHOPIFY_API_VERSION =
    process.env.SHOPIFY_API_VERSION ||
    "2026-04";

  if (
    !SHOPIFY_STORE_DOMAIN ||
    !SHOPIFY_STOREFRONT_TOKEN
  ) {
    return res
      .status(500)
      .json({
        error:
          "Missing Shopify environment variables",
      });
  }

  const endpoint =
    `https://${SHOPIFY_STORE_DOMAIN}` +
    `/api/${SHOPIFY_API_VERSION}` +
    `/graphql.json`;

  const query = `
    query GetCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        checkoutUrl
        totalQuantity
        note

        discountCodes {
          code
          applicable
        }

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
    const response = await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Shopify-Storefront-Access-Token":
            SHOPIFY_STOREFRONT_TOKEN,
        },

        body: JSON.stringify({
          query,
          variables: {
            cartId,
          },
        }),
      }
    );

    const data =
      await response.json();

    if (data.errors) {
      return res
        .status(500)
        .json({
          error:
            "Shopify query failed",

          details:
            data.errors,
        });
    }

    const cart =
      data?.data?.cart;

    if (!cart) {
      return res
        .status(404)
        .json({
          error:
            "Cart not found",
        });
    }

    let safeCheckoutUrl =
      cart.checkoutUrl;

    let checkoutMode =
      "shopify_cart_api";

    if (
      !isShopifyHostedCheckout(
        cart.checkoutUrl
      )
    ) {
      const permalink =
        buildShopifyCheckoutPermalink(
          cart,
          SHOPIFY_STORE_DOMAIN
        );

      if (permalink) {
        safeCheckoutUrl =
          permalink;

        checkoutMode =
          "shopify_cart_permalink";

        try {
          console.warn(
            "SHOPIFY CHECKOUT FALLBACK:",
            {
              returnedHost:
                new URL(
                  cart.checkoutUrl
                ).hostname,

              safeHost:
                new URL(
                  permalink
                ).hostname,

              lineCount:
                cart.lines
                  ?.nodes
                  ?.length || 0,
            }
          );
        } catch {
          console.warn(
            "SHOPIFY CHECKOUT FALLBACK: using cart permalink"
          );
        }
      }
    }

    return res
      .status(200)
      .json({
        cart: {
          ...cart,
          checkoutUrl:
            safeCheckoutUrl,
        },

        checkoutMode,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        error:
          "Unexpected server error",

        details:
          error.message,
      });
  }
}