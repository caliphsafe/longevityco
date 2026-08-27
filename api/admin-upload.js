import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql, throwUserErrors } from "./_shopify-admin.js";

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) throw new Error("Invalid image data");
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdmin(req, res)) return;

  try {
    const { filename, mimeType, dataUrl } = req.body || {};
    if (!filename || !dataUrl) {
      return res.status(400).json({ error: "Missing file" });
    }

    const parsed = parseDataUrl(dataUrl);
    const type = mimeType || parsed.mimeType;

    if (!String(type).startsWith("image/")) {
      return res.status(400).json({ error: "Only images are supported" });
    }

    if (parsed.buffer.length > 4_500_000) {
      return res.status(400).json({ error: "Image is too large. Keep each image under about 4.5 MB." });
    }

    const staged = await shopifyAdminGraphql(`
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
    `, {
      input: [{
        filename,
        mimeType: type,
        resource: "PRODUCT_IMAGE",
        httpMethod: "POST",
      }],
    });

    throwUserErrors(staged.stagedUploadsCreate?.userErrors);

    const target = staged.stagedUploadsCreate?.stagedTargets?.[0];
    if (!target) throw new Error("Shopify did not return an upload target");

    const form = new FormData();
    (target.parameters || []).forEach((param) => form.append(param.name, param.value));
    form.append("file", new Blob([parsed.buffer], { type }), filename);

    const uploadResponse = await fetch(target.url, {
      method: "POST",
      body: form,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Shopify file upload failed (${uploadResponse.status})`);
    }

    return res.status(200).json({
      ok: true,
      resourceUrl: target.resourceUrl,
      filename,
      mimeType: type,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
