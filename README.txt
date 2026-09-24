LONGEVITY CO. — INVENTORY EDIT + BULK EDIT — 43 BUILD

REPLACE:
- admin.html
- admin-sort.js
- api/admin-inventory-update.js

ADD:
- admin-inventory-bulk.js
- admin-inventory-bulk.css

WHAT THIS ADDS TO INVENTORY
- Edit every size quantity directly from the Inventory page.
- Save a single changed size.
- Change multiple sizes and Save All Changes in one action.
- Select individual sizes with checkboxes.
- Select all visible sizes.
- Select/clear all sizes within a product.
- Set all selected sizes to one exact quantity.
- Add 1 or subtract 1 across selected sizes.
- Save only selected changed sizes.
- Search by product, category, or size.
- Filter by category.
- Filter All / In Stock / Low Stock (1–5) / Out of Stock.
- Sort by product name, total stock, or changed items first.
- Live counts for visible, selected, and changed variants.
- Fully responsive/mobile-friendly controls.

SHOPIFY
- The existing inventory API now supports both the original single-size update
  and batched inventory updates.
- Bulk saves are sent to Shopify in safe batches.
- No new Shopify scopes or environment variables are required.

IMPORTANT
- Quantity never goes below 0.
- Changes are only written to Shopify when Save is pressed.
- The Inventory page updates its in-memory Shopify quantities immediately after
  a successful save so the page stays in sync without a full reload.
