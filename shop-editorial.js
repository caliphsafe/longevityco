/*
  LONGEVITY CO. — EDITORIAL SHOP
  Uses Shopify productType for category and LC_FEATURED:1..4 tags for featured slots.
  Existing products with generic product types are categorized from their titles until
  an admin explicitly assigns a category.
*/
(() => {
  const CATEGORY_ORDER = [
    ["hoodies", "Hoodies"],
    ["t-shirts", "T-Shirts"],
    ["pants", "Pants"],
    ["shorts", "Shorts"],
    ["headwear", "Headwear"],
    ["accessories", "Accessories"],
  ];

  const KNOWN = new Map(CATEGORY_ORDER.map(([key, label]) => [key, label]));
  let activeFilter = "all";
  let hasRendered = false;

  function clean(value) {
    return String(value || "").trim().toLowerCase();
  }

  function slugFromType(value) {
    const raw = clean(value)
      .replace(/[_/]+/g, " ")
      .replace(/\s+/g, " ");

    if (["hoodie", "hoodies", "sweatshirt", "sweatshirts"].includes(raw)) return "hoodies";
    if (["t-shirt", "t-shirts", "t shirt", "t shirts", "tee", "tees", "shirt", "shirts"].includes(raw)) return "t-shirts";
    if (["pant", "pants", "trouser", "trousers", "jogger", "joggers"].includes(raw)) return "pants";
    if (["short", "shorts"].includes(raw)) return "shorts";
    if (["headwear", "hat", "hats", "cap", "caps", "beanie", "beanies"].includes(raw)) return "headwear";
    if (["accessory", "accessories"].includes(raw)) return "accessories";
    return "";
  }

  function categoryFor(product) {
    const direct = slugFromType(product?.category || product?.raw?.productType);
    if (direct) return direct;

    const clue = clean([
      product?.name,
      product?.title,
      product?.raw?.title,
      product?.raw?.productType,
    ].filter(Boolean).join(" "));

    if (/(hoodie|hooded|sweatshirt|pullover)/.test(clue)) return "hoodies";
    if (/(t[\s-]?shirt|tee\b|shirt\b|long[\s-]?sleeve|jersey)/.test(clue)) return "t-shirts";
    if (/(sweatpant|jogger|trouser|jean|pants?\b)/.test(clue)) return "pants";
    if (/(shorts?\b)/.test(clue)) return "shorts";
    if (/(hat\b|cap\b|beanie|headwear|snapback)/.test(clue)) return "headwear";
    if (/(bag\b|sock|belt|scarf|keychain|pin\b|accessor)/.test(clue)) return "accessories";

    return "accessories";
  }

  function featureSlot(product) {
    const tags = product?.raw?.tags || [];
    for (const tag of tags) {
      const match = String(tag).match(/^LC_FEATURED:([1-4])$/i);
      if (match) return Number(match[1]);
    }
    return 0;
  }

  function categoryRank(product) {
    const category = categoryFor(product);
    const index = CATEGORY_ORDER.findIndex(([key]) => key === category);
    return index < 0 ? CATEGORY_ORDER.length : index;
  }

  function editorialSort(products) {
    return [...products].sort((a, b) => {
      const categoryDiff = categoryRank(a) - categoryRank(b);
      if (categoryDiff) return categoryDiff;

      // Preserve Shopify collection manual order inside each category.
      const ai = SHOP_PRODUCTS.indexOf(a);
      const bi = SHOP_PRODUCTS.indexOf(b);
      return ai - bi;
    });
  }

  function selectedFeatured(products) {
    const tagged = products
      .filter(product => featureSlot(product))
      .sort((a, b) => featureSlot(a) - featureSlot(b))
      .slice(0, 4);

    // Fresh installs still look complete before the admin chooses featured products.
    if (tagged.length) return tagged;
    return editorialSort(products).slice(0, 4);
  }

  function productCardMarkup(product, index = 0, featured = false) {
    const reveal = index % 3 === 0 ? "reveal-left" : index % 3 === 1 ? "reveal-up" : "reveal-right";
    return `
      <article
        class="product-card shop-product-card ${reveal} ${featured ? "is-editorial-featured" : ""}"
        data-product-handle="${escapeHtml(product.handle)}"
        data-product-name="${escapeHtml(product.name)}"
        data-product-price="${escapeHtml(product.price)}"
        data-product-image="${escapeHtml(product.image)}"
        data-product-second-image="${escapeHtml(product.secondImage || "")}"
        data-product-description="${escapeHtml(product.description)}"
        data-product-category="${escapeHtml(product.category)}"
        data-variants='${escapeHtml(JSON.stringify(product.variants))}'
      >
        <button class="favorite-btn" type="button" aria-label="Add to favorites">
          <span>${isFavorite(product.handle) ? "♥" : "♡"}</span>
        </button>

        <a class="product-image-link" href="product.html?handle=${encodeURIComponent(product.handle)}" aria-label="View ${escapeHtml(product.name)} product page">
          <div class="product-image-wrap">
            <img class="product-image-primary" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.imageAlt || product.name)}" />
            ${product.secondImage ? `
              <img class="product-image-secondary" src="${escapeHtml(product.secondImage)}" alt="${escapeHtml(product.name)} alternate image" />
            ` : ""}
          </div>
        </a>

        <div class="product-meta">
          <div>
            ${featured ? `<p class="editorial-card-category">${escapeHtml(KNOWN.get(categoryFor(product)) || "Collection")}</p>` : ""}
            <button class="product-title product-title-trigger" type="button">${escapeHtml(product.name)}</button>
            <p class="product-sub">${escapeHtml(product.price)}</p>
          </div>
        </div>

        <div class="product-actions">
          <div class="size-row" data-size-group>${buildSizeOptions(product)}</div>
          <button class="add-cart-btn" type="button">Add to Cart</button>
        </div>
      </article>
    `;
  }

  function activateCards(scope = document) {
    initSizeChips(scope);
    initShopInteractions();
    syncFavoriteButtons();
    initRevealAnimations();
  }

  function renderFeatured() {
    const wrap = document.getElementById("shop-featured-grid");
    const section = document.getElementById("shop-featured-section");
    if (!wrap || !section) return;

    const featured = selectedFeatured(SHOP_PRODUCTS);
    section.hidden = !featured.length;
    wrap.innerHTML = featured.map((product, index) => productCardMarkup(product, index, true)).join("");
    activateCards(wrap);
  }

  function renderCatalog() {
    const host = document.getElementById("editorial-catalog-sections");
    const count = document.getElementById("shop-count");
    if (!host) return;

    const all = editorialSort(SHOP_PRODUCTS);
    const visible = activeFilter === "all"
      ? all
      : all.filter(product => categoryFor(product) === activeFilter);

    if (count) count.textContent = `${visible.length} Item${visible.length === 1 ? "" : "s"}`;

    document.querySelectorAll("[data-editorial-filter]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.editorialFilter === activeFilter);
    });

    if (activeFilter !== "all") {
      const label = KNOWN.get(activeFilter) || "Collection";
      host.innerHTML = `
        <section class="editorial-category-block">
          <div class="editorial-category-heading">
            <h3>${escapeHtml(label)}</h3>
            <span>${visible.length}</span>
          </div>
          <div class="product-grid shop-grid editorial-category-grid">
            ${visible.map((product, index) => productCardMarkup(product, index)).join("")}
          </div>
        </section>
      `;
      activateCards(host);
      return;
    }

    host.innerHTML = CATEGORY_ORDER.map(([key, label]) => {
      const items = all.filter(product => categoryFor(product) === key);
      if (!items.length) return "";
      return `
        <section class="editorial-category-block" data-editorial-category="${key}">
          <div class="editorial-category-heading">
            <h3>${escapeHtml(label)}</h3>
            <span>${items.length}</span>
          </div>
          <div class="product-grid shop-grid editorial-category-grid">
            ${items.map((product, index) => productCardMarkup(product, index)).join("")}
          </div>
        </section>
      `;
    }).join("");

    activateCards(host);
  }

  function hideBootstrapGrid() {
    const grid = document.getElementById("shop-grid");
    if (grid) {
      grid.innerHTML = "";
      grid.classList.add("editorial-bootstrap-grid");
      grid.setAttribute("aria-hidden", "true");
    }
  }

  function renderAll() {
    if (!Array.isArray(SHOP_PRODUCTS) || !SHOP_PRODUCTS.length) return;
    hideBootstrapGrid();
    renderFeatured();
    renderCatalog();
    hasRendered = true;
  }

  function bindFilters() {
    document.querySelectorAll("[data-editorial-filter]").forEach(button => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.editorialFilter || "all";
        renderCatalog();
        const catalog = document.querySelector(".editorial-catalog-section");
        if (catalog) catalog.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function waitForProducts() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (Array.isArray(SHOP_PRODUCTS) && SHOP_PRODUCTS.length) {
        clearInterval(timer);
        // Allow the original shop bootstrap to finish its first render, then take ownership.
        setTimeout(renderAll, 50);
      } else if (attempts > 100) {
        clearInterval(timer);
      }
    }, 100);
  }

  function boot() {
    if (!document.getElementById("editorial-catalog-sections")) return;
    bindFilters();
    waitForProducts();

    // If another storefront action re-renders the hidden bootstrap grid, restore editorial view.
    const bootstrap = document.getElementById("shop-grid");
    if (bootstrap) {
      new MutationObserver(() => {
        if (hasRendered && bootstrap.children.length) hideBootstrapGrid();
      }).observe(bootstrap, { childList: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
