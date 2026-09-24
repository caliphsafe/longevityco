LONGEVITY CO. — INVENTORY ITEMS RESTORE FIX — 43 BUILD

REPLACE:
- admin-inventory-bulk.js
- admin-sort.js
- admin.html

WHAT BROKE
The new Inventory bulk editor tried to read:
- window.ADMIN_PRODUCTS
- window.ADMIN_LOCATIONS

But the existing admin defines those with top-level `let`, so they are available to
other classic scripts as globals but are NOT properties on `window`.

That made the new Inventory UI think there were zero products, even though the
Products page still had them.

FIX
- Inventory bulk editor now reads the existing ADMIN_PRODUCTS and ADMIN_LOCATIONS globals directly.
- It uses the existing getVariantSize() and apiJson() functions directly.
- It re-renders whenever the main admin data reloads.
- Cache version bumped so the corrected addon is loaded immediately.

No API, Shopify, scope, or environment-variable changes are required.
