import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

const FEATURE_PREFIX = "LC_FEATURED:";
const CATEGORIES = ["T-Shirts", "Hoodies", "Pants", "Shorts", "Headwear", "Accessories"];

function featureSlot(tags = []) {
  for (const tag of tags || []) {
    const match = String(tag).match(/^LC_FEATURED:([1-4])$/i);
    if (match) return Number(match[1]);
  }
  return 0;
}

function inferCategory(title = "", currentType = "") {
  const direct = String(currentType || "").trim().toLowerCase();
  const directMap = {
    "t-shirts": "T-Shirts",
    "t-shirt": "T-Shirts",
    "t shirts": "T-Shirts",
    "tee": "T-Shirts",
    "tees": "T-Shirts",
    "hoodie": "Hoodies",
    "hoodies": "Hoodies",
    "pants": "Pants",
    "pant": "Pants",
    "shorts": "Shorts",
    "short": "Shorts",
    "headwear": "Headwear",
    "hat": "Headwear",
    "hats": "Headwear",
    "accessories": "Accessories",
    "accessory": "Accessories",
  };
  if (directMap[direct]) return directMap[direct];

  const clue = `${title} ${currentType}`.toLowerCase();
  if (/(hoodie|hooded|sweatshirt|pullover)/.test(clue)) return "Hoodies";
  if (/(t[\s-]?shirt|tee\b|shirt\b|long[\s-]?sleeve|jersey)/.test(clue)) return "T-Shirts";
  if (/(sweatpant|jogger|trouser|jean|pants?\b)/.test(clue)) return "Pants";
  if (/(shorts?\b)/.test(clue)) return "Shorts";
  if (/(hat\b|cap\b|beanie|headwear|snapback)/.test(clue)) return "Headwear";
  return "Accessories";
}

async function getProducts() {
  const data = await shopifyAdminGraphql(`
    query ShopEditorProducts {
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

  return (data.products?.nodes || []).map(product => ({
    ...product,
    featuredSlot: featureSlot(product.tags),
    category: CATEGORIES.includes(product.productType)
      ? product.productType
      : inferCategory(product.title, product.productType),
    categoryIsSuggested: !CATEGORIES.includes(product.productType),
  }));
}

async function tagsAdd(id, tags) {
  const data = await shopifyAdminGraphql(`
    mutation AddShopEditorTags($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node { id }
        userErrors { field message }
      }
    }
  `, { id, tags });
  throwUserErrors(data.tagsAdd?.userErrors);
}

async function tagsRemove(id, tags) {
  if (!tags?.length) return;
  const data = await shopifyAdminGraphql(`
    mutation RemoveShopEditorTags($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) {
        node { id }
        userErrors { field message }
      }
    }
  `, { id, tags });
  throwUserErrors(data.tagsRemove?.userErrors);
}

async function updateCategory(productId, category) {
  if (!CATEGORIES.includes(category)) {
    throw new Error("Choose a valid shop category.");
  }

  const data = await shopifyAdminGraphql(`
    mutation UpdateShopCategory($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id title productType }
        userErrors { field message }
      }
    }
  `, {
    product: {
      id: productId,
      productType: category,
    },
  });

  throwUserErrors(data.productUpdate?.userErrors);
  return data.productUpdate?.product;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    try {
      const products = await getProducts();
      return res.status(200).json({
        products,
        featured: products.filter(product => product.featuredSlot).sort((a, b) => a.featuredSlot - b.featuredSlot),
        categories: CATEGORIES,
      });
    } catch (error) {
      console.error("ADMIN SHOP EDITOR GET ERROR:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      action,
      productId,
      category,
      featured,
      replaceProductId = null,
    } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required." });
    }

    if (action === "category") {
      const product = await updateCategory(productId, category);
      return res.status(200).json({ ok: true, product });
    }

    if (action !== "feature") {
      return res.status(400).json({ error: "Unknown Shop Editor action." });
    }

    const products = await getProducts();
    const target = products.find(product => product.id === productId);

    if (!target) {
      return res.status(404).json({ error: "Product not found." });
    }

    const targetFeatureTags = (target.tags || []).filter(tag => String(tag).toUpperCase().startsWith(FEATURE_PREFIX));

    if (!featured) {
      await tagsRemove(productId, targetFeatureTags);
      return res.status(200).json({ ok: true, featured: false });
    }

    if (target.featuredSlot) {
      return res.status(200).json({ ok: true, featured: true, slot: target.featuredSlot });
    }

    const featuredProducts = products
      .filter(product => product.featuredSlot)
      .sort((a, b) => a.featuredSlot - b.featuredSlot);

    const used = new Set(featuredProducts.map(product => product.featuredSlot));
    let slot = [1, 2, 3, 4].find(number => !used.has(number)) || 0;

    if (!slot) {
      if (!replaceProductId) {
        return res.status(409).json({
          error: "Four products are already featured. Choose one to replace.",
          code: "FEATURE_LIMIT",
          featured: featuredProducts,
        });
      }

      const replacement = featuredProducts.find(product => product.id === replaceProductId);
      if (!replacement) {
        return res.status(400).json({ error: "The selected replacement is no longer featured." });
      }

      slot = replacement.featuredSlot;
      const replacementTags = (replacement.tags || []).filter(tag => String(tag).toUpperCase().startsWith(FEATURE_PREFIX));
      await tagsRemove(replacement.id, replacementTags);
    }

    await tagsRemove(productId, targetFeatureTags);
    await tagsAdd(productId, [`${FEATURE_PREFIX}${slot}`]);

    return res.status(200).json({
      ok: true,
      featured: true,
      slot,
    });
  } catch (error) {
    console.error("ADMIN SHOP EDITOR POST ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
