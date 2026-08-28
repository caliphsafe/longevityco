LONGEVITY ADMIN — FULL MOBILE UX OVERHAUL 43 BUILD

REPLACE:
- admin-mobile.css
- admin-sort.js
- admin-bulk-edit-stability.js
- admin-select-visible.js

ADD:
- admin-mobile-ux.js

WHAT CHANGED

1. MOBILE ADMIN NAVIGATION
- Replaces the cramped horizontal-scroll admin navigation with a real slide-out mobile menu.
- Adds a Menu control to the mobile admin header.
- Shows the current admin section in the header.
- Menu automatically closes after choosing a section.
- Works with the dynamically injected Shop Editor section.
- Desktop navigation remains unchanged.

2. PRODUCTS MOBILE VIEW
- Product image and product information now appear FIRST.
- Status and actions appear in a dedicated action row BELOW the product information.
- Make Live / Make Draft, Edit, Archive / Restore are large touch-friendly buttons.
- Product status is clearly separated from actions.
- Selection checkbox sits over the image corner without disrupting layout.
- Selected products receive a clear card border.
- Long product names can wrap instead of being cut off.
- Bulk selected actions are converted into a clean 2-column mobile action area.
- Select All / Deselect All remain mobile friendly.

3. DASHBOARD
- Metrics become a clean 2-column mobile grid.
- Dashboard panels stack vertically.
- Period controls become equal-width touch buttons.

4. ORDERS / CUSTOMERS / DISCOUNTS / DRAFT ORDERS / ABANDONED
- Desktop rows become readable mobile cards.
- Important name / order information stays primary.
- Money / status / recovery actions stay visible without squeezing content.
- Drawers become full-screen mobile detail views.

5. INVENTORY
- Product and stock controls become mobile cards.
- Variant stock editors use a touch-friendly 2-column layout.
- Inventory fields/buttons are enlarged.

6. ADD / EDIT PRODUCT
- Forms become a clean vertical flow.
- Inputs use mobile-safe 16px text.
- Upload/image grids and size controls are optimized for thumb use.
- Save controls remain accessible at the bottom.

7. BULK UPLOAD / BULK EDIT + SHOP EDITOR
- Product fields collapse to single-column mobile layouts.
- Image grids remain usable.
- Shop Editor product controls stack correctly.

No Shopify API, scopes, database, product data, or environment variable changes.
Desktop admin remains unchanged.
