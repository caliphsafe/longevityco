LONGEVITY CO. — UNIFORM LIVE PRODUCT VISIBILITY FIX — 43 BUILD

REPLACE:
- uniform.js
- uniform.css
- uniform.html

ROOT CAUSE
The Shop page shows live products even when their variants are sold out / inventory is 0.
The Uniform page was doing something different: it removed any product that did not
currently have an availableForSale variant.

This is why a newly-live shirt could:
- appear on Shop
- appear as TOPS in Uniform Editor
- still be missing from the public Uniform page

FIX
- Any published/live product assigned or auto-mapped to TOPS, BOTTOMS, or HEADWEAR
  is now visible in Uniform even when its current inventory is 0.
- Sold-out products display a SOLD OUT badge.
- Sold-out products can still be browsed/swiped in the Uniform carousel.
- A sold-out product is not added to cart.
- Saved Uniform looks can restore a product even if it later sells out.
- In-stock items continue to work exactly as before.

No API, Shopify scope, admin, or environment-variable changes are required.
