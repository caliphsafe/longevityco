let cachedToken = null;
let tokenExpiresAt = 0;

function getShopDomain() {
  const raw = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_SHOP;
  if (!raw) throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_SHOP");

  const cleaned = raw
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim();

  return cleaned.includes(".myshopify.com") ? cleaned : `${cleaned}.myshopify.com`;
}

function getApiVersion() {
  return process.env.SHOPIFY_API_VERSION || "2026-07";
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(`https://${getShopDomain()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Unable to get Shopify Admin access token");
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Number(data.expires_in || 86400) * 1000;
  return cachedToken;
}

export async function shopifyAdminGraphql(query, variables = {}) {
  const token = await getAccessToken();

  const response = await fetch(
    `https://${getShopDomain()}/admin/api/${getApiVersion()}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Shopify HTTP ${response.status}`);
  }

  if (data.errors?.length) {
    throw new Error(data.errors.map((error) => error.message).join("; "));
  }

  return data.data;
}

export function throwUserErrors(errors = []) {
  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join("; "));
  }
}

export async function getPrimaryLocation() {
  const data = await shopifyAdminGraphql(`
    query AdminLocations {
      locations(first: 20, includeInactive: false) {
        nodes {
          id
          name
          isActive
          fulfillsOnlineOrders
        }
      }
    }
  `);

  const locations = data.locations?.nodes || [];
  return (
    locations.find((location) => location.fulfillsOnlineOrders) ||
    locations.find((location) => location.isActive) ||
    locations[0] ||
    null
  );
}
