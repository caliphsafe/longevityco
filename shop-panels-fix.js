(() => {
  // Shop + product-page behavior only.
  // Uniform already opens its cart panel through uniform.js.

  if (typeof toggleFavorite === "function") {
    const originalToggleFavorite = toggleFavorite;

    toggleFavorite = function(product) {
      const key = product?.id || product?.handle || "";
      const wasFavorite = key && typeof isFavorite === "function"
        ? isFavorite(key)
        : false;

      const result = originalToggleFavorite(product);

      const isNowFavorite = key && typeof isFavorite === "function"
        ? isFavorite(key)
        : false;

      // Only pop Favorites when the item was ADDED, not when it was removed.
      if (!wasFavorite && isNowFavorite) {
        if (typeof renderFavoritesPanel === "function") {
          renderFavoritesPanel();
        }
        if (typeof openPanel === "function") {
          openPanel("favorites-panel");
        }
      }

      return result;
    };
  }

  if (typeof addVariantToShopifyCart === "function") {
    const originalAddVariantToShopifyCart = addVariantToShopifyCart;

    addVariantToShopifyCart = async function(...args) {
      const cart = await originalAddVariantToShopifyCart.apply(this, args);

      // Successful add: update the panel and open it immediately.
      if (cart) {
        if (typeof updateCartCountUI === "function") {
          updateCartCountUI(cart.totalQuantity || 0);
        }
        if (typeof renderCartPanel === "function") {
          renderCartPanel(cart);
        }
        if (typeof openPanel === "function") {
          openPanel("cart-panel");
        }
      }

      return cart;
    };
  }

  // "View Cart" is an internal cart-page link, not a Shopify checkout link.
  // Keep it pointed at the local cart page even if older markup still carries
  // data-checkout-link somewhere in a cached page.
  function normalizeViewCartLinks() {
    document.querySelectorAll(".panel-cart-link").forEach((link) => {
      link.setAttribute("href", "cart.html");
      link.removeAttribute("data-checkout-link");
      link.removeAttribute("aria-disabled");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalizeViewCartLinks, { once: true });
  } else {
    normalizeViewCartLinks();
  }

  // renderCartPanel can run after page load. Re-assert the local View Cart link
  // whenever the side-cart content changes.
  const cartPanel = document.getElementById("cart-panel");
  if (cartPanel && "MutationObserver" in window) {
    new MutationObserver(normalizeViewCartLinks).observe(cartPanel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "data-checkout-link", "aria-disabled"],
    });
  }
})();
