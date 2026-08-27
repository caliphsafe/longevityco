let cachedToken = null;
let tokenExpiresAt = 0;

/* -----------------------------
   SHOP DOMAIN
----------------------------- */

function getShopDomain() {
  const raw =
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.SHOPIFY_SHOP;

  if (!raw) {
    throw new Error(
      "Missing SHOPIFY_STORE_DOMAIN"
    );
  }

  let cleaned = String(raw)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");

  if (
    !cleaned.endsWith(
      ".myshopify.com"
    )
  ) {
    cleaned =
      `${cleaned}.myshopify.com`;
  }

  return cleaned;
}

/* -----------------------------
   API VERSION
----------------------------- */

function getApiVersion() {
  return (
    process.env
      .SHOPIFY_API_VERSION ||
    "2026-07"
  );
}

/* -----------------------------
   SAFE RESPONSE PARSER
----------------------------- */

async function parseShopifyResponse(
  response,
  label
) {
  const raw =
    await response.text();

  let data = null;

  try {
    data = raw
      ? JSON.parse(raw)
      : {};
  } catch {
    console.error(
      `${label} RETURNED NON-JSON:`,
      {
        status:
          response.status,
        contentType:
          response.headers.get(
            "content-type"
          ),
        response:
          raw.slice(0, 1000),
      }
    );

    throw new Error(
      `${label} returned HTML instead of JSON. Check SHOPIFY_STORE_DOMAIN and Shopify app installation.`
    );
  }

  if (!response.ok) {
    console.error(
      `${label} HTTP ERROR:`,
      data
    );

    throw new Error(
      data?.error_description ||
      data?.error ||
      data?.message ||
      `${label} failed (${response.status})`
    );
  }

  return data;
}

/* -----------------------------
   ADMIN ACCESS TOKEN
----------------------------- */

async function getAccessToken() {
  if (
    cachedToken &&
    Date.now() <
      tokenExpiresAt - 60_000
  ) {
    return cachedToken;
  }

  const clientId =
    process.env
      .SHOPIFY_CLIENT_ID;

  const clientSecret =
    process.env
      .SHOPIFY_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET"
    );
  }

  const shopDomain =
    getShopDomain();

  const body =
    new URLSearchParams({
      grant_type:
        "client_credentials",

      client_id:
        clientId,

      client_secret:
        clientSecret,
    });

  const response =
    await fetch(
      `https://${shopDomain}/admin/oauth/access_token`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept:
            "application/json",
        },

        body,
      }
    );

  const data =
    await parseShopifyResponse(
      response,
      "Shopify access-token request"
    );

  if (!data.access_token) {
    console.error(
      "SHOPIFY TOKEN RESPONSE:",
      data
    );

    throw new Error(
      "Shopify did not return an Admin API access token."
    );
  }

  cachedToken =
    data.access_token;

  tokenExpiresAt =
    Date.now() +
    Number(
      data.expires_in ||
        86400
    ) *
      1000;

  return cachedToken;
}

/* -----------------------------
   GRAPHQL
----------------------------- */

export async function shopifyAdminGraphql(
  query,
  variables = {}
) {
  const token =
    await getAccessToken();

  const shopDomain =
    getShopDomain();

  const endpoint =
    `https://${shopDomain}` +
    `/admin/api/${getApiVersion()}` +
    `/graphql.json`;

  const response =
    await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Accept:
          "application/json",

        "X-Shopify-Access-Token":
          token,
      },

      body:
        JSON.stringify({
          query,
          variables,
        }),
    });

  const data =
    await parseShopifyResponse(
      response,
      "Shopify Admin GraphQL"
    );

  if (
    data.errors?.length
  ) {
    console.error(
      "SHOPIFY GRAPHQL ERRORS:",
      data.errors
    );

    throw new Error(
      data.errors
        .map(
          (error) =>
            error.message
        )
        .join("; ")
    );
  }

  return data.data;
}

/* -----------------------------
   USER ERRORS
----------------------------- */

export function throwUserErrors(
  errors = []
) {
  if (
    Array.isArray(errors) &&
    errors.length
  ) {
    throw new Error(
      errors
        .map(
          (error) =>
            error.message
        )
        .join("; ")
    );
  }
}

/* -----------------------------
   INVENTORY LOCATION
----------------------------- */

export async function getPrimaryLocation() {
  const data =
    await shopifyAdminGraphql(`
      query AdminLocations {
        locations(
          first: 20,
          includeInactive: false
        ) {
          nodes {
            id
          }
        }
      }
    `);

  const locations =
    data.locations?.nodes || [];

  return locations[0] || null;
}
