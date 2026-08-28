import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error:"Method not allowed" });
  if (!requireAdmin(req, res)) return;

  try {
    const data = await shopifyAdminGraphql(`
      query AdminAbandoned {
        abandonedCheckouts(first: 100, reverse: true) {
          nodes {
            id
            name
            createdAt
            updatedAt
            completedAt
            abandonedCheckoutUrl
            totalPriceSet { shopMoney { amount currencyCode } }
            customer {
              id
              firstName
              lastName
              defaultEmailAddress { emailAddress }
              defaultPhoneNumber { phoneNumber }
            }
            shippingAddress {
              name
              address1
              address2
              city
              province
              provinceCode
              country
              zip
              phone
            }
            billingAddress {
              name
              address1
              address2
              city
              province
              provinceCode
              country
              zip
              phone
            }
            lineItems(first: 50) {
              nodes {
                id
                title
                quantity
                variantTitle
              }
            }
          }
        }
      }
    `);

    const checkouts = (data.abandonedCheckouts?.nodes || []).map(checkout => ({
      ...checkout,
      email: checkout.customer?.defaultEmailAddress?.emailAddress || "",
      phone:
        checkout.customer?.defaultPhoneNumber?.phoneNumber ||
        checkout.shippingAddress?.phone ||
        checkout.billingAddress?.phone ||
        "",
      recoveryUrl: checkout.abandonedCheckoutUrl || "",
    }));

    return res.status(200).json({ checkouts });
  } catch (error) {
    console.error("ADMIN ABANDONED ERROR:", error);
    return res.status(500).json({ error:error.message });
  }
}
