LONGEVITY CO. — UNIFORM SOURCE-OF-TRUTH FIX — 43 BUILD

REPLACE:
- uniform.js
- uniform.html

ADD:
- api/uniform-products.js

WHAT THIS FIX CHANGES
The public Uniform page now gets its catalog from one dedicated endpoint that joins:
- the exact same shop-all collection used by the Shop page
- fresh Shopify Admin status + LC_UNIFORM tags used by Uniform Editor

This removes the mismatch where a product could be live on Shop and assigned to TOPS
in Uniform Editor but still not reach the public Uniform page.

The endpoint is no-cache, respects TOPS / BOTTOMS / HEADWEAR / OFF immediately,
and defaults untagged live garments from product type/title.

The Uniform page also tracks the catalog. When a genuinely new live product appears,
it is surfaced once as the visible product in that category instead of staying buried
behind a previously saved local Uniform selection.

No new environment variables or Shopify scopes are required.
