import { requireAdmin } from "./_admin-auth.js";
import { shopifyAdminGraphql } from "./_shopify-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAdmin(req, res)) return;

  try {
    const days = Math.max(1, Math.min(90, Number(req.query?.days || 1)));
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [ordersData, productsData, abandonedData] = await Promise.all([
      shopifyAdminGraphql(`
        query DashboardOrders($query: String!) {
          orders(first: 100, sortKey: CREATED_AT, reverse: true, query: $query) {
            nodes {
              id name createdAt email displayFinancialStatus displayFulfillmentStatus
              totalPriceSet { shopMoney { amount currencyCode } }
              customer { firstName lastName }
              lineItems(first: 100) {
                nodes {
                  title quantity
                  variantTitle
                  discountedTotalSet { shopMoney { amount currencyCode } }
                }
              }
            }
          }
        }
      `, { query: `created_at:>=${since}` }),
      shopifyAdminGraphql(`
        query DashboardProducts {
          products(first: 100, query: "status:active OR status:draft") {
            nodes {
              id title
              variants(first: 100) {
                nodes { id title inventoryQuantity selectedOptions { name value } }
              }
            }
          }
        }
      `),
      shopifyAdminGraphql(`
        query DashboardAbandoned {
          abandonedCheckouts(first: 50, reverse: true) {
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
              lineItems(first: 20) {
                nodes {
                  title
                  quantity
                  variantTitle
                }
              }
            }
          }
        }
      `)
    ]);

    const orders = ordersData.orders?.nodes || [];
    const revenue = orders.reduce((sum, order) => sum + Number(order.totalPriceSet?.shopMoney?.amount || 0), 0);
    const unitsSold = orders.reduce((sum, order) => sum + (order.lineItems?.nodes || []).reduce((s, item) => s + Number(item.quantity || 0), 0), 0);
    const needsShipping = orders.filter(order => ["UNFULFILLED","PARTIALLY_FULFILLED"].includes(order.displayFulfillmentStatus));

    const variants = (productsData.products?.nodes || []).flatMap(product =>
      (product.variants?.nodes || []).map(variant => ({
        product: product.title,
        variant: variant.selectedOptions?.find(o => String(o.name).toLowerCase() === "size")?.value || variant.title,
        quantity: Number(variant.inventoryQuantity || 0),
      }))
    );
    const lowStockItems = variants.filter(v => v.quantity <= 5).sort((a,b) => a.quantity - b.quantity);

    const topMap = new Map();
    orders.forEach(order => {
      (order.lineItems?.nodes || []).forEach(item => {
        const current = topMap.get(item.title) || { title:item.title, units:0, revenue:0 };
        current.units += Number(item.quantity || 0);
        current.revenue += Number(item.discountedTotalSet?.shopMoney?.amount || 0);
        topMap.set(item.title, current);
      });
    });

    const abandoned = (abandonedData.abandonedCheckouts?.nodes || []).filter(checkout => !checkout.completedAt);

    return res.status(200).json({
      metrics: {
        revenue,
        orders: orders.length,
        averageOrder: orders.length ? revenue / orders.length : 0,
        unitsSold,
        needsShipping: needsShipping.length,
        lowStock: lowStockItems.filter(v => v.quantity > 0).length,
        soldOut: lowStockItems.filter(v => v.quantity === 0).length,
        abandoned: abandoned.length,
      },
      needsShipping: needsShipping.slice(0, 10).map(order => ({
        ...order,
        customer: [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") || order.email || "Guest"
      })),
      lowStockItems: lowStockItems.slice(0, 10),
      topProducts: [...topMap.values()].sort((a,b) => b.units - a.units).slice(0, 10),
      abandonedCheckouts: abandoned.slice(0, 10).map(c => ({
        ...c,
        email: c.customer?.defaultEmailAddress?.emailAddress || "",
        phone:
          c.customer?.defaultPhoneNumber?.phoneNumber ||
          c.shippingAddress?.phone ||
          c.billingAddress?.phone ||
          "",
        recoveryUrl: c.abandonedCheckoutUrl || "",
        customer: [c.customer?.firstName, c.customer?.lastName].filter(Boolean).join(" "),
        itemCount: (c.lineItems?.nodes || []).reduce((s,i)=>s+Number(i.quantity||0),0)
      })),
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
