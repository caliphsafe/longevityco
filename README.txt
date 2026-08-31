LONGEVITY CO. — ADMIN OPERATIONS EXPANSION V1 — 43 BUILD

PURPOSE
Expands the primary admin navigation to:
Dashboard → Orders → Fulfillment → Products → Shop Editor → Uniform Editor → Inventory → Drops → Customers → Discounts → Draft Orders → Returns → Abandoned → Analytics → Settings

REPLACE
- admin-sort.js

ADD
- admin-ops.css
- admin-ops.js
- api/admin-merchandising.js

REVERSAL
A copy of the exact pre-expansion admin-sort.js is included at:
- REVERT/admin-sort.js

To disable/revert the expansion:
1. Replace the root admin-sort.js with REVERT/admin-sort.js.
2. admin-ops.css, admin-ops.js and api/admin-merchandising.js can remain in the repo because nothing will load them after the revert, or you may delete them.

WHAT THIS VERSION ADDS
- Reordered primary navigation.
- Fulfillment queue from existing Shopify Orders data.
- Uniform Editor using LC_UNIFORM:HEADWEAR / TOPS / BOTTOMS product tags.
- Drops workspace using LC_DROP:<name> product tags.
- Returns workspace that safely surfaces refunded / partially-refunded orders without issuing refunds.
- Analytics summary using the existing dashboard/orders APIs.
- Settings page for local admin-interface preferences.
- Existing Dashboard, Orders, Products, Shop Editor, Inventory, Customers, Discounts, Draft Orders and Abandoned functionality remains underneath this modular layer.

IMPORTANT SAFETY / SCOPE NOTES
- No new Shopify scopes are required for this V1.
- Uniform Editor and Drops use the already-granted product write access through Shopify product tags.
- Fulfillment is currently an operational queue, not a fulfillment mutation.
- Returns is currently a review workspace, not a refund/restock mutation.
- Drops do not publish/unpublish products or change inventory.
- Settings are browser-local and do not change Shopify.
- Shopify remains the source of truth.
- No database changes and no new environment variables are required.
- Existing Add Product, Bulk Upload and Archive views are not deleted; they are simply removed from the primary navigation to keep it focused.

FILES NOT TO REPLACE
- admin.html
- admin.js
- admin-v2.js
- admin-v2.css
- any existing Shopify API files
