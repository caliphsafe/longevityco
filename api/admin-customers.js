import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAdmin(req, res)) return;
  try {
    const data = await shopifyAdminGraphql(`
      query AdminCustomers {
        customers(first: 100, sortKey: UPDATED_AT, reverse: true) {
          nodes {
            id firstName lastName createdAt updatedAt numberOfOrders state verifiedEmail tags
            amountSpent { amount currencyCode }
            defaultEmailAddress { emailAddress marketingState }
            defaultPhoneNumber { phoneNumber marketingState }
            defaultAddress {
              name address1 address2 city province provinceCode country countryCodeV2 zip phone
            }
          }
        }
      }
    `);
    return res.status(200).json({ customers: data.customers?.nodes || [] });
  } catch (error) {
    console.error("ADMIN CUSTOMERS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
