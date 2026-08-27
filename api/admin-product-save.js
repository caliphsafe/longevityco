import { requireAdmin } from "./_admin-auth.js";
import {
  getPrimaryLocation,
  shopifyAdminGraphql,
  throwUserErrors,
} from "./_shopify-admin.js";

function cleanSizes(sizes = []) {
  return sizes
    .map((size) => ({
      name: String(size.name || "").trim(),
      quantity: Math.max(0, Number(size.quantity || 0)),
      variantId: size.variantId || null,
    }))
    .filter((size) => size.name);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const {
      productId,
      title,
      descriptionHtml = "",
      productType = "Product",
      vendor = "Longevity Co.",
      status = "DRAFT",
      price = 0,
      collectionIds = [],
      sizes = [],
      files = [],
      locationId,
    } = req.body || {};

    if (!title?.trim()) {
      return res.status(400).json({ error: "Product title is required" });
    }

    const clean = cleanSizes(sizes);
    if (!clean.length) {
      return res.status(400).json({ error: "At least one size is required" });
    }

    const location = locationId
      ? { id: locationId }
      : await getPrimaryLocation();

    if (!location?.id) {
      return res.status(400).json({ error: "No Shopify inventory location is available" });
    }

    const productOptions = [{
      name: "Size",
      position: 1,
      values: clean.map((size) => ({ name: size.name })),
    }];

    const variants = clean.map((size) => ({
      ...(size.variantId ? { id: size.variantId } : {}),
      optionValues: [{ optionName: "Size", name: size.name }],
      price: Number(price || 0),
      inventoryQuantities: [{
        locationId: location.id,
        name: "available",
        quantity: size.quantity,
      }],
    }));

    const productSetInput = {
      title: title.trim(),
      descriptionHtml,
      productType,
      vendor,
      status: ["ACTIVE", "DRAFT"].includes(status) ? status : "DRAFT",
      collections: Array.isArray(collectionIds) ? collectionIds.filter(Boolean) : [],
      productOptions,
      variants,
    };

    if (Array.isArray(files) && files.length) {
      productSetInput.files = files.map((file) => {
        if (file.id) {
          return {
            id: file.id,
            alt: file.alt || title.trim(),
          };
        }

        return {
          originalSource: file.originalSource,
          filename: file.filename,
          contentType: file.contentType || "IMAGE",
          alt: file.alt || title.trim(),
        };
      });
    }

    const data = await shopifyAdminGraphql(`
      mutation AdminProductSet(
        $input: ProductSetInput!,
        $identifier: ProductSetIdentifiers,
        $synchronous: Boolean!
      ) {
        productSet(
          input: $input,
          identifier: $identifier,
          synchronous: $synchronous
        ) {
          product {
            id
            title
            handle
            status
            productType
            vendor
            featuredImage {
              url
              altText
            }
            collections(first: 20) {
              nodes {
                id
                title
                handle
              }
            }
            variants(first: 100) {
              nodes {
                id
                title
                price
                inventoryQuantity
                inventoryItem {
                  id
                }
                selectedOptions {
                  name
                  value
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
    `, {
      input: productSetInput,
      identifier: productId ? { id: productId } : null,
      synchronous: true,
    });

    throwUserErrors(data.productSet?.userErrors);

    return res.status(200).json({
      ok: true,
      product: data.productSet?.product,
      note:
        status === "ACTIVE"
          ? "Product status is ACTIVE. If your store requires explicit publication to a sales channel, add write_publications and publication handling."
          : "",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
