import { requireAdmin } from "./_admin-auth.js";
import {
  shopifyAdminGraphql,
  throwUserErrors,
} from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const {
      filename,
      mimeType,
      fileSize,
    } = req.body || {};

    if (!filename || !mimeType || !fileSize) {
      return res.status(400).json({
        error: "Missing filename, mime type, or file size",
      });
    }

    if (!String(mimeType).startsWith("image/")) {
      return res.status(400).json({
        error: "Only image uploads are supported",
      });
    }

    const data = await shopifyAdminGraphql(
      `
        mutation AdminStagedUpload($input: [StagedUploadInput!]!) {
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
            fileSize: String(fileSize),
            resource: "PRODUCT_IMAGE",
            httpMethod: "POST",
          },
        ],
      }
    );

    throwUserErrors(data.stagedUploadsCreate?.userErrors);

    const target = data.stagedUploadsCreate?.stagedTargets?.[0];

    if (!target) {
      throw new Error("Shopify did not return an upload target");
    }

    return res.status(200).json({
      uploadUrl: target.url,
      resourceUrl: target.resourceUrl,
      parameters: target.parameters || [],
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
