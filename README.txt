LONGEVITY CO. — EDITORIAL SHOP + SHOP EDITOR 43 BUILD

REPLACE
-------
shop.html
admin-sort.js
api/admin-products.js
api/shopify-products.js

ADD
---
shop-editorial.css
shop-editorial.js
admin-shop-editor.css
admin-shop-editor.js
api/admin-shop-editor.js

WHAT THIS BUILD DOES
--------------------

PUBLIC SHOP
• Reworks the Shop page into a more editorial fashion layout.
• Featured section appears first with up to four products.
• Featured item #1 receives the largest visual treatment on desktop.
• Under Featured, All Items flows in this editorial order:
  1. Hoodies
  2. T-Shirts
  3. Pants
  4. Shorts
  5. Headwear
  6. Accessories
• Category navigation:
  All / Hoodies / T-Shirts / Pants / Shorts / Headwear / Accessories
• "All" shows editorial category sections; individual filters show only that category.
• Existing Shopify manual collection order is preserved inside each category.
• Existing cart, favorites, size selection, sold-out logic, hover image, product drawer,
  and product links remain connected to the existing storefront code.

SHOP EDITOR IN ADMIN
--------------------
A new "Shop Editor" navigation item is injected into the existing admin.

It includes:
• Four visible Featured slots.
• Toggle any product Featured / Not Featured.
• Hard maximum of four featured products.
• If a fifth product is selected, a replacement window shows the four current featured
  products and asks which one should be replaced.
• Category selector on every product.
• Product search.
• Category filter.
• "Needs Category Review" filter.
• "Apply Suggested Categories" button.

CATEGORY LOGIC
--------------
The categories are:
• T-Shirts
• Hoodies
• Pants
• Shorts
• Headwear
• Accessories

Existing products are initially classified using their Shopify product type plus clues in
their product names. This means the public Shop becomes organized immediately even before
every product is manually reviewed.

When a category is changed in the Shop Editor it is saved to Shopify's productType and
becomes the permanent source of truth.

NORMAL PRODUCT EDITOR
---------------------
The existing Product Type selector is enhanced with the six Shop categories. Saving through
the normal Add/Edit Product form already writes productType to Shopify, so no separate
product save endpoint change is required.

BULK UPLOAD / BULK EDIT
-----------------------
The existing bulk system is enhanced at runtime:
• New products are automatically assigned a suggested category from their names.
• Existing products opened in Bulk Edit show the six Shop categories.
• The Apply-to-All product type control becomes a Shop Category control.
• Bulk save continues using the existing productType field and existing save endpoint.

FEATURED STORAGE
----------------
Featured selection is stored on the Shopify product as one internal tag:
LC_FEATURED:1
LC_FEATURED:2
LC_FEATURED:3
LC_FEATURED:4

This keeps Shopify as the source of truth and gives the four featured products stable slots.
No separate database is required.

IMPORTANT
---------
No new Vercel environment variables are required.
No new database is required.
No package-lock.json is included.

The existing Shopify app already needs read_products/write_products access for the current
product admin. This build uses those same product permissions for category and tag updates.

FIRST USE
---------
1. Replace/add the files above in GitHub.
2. Let Vercel redeploy.
3. Open Longevity Admin.
4. Open "Shop Editor".
5. Review the suggested categories.
6. Click "Apply Suggested Categories" if the suggestions look correct.
7. Toggle four products as Featured.
8. Open the public Shop page and review the new editorial layout.

NOTE ABOUT NO FEATURED PRODUCTS
-------------------------------
Before any Featured selections are saved, the public Shop temporarily uses the first four
products in editorial order so the new page does not launch with an empty Featured section.
As soon as at least one product is explicitly featured, the storefront uses the saved
Featured selections.
