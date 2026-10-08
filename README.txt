LONGEVITY CO. — SHOP CART + FAVORITES PANELS — 43 BUILD

REPLACE:
- shop.html
- product.html
- uniform.html

ADD:
- shop-panels-fix.js

REQUESTED FIXES ONLY

1. ADD TO CART
- Shop cards now automatically open the side cart after a successful add.
- Shop quick-view drawer adds now automatically open the side cart.
- Product-page adds now automatically open the side cart.
- Related-product adds on product pages also open the side cart.
- Existing cart logic, sizes, inventory checks, Shopify cart APIs, and styling are unchanged.

2. ADD FAVORITE
- Adding a favorite from a Shop card opens the Favorites side panel.
- Adding a favorite from the Shop quick-view drawer opens the Favorites side panel.
- Adding a favorite from the main Product page opens the Favorites side panel.
- Adding a favorite from Related Products opens the Favorites side panel.
- Removing a favorite does NOT unnecessarily pop open the panel.

3. VIEW CART 404
Repository review found that the side-panel link labeled "View Cart" had
data-checkout-link on it. renderCartPanel() treats that attribute as a Shopify
checkout destination and overwrites cart.html with Shopify's checkoutUrl.

That meant "View Cart" was not reliably taking the customer to the site's own
cart.html page.

Fix:
- "View Cart" remains a local cart.html link.
- It is no longer marked as a Shopify checkout link.
- The real cart page's Checkout button still sends the customer to Shopify checkout.
- The Uniform side-cart View Cart link was corrected too, without changing Uniform behavior.

PRODUCT PAGE
The Product page did not contain the side Cart/Favorites panels at all. This build
adds the same existing side-panel markup already used by the Shop page so the
requested pop-up behavior works there without changing the product layout.

NO CHANGES TO:
- Shopify APIs
- cart API functions
- checkout flow on cart.html
- product/category rendering
- Featured behavior
- Uniform add-to-cart behavior
- Admin
- Password/countdown gate
