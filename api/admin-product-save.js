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

async function publishProductEverywhere(productId) {
  const publicationsData = await shopifyAdminGraphql(`
    query AdminPublications {
      publications(first: 100) {
        nodes {
          id
        }
      }
    }
  `);

  const publicationIds = (publicationsData.publications?.nodes || [])
    .map((publication) => publication.id)
    .filter(Boolean);

  if (!publicationIds.length) {
    throw new Error(
      "Product was created, but Shopify returned no publications to make it available on."
    );
  }

  const data = await shopifyAdminGraphql(`
    mutation AdminPublishProduct(
      $id: ID!,
      $input: [PublicationInput!]!
    ) {
      publishablePublish(
        id: $id,
        input: $input
      ) {
        publishable {
          availablePublicationsCount {
            count
          }
          resourcePublicationsCount {
            count
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    id: productId,
    input: publicationIds.map((publicationId) => ({
      publicationId,
    })),
  });

  throwUserErrors(data.publishablePublish?.userErrors);

  return {
    publicationIds,
    availablePublicationsCount:
      data.publishablePublish?.publishable?.availablePublicationsCount?.count ?? null,
    resourcePublicationsCount:
      data.publishablePublish?.publishable?.resourcePublicationsCount?.count ?? null,
  };
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

    const normalizedStatus = ["ACTIVE", "DRAFT"].includes(status)
      ? status
      : "DRAFT";

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
      status: normalizedStatus,
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

    const product = data.productSet?.product;

    if (!product?.id) {
      throw new Error("Shopify saved the request but did not return a product ID.");
    }

    let publication = null;

    if (normalizedStatus === "ACTIVE") {
      publication = await publishProductEverywhere(product.id);
    }

    return res.status(200).json({
      ok: true,
      product,
      published: normalizedStatus === "ACTIVE",
      publication,
      note:
        normalizedStatus === "ACTIVE"
          ? "Product is ACTIVE and has been published to the Shopify publications available to this app."
          : "Product saved as DRAFT and was not published.",
    });
  } catch (error) {
    console.error("ADMIN PRODUCT SAVE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
