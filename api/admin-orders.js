import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAdmin(req, res)) return;
  try {
    const data = await shopifyAdminGraphql(`
      query AdminOrders {
        orders(first: 100, sortKey: CREATED_AT, reverse: true) {
          nodes {
            id name createdAt updatedAt email phone
            displayFinancialStatus displayFulfillmentStatus
            subtotalPriceSet { shopMoney { amount currencyCode } }
            totalDiscountsSet { shopMoney { amount currencyCode } }
            totalShippingPriceSet { shopMoney { amount currencyCode } }
            totalTaxSet { shopMoney { amount currencyCode } }
            totalPriceSet { shopMoney { amount currencyCode } }
            customer {
              id firstName lastName
              defaultEmailAddress { emailAddress }
              defaultPhoneNumber { phoneNumber }
            }
            shippingAddress {
              name address1 address2 city province provinceCode country zip phone
            }
            billingAddress {
              name address1 address2 city province provinceCode country zip phone
            }
            lineItems(first: 100) {
              nodes {
                id name title variantTitle quantity sku
                originalTotalSet { shopMoney { amount currencyCode } }
                discountedTotalSet { shopMoney { amount currencyCode } }
              }
            }
          }
        }
      }
    `);
    return res.status(200).json({ orders: data.orders?.nodes || [] });
  } catch (error) {
    console.error("ADMIN ORDERS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
