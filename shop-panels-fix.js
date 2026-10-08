(() => {
  // Minimal storefront behavior patch.
  // This file intentionally does not observe or re-render the Shop catalog.

  if (typeof toggleFavorite === "function") {
    const originalToggleFavorite = toggleFavorite;

    toggleFavorite = function(product) {
      const key = product?.id || product?.handle || "";
      const wasFavorite =
        !!key &&
        typeof isFavorite === "function" &&
        isFavorite(key);

      const result = originalToggleFavorite(product);

      const isNowFavorite =
        !!key &&
        typeof isFavorite === "function" &&
        isFavorite(key);

      // Open Favorites only when a product has just been added.
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

      // Open the existing side cart only after Shopify confirms the add.
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

  function normalizeViewCartLinks() {
    document.querySelectorAll(".panel-cart-link").forEach((link) => {
      // Only change an attribute if it actually needs changing.
      // This avoids the recursive attribute-mutation loop from the previous build.
      if (link.getAttribute("href") !== "cart.html") {
        link.setAttribute("href", "cart.html");
      }
      if (link.hasAttribute("data-checkout-link")) {
        link.removeAttribute("data-checkout-link");
      }
      if (link.hasAttribute("aria-disabled")) {
        link.removeAttribute("aria-disabled");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalizeViewCartLinks, { once: true });
  } else {
    normalizeViewCartLinks();
  }
})();
