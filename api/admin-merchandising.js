
import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

const UNIFORM_PREFIX = "LC_UNIFORM:";
const DROP_PREFIX = "LC_DROP:";
const VALID_UNIFORM = ["HEADWEAR", "TOPS", "BOTTOMS", "OFF"];

async function getProducts() {
  const data = await shopifyAdminGraphql(`
    query AdminMerchandisingProducts {
      products(first: 100, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          productType
          status
          tags
          createdAt
          featuredImage { url altText }
        }
      }
    }
  `);
  return data.products?.nodes || [];
}

async function tagsAdd(id, tags) {
  const data = await shopifyAdminGraphql(`
    mutation AddMerchTags($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) { node { id } userErrors { field message } }
    }
  `, { id, tags });
  throwUserErrors(data.tagsAdd?.userErrors);
}

async function tagsRemove(id, tags) {
  if (!tags?.length) return;
  const data = await shopifyAdminGraphql(`
    mutation RemoveMerchTags($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) { node { id } userErrors { field message } }
    }
  `, { id, tags });
  throwUserErrors(data.tagsRemove?.userErrors);
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    try { return res.status(200).json({ products: await getProducts() }); }
    catch (error) { console.error("ADMIN MERCHANDISING GET ERROR:", error); return res.status(500).json({ error: error.message }); }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { action, productId, value, dropName } = req.body || {};
    if (!productId) return res.status(400).json({ error: "Product ID is required." });

    const products = await getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return res.status(404).json({ error: "Product not found." });

    if (action === "uniform") {
      const next = String(value || "").toUpperCase();
      if (!VALID_UNIFORM.includes(next)) return res.status(400).json({ error: "Invalid Uniform category." });
      const oldTags = (product.tags || []).filter(tag => String(tag).toUpperCase().startsWith(UNIFORM_PREFIX));
      await tagsRemove(productId, oldTags);
      if (next !== "OFF") await tagsAdd(productId, [`${UNIFORM_PREFIX}${next}`]);
      return res.status(200).json({ ok: true, value: next });
    }

    if (action === "drop" || action === "drop-remove") {
      const clean = String(dropName || "").trim().replace(/\s+/g, " ").slice(0, 60);
      if (!clean) return res.status(400).json({ error: "Drop name is required." });
      const tag = `${DROP_PREFIX}${clean}`;
      if (action === "drop") await tagsAdd(productId, [tag]);
      else {
        const exact = (product.tags || []).filter(t => String(t).toLowerCase() === tag.toLowerCase());
        await tagsRemove(productId, exact);
      }
      return res.status(200).json({ ok: true, dropName: clean });
    }

    return res.status(400).json({ error: "Unknown merchandising action." });
  } catch (error) {
    console.error("ADMIN MERCHANDISING POST ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
