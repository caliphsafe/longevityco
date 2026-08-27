import { requireAdmin } from "./_admin-auth.js";
import {
  shopifyAdminGraphql,
  throwUserErrors,
} from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const {
      filename,
      mimeType,
    } = req.body || {};

    if (!filename) {
      return res.status(400).json({
        error: "Missing filename",
      });
    }

    if (!mimeType) {
      return res.status(400).json({
        error: "Missing mime type",
      });
    }

    if (!String(mimeType).startsWith("image/")) {
      return res.status(400).json({
        error: "Only image uploads are supported",
      });
    }

    const data = await shopifyAdminGraphql(
      `
        mutation AdminStagedUpload(
          $input: [StagedUploadInput!]!
        ) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }

            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        input: [
          {
            filename,
            mimeType,
            resource: "PRODUCT_IMAGE",
            httpMethod: "POST",
          },
        ],
      }
    );

    const result = data?.stagedUploadsCreate;

    if (!result) {
      console.error(
        "Shopify stagedUploadsCreate returned no result:",
        JSON.stringify(data, null, 2)
      );

      return res.status(500).json({
        error: "Shopify did not return a staged upload result",
      });
    }

    if (result.userErrors?.length) {
      console.error(
        "Shopify staged upload user errors:",
        JSON.stringify(result.userErrors, null, 2)
      );

      return res.status(400).json({
        error: result.userErrors
          .map((item) => item.message)
          .join("; "),
        details: result.userErrors,
      });
    }

    const target = result.stagedTargets?.[0];

    if (!target?.url || !target?.resourceUrl) {
      console.error(
        "Shopify staged upload target missing:",
        JSON.stringify(target, null, 2)
      );

      return res.status(500).json({
        error: "Shopify did not return a valid upload destination",
      });
    }

    return res.status(200).json({
      ok: true,
      uploadUrl: target.url,
      resourceUrl: target.resourceUrl,
      parameters: target.parameters || [],
    });
  } catch (error) {
    console.error("ADMIN UPLOAD ERROR:", error);

    return res.status(500).json({
      error: error?.message || "Unexpected upload error",
    });
  }
}
