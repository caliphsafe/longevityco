LONGEVITY CO. — UNIFORM AUTO-LIVE + EDITOR OVERRIDE FIX — 43 BUILD

REPLACE:
- uniform.js
- uniform.html
- admin-ops.js
- admin-sort.js
- admin.html
- api/admin-merchandising.js

WHAT WAS WRONG
The Uniform Editor was saving LC_UNIFORM tags in Shopify, but the public Uniform
page was not reading those tags. It was only guessing from product title/type.
Also, choosing OFF removed the Uniform tag entirely, which cannot work once
untagged live products become automatic.

NEW BEHAVIOR
1. Any LIVE / published garment defaults onto the Uniform page automatically.
2. Default placement is inferred from Shopify Product Type + product title:
   - Hoodies / tees / shirts / sweaters / jerseys -> TOPS
   - Pants / shorts / joggers / denim / cargos / chinos -> BOTTOMS
   - Hats / caps / beanies / snapbacks / truckers -> HEADWEAR
3. Uniform Editor can override any item to HEADWEAR, TOPS, or BOTTOMS.
4. Choosing OFF now writes LC_UNIFORM:OFF, so the item stays hidden.
5. Explicit Uniform Editor choices always override the automatic placement.
6. The public Uniform page now reads all published Shopify products instead of
   depending on the shop-all collection.
7. The Uniform Editor now shows "Auto: TOPS/BOTTOMS/HEADWEAR" when the product
   is appearing by default, and "Uniform: ..." once it has an explicit setting.

IMPORTANT
- Existing explicit HEADWEAR / TOPS / BOTTOMS choices now work on the public page.
- Existing products with no Uniform tag will automatically appear if their
  product type/title maps cleanly to one of the three Uniform sections.
- Products that do not map to Headwear/Tops/Bottoms (for example a generic
  accessory) stay out by default, but can be explicitly assigned in Uniform Editor.
- Products with no available-for-sale variant remain excluded from the builder.
- No new environment variables or Shopify scopes are required.

CACHE
Version numbers were bumped for Uniform and Admin add-ons.
