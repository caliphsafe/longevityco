/*
  LONGEVITY ADMIN — BULK EDIT STABILITY FIX
  Prevents the Shop Editor MutationObserver from causing an endless
  renderBulkProducts -> DOM mutation -> observer -> renderBulkProducts loop.
*/
(() => {
  let installed = false;
  let lastSignature = null;

  function bulkSignature() {
    if (typeof BULK_PRODUCTS === "undefined") return "no-bulk-products";
    try {
      return JSON.stringify((BULK_PRODUCTS || []).map(product => ({
        id: product.id,
        productId: product.productId,
        isExisting: !!product.isExisting,
        name: product.name,
        price: product.price,
        type: product.type,
        status: product.status,
        vendor: product.vendor,
        description: product.description,
        collectionIds: product.collectionIds || [],
        sizes: (product.sizes || []).map(size => ({
          name: size.name,
          quantity: size.quantity,
          variantId: size.variantId || null,
        })),
        images: (product.images || []).map(image => ({
          id: image.id,
          url: image.url,
          order: image.order,
          existing: !!image.existing,
          filename: image.filename || "",
        })),
        state: product.state,
        error: product.error,
      })));
    } catch (error) {
      return String(Date.now());
    }
  }

  function install() {
    if (installed) return true;
    const original = window.renderBulkProducts;
    if (typeof original !== "function") return false;

    window.renderBulkProducts = function(...args) {
      const signature = bulkSignature();
      const wrap = document.getElementById("bulk-products-wrap");

      // If the exact same bulk state is already rendered, do nothing.
      // This is what breaks the observer loop that was freezing Bulk Edit.
      if (signature === lastSignature && wrap) return;

      const result = original.apply(this, args);
      lastSignature = bulkSignature();
      return result;
    };

    // Any reset should allow a fresh render the next time Bulk Edit opens.
    const originalReset = window.resetBulkUpload;
    if (typeof originalReset === "function") {
      window.resetBulkUpload = function(...args) {
        lastSignature = null;
        return originalReset.apply(this, args);
      };
    }

    installed = true;
    return true;
  }

  // Install as soon as the bulk functions are available.
  if (!install()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries > 80) clearInterval(timer);
    }, 100);
  }

  // When the user clicks Bulk Edit, clear the render signature first so
  // the newly selected products are guaranteed to paint once.
  document.addEventListener("click", event => {
    if (event.target?.closest?.("#bulk-edit-selected-btn")) {
      lastSignature = null;
    }
  }, true);
})();
