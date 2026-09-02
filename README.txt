LONGEVITY CO. — ADMIN BULK WORKSPACE + HOME UNIFORM — 43 BUILD

REPLACE:
- admin-sort.js
- admin-bulk-plus.js
- admin-bulk-plus.css
- index.html
- components.js

WHAT CHANGED — ADMIN
- "Bulk Upload / Edit" is forced into the main admin sidebar navigation.
- The nav injection survives the dynamic admin navigation rebuild.
- Bulk Upload / Edit is now a real mixed catalog workspace.
- Three clear ways to start:
  1. ADD EXISTING PRODUCTS
  2. ADD BLANK PRODUCT
  3. UPLOAD PRODUCT PHOTOS
- Existing Shopify products can be searched and filtered by status directly from the Bulk page.
- Select visible / clear selection controls.
- Add multiple existing products directly into the current workspace without leaving Bulk.
- Products already in the workspace are automatically excluded from the picker so duplicates are not added accidentally.
- Existing products keep their Shopify productId and variant IDs, so the existing Bulk Edit save path updates them in place.
- Existing Shopify images remain preserved and are treated as locked media.
- New/manual products can have images added directly to their individual card.
- Existing products with no current product image are no longer blocked by the "Image required" validation.
- Existing products cannot be duplicated accidentally as if they were new products.
- Mixed batches can contain both new products and existing products.
- Publish/save language now says SAVE rather than implying every item is a new upload.
- Desktop and mobile picker/workspace layouts are included.
- Existing Products-page Bulk Edit selection still works as before.

WHAT CHANGED — STOREFRONT NAVIGATION
- Uniform is present directly on the homepage navigation immediately after Shop.
- Uniform is also retained in the shared global navigation and footer.

CACHE
- admin-sort.js now loads admin add-ons with ?v=4 to force the newest Bulk workspace files.

NO NEW:
- Shopify scopes
- environment variables
- database tables
- API endpoints

IMPORTANT
The existing admin-bulk.js, admin-bulk-edit.js, admin-bulk-edit-stability.js, and Shopify save APIs stay in place and continue doing the actual save/upload work.
