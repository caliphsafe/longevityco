LONGEVITY CO. — UNIFORM INTUITIVE BUILDER V6 43 BUILD

REPLACE:
- uniform.html
- uniform.css
- uniform.js

WHAT THIS BUILD DOES

1. REAL SHOPIFY CART
- Uses the storefront's existing live Shopify cart functions/API.
- All selected variants are added in one cart request.
- Duplicate selected variants are automatically combined as quantities.
- Cart count updates immediately.
- The existing Cart side panel opens after a successful add.
- Size/variant IDs are used instead of the old local-cart fallback.

2. HEADWEAR CAN BE NONE
- Headwear has a visible None toggle.
- Selecting None removes headwear from the look and cart total.
- Tapping None again restores the selected headwear.

3. PICK FOR ME
- One button generates a random available Headwear + Top + Bottom outfit.
- Only products in the correct Uniform category are used.
- An available variant is selected automatically.

4. MULTIPLE TOPS / BOTTOMS
- Starts with one Top and one Bottom.
- Users can progressively add up to 3 Tops and 2 Bottoms.
- Added layers can be removed.
- Each layer can independently cycle through products and select its own size.

5. SIZE SELECTION
- Every selected garment uses its real Shopify variants.
- Sold-out variants are disabled.
- Products without a meaningful size show One Size.

6. MORE PROMINENT CART CTA
- Desktop: large full-width black Add Uniform to Cart button with live total.
- Mobile: persistent bottom cart bar with item count, total and Add to Cart.
- Summary updates as the outfit changes.

7. RESPONSIVE UX
- Desktop stays visually centered and outfit-focused.
- Mobile reduces garment stage sizes, keeps controls thumb-friendly and stacks naturally.
- Extra layers only appear after the customer asks for them, keeping the initial experience clean.

CURRENT CATEGORY DETECTION
Headwear: headwear / hat / cap / beanie
Tops: hoodie / sweatshirt / crewneck / t-shirt / tee / shirt / sweater / longsleeve / top
Bottoms: pants / shorts / jogger / trouser / bottom

No Shopify Admin API, database, scopes, or environment changes.
