/*
  LONGEVITY ADMIN — SHOP EDITOR
  Injected by admin-sort.js so no admin.html replacement is required.
*/
(() => {
  const CATEGORIES = ["T-Shirts", "Hoodies", "Pants", "Shorts", "Headwear", "Accessories"];
  let state = { products: [], featured: [], loading: false, search: "", filter: "ALL" };
  let editorReady = false;

  const esc = value => typeof escapeHtml === "function"
    ? escapeHtml(value ?? "")
    : String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));

  function categoryOptions(selected) {
    return CATEGORIES.map(category => `
      <option value="${esc(category)}" ${category === selected ? "selected" : ""}>${esc(category)}</option>
    `).join("");
  }

  function inferCategory(name = "", type = "") {
    const direct = String(type || "").trim();
    if (CATEGORIES.includes(direct)) return direct;

    const clue = `${name} ${type}`.toLowerCase();
    if (/(hoodie|hooded|sweatshirt|pullover)/.test(clue)) return "Hoodies";
    if (/(t[\s-]?shirt|tee\b|shirt\b|long[\s-]?sleeve|jersey)/.test(clue)) return "T-Shirts";
    if (/(sweatpant|jogger|trouser|jean|pants?\b)/.test(clue)) return "Pants";
    if (/(shorts?\b)/.test(clue)) return "Shorts";
    if (/(hat\b|cap\b|beanie|headwear|snapback)/.test(clue)) return "Headwear";
    return "Accessories";
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function installNavAndView() {
    if (document.getElementById("view-shop-editor")) return;

    const nav = document.querySelector(".admin-sidebar nav");
    const productsButton = nav?.querySelector('[data-view="products"]');
    if (nav) {
      const button = document.createElement("button");
      button.className = "admin-nav-link";
      button.type = "button";
      button.dataset.view = "shop-editor";
      button.textContent = "Shop Editor";
      if (productsButton?.nextSibling) nav.insertBefore(button, productsButton.nextSibling);
      else nav.appendChild(button);

      button.addEventListener("click", () => {
        if (typeof switchView === "function") switchView("shop-editor");
        loadShopEditor();
      });
    }

    const main = document.querySelector(".admin-main");
    if (!main) return;

    const section = document.createElement("section");
    section.className = "admin-view";
    section.id = "view-shop-editor";
    section.dataset.viewPanel = "shop-editor";
    section.innerHTML = `
      <div class="admin-page-head">
        <div>
          <p class="admin-kicker">Merchandising</p>
          <h1>Shop Editor</h1>
        </div>
        <button class="admin-text-btn" id="shop-editor-refresh" type="button">Refresh</button>
      </div>

      <div class="shop-editor-intro">
        <div>
          <strong>Control the public shop.</strong>
          <p>Choose up to four featured pieces and assign every product to a storefront category.</p>
        </div>
        <button class="admin-primary-link" id="shop-editor-auto-category" type="button">Apply Suggested Categories</button>
      </div>

      <section class="shop-editor-featured-panel">
        <div class="shop-editor-section-head">
          <div>
            <p class="admin-kicker">Featured</p>
            <h2>Four Featured Slots</h2>
          </div>
          <span id="shop-editor-feature-count">0 / 4</span>
        </div>
        <div class="shop-editor-featured-grid" id="shop-editor-featured-grid"></div>
      </section>

      <section class="shop-editor-catalog-panel">
        <div class="shop-editor-section-head">
          <div>
            <p class="admin-kicker">Collection</p>
            <h2>Product Placement</h2>
          </div>
        </div>

        <div class="admin-toolbar v2-toolbar shop-editor-toolbar">
          <input id="shop-editor-search" type="search" placeholder="Search products" />
          <select id="shop-editor-filter">
            <option value="ALL">All Categories</option>
            ${CATEGORIES.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("")}
            <option value="SUGGESTED">Needs Category Review</option>
          </select>
        </div>

        <div id="shop-editor-products" class="shop-editor-products"></div>
        <div id="shop-editor-empty" class="admin-empty" hidden>No products found.</div>
      </section>

      <div class="shop-editor-modal-backdrop" id="shop-editor-modal-backdrop" hidden>
        <div class="shop-editor-modal" role="dialog" aria-modal="true" aria-labelledby="shop-editor-modal-title">
          <p class="admin-kicker">Featured Limit</p>
          <h2 id="shop-editor-modal-title">Choose a product to replace</h2>
          <p>Four products are already featured. Select the one that should leave the featured section.</p>
          <div id="shop-editor-replacement-list"></div>
          <button class="admin-text-btn" id="shop-editor-modal-cancel" type="button">Cancel</button>
        </div>
      </div>
    `;

    const dashboard = document.getElementById("view-dashboard");
    if (dashboard?.nextSibling) main.insertBefore(section, dashboard.nextSibling);
    else main.appendChild(section);

    document.getElementById("shop-editor-refresh")?.addEventListener("click", () => loadShopEditor(true));
    document.getElementById("shop-editor-search")?.addEventListener("input", event => {
      state.search = event.target.value || "";
      renderProducts();
    });
    document.getElementById("shop-editor-filter")?.addEventListener("change", event => {
      state.filter = event.target.value || "ALL";
      renderProducts();
    });
    document.getElementById("shop-editor-auto-category")?.addEventListener("click", applySuggestedCategories);
    document.getElementById("shop-editor-modal-cancel")?.addEventListener("click", closeReplacementModal);
    document.getElementById("shop-editor-modal-backdrop")?.addEventListener("click", event => {
      if (event.target.id === "shop-editor-modal-backdrop") closeReplacementModal();
    });
  }

  async function loadShopEditor(force = false) {
    if (state.loading) return;
    if (editorReady && !force) {
      renderAll();
      return;
    }

    state.loading = true;
    const host = document.getElementById("shop-editor-products");
    if (host) host.innerHTML = `<div class="admin-empty">Loading Shopify products...</div>`;

    try {
      const data = await request("/api/admin-shop-editor");
      state.products = data.products || [];
      state.featured = data.featured || [];
      editorReady = true;
      renderAll();
    } catch (error) {
      if (host) host.innerHTML = `<div class="admin-empty">${esc(error.message)}</div>`;
    } finally {
      state.loading = false;
    }
  }

  function renderAll() {
    state.featured = state.products
      .filter(product => Number(product.featuredSlot || 0) > 0)
      .sort((a,b) => Number(a.featuredSlot) - Number(b.featuredSlot));
    renderFeatured();
    renderProducts();
  }

  function renderFeatured() {
    const wrap = document.getElementById("shop-editor-featured-grid");
    const count = document.getElementById("shop-editor-feature-count");
    if (!wrap) return;

    if (count) count.textContent = `${state.featured.length} / 4`;

    const bySlot = new Map(state.featured.map(product => [Number(product.featuredSlot), product]));
    wrap.innerHTML = [1,2,3,4].map(slot => {
      const product = bySlot.get(slot);
      if (!product) {
        return `
          <div class="shop-editor-feature-slot is-empty">
            <span>${String(slot).padStart(2,"0")}</span>
            <p>Open slot</p>
          </div>
        `;
      }

      return `
        <div class="shop-editor-feature-slot">
          <span>${String(slot).padStart(2,"0")}</span>
          <div class="shop-editor-feature-media">
            ${product.featuredImage?.url ? `<img src="${esc(product.featuredImage.url)}" alt="${esc(product.title)}" />` : ""}
          </div>
          <strong>${esc(product.title)}</strong>
          <small>${esc(product.category)}</small>
          <button type="button" data-remove-feature="${esc(product.id)}">Remove</button>
        </div>
      `;
    }).join("");

    wrap.querySelectorAll("[data-remove-feature]").forEach(button => {
      button.addEventListener("click", () => setFeatured(button.dataset.removeFeature, false));
    });
  }

  function visibleProducts() {
    const q = state.search.trim().toLowerCase();
    return state.products.filter(product => {
      const category = product.category || inferCategory(product.title, product.productType);
      const searchMatch = !q || [product.title, product.handle, category, product.productType]
        .join(" ")
        .toLowerCase()
        .includes(q);

      const filterMatch =
        state.filter === "ALL" ||
        (state.filter === "SUGGESTED" && product.categoryIsSuggested) ||
        category === state.filter;

      return searchMatch && filterMatch;
    });
  }

  function renderProducts() {
    const wrap = document.getElementById("shop-editor-products");
    const empty = document.getElementById("shop-editor-empty");
    if (!wrap) return;

    const products = visibleProducts();
    if (empty) empty.hidden = !!products.length;

    wrap.innerHTML = products.map(product => {
      const category = product.category || inferCategory(product.title, product.productType);
      const featured = Number(product.featuredSlot || 0) > 0;

      return `
        <article class="shop-editor-product-row" data-shop-editor-product="${esc(product.id)}">
          <div class="shop-editor-product-image">
            ${product.featuredImage?.url ? `<img src="${esc(product.featuredImage.url)}" alt="${esc(product.title)}" />` : ""}
          </div>

          <div class="shop-editor-product-info">
            <strong>${esc(product.title)}</strong>
            <small>${product.categoryIsSuggested ? "Suggested from product name" : "Category saved in Shopify"}</small>
          </div>

          <label class="shop-editor-category-field">
            <span>Category</span>
            <select data-shop-category="${esc(product.id)}">
              ${categoryOptions(category)}
            </select>
          </label>

          <label class="shop-editor-feature-toggle">
            <input type="checkbox" data-shop-feature="${esc(product.id)}" ${featured ? "checked" : ""} />
            <span class="shop-editor-toggle-ui"></span>
            <strong>${featured ? `Featured ${product.featuredSlot}` : "Featured"}</strong>
          </label>
        </article>
      `;
    }).join("");

    wrap.querySelectorAll("[data-shop-category]").forEach(select => {
      select.addEventListener("change", () => saveCategory(select.dataset.shopCategory, select.value, select));
    });

    wrap.querySelectorAll("[data-shop-feature]").forEach(input => {
      input.addEventListener("change", async () => {
        const target = input.checked;
        input.disabled = true;
        const success = await setFeatured(input.dataset.shopFeature, target);
        if (!success) input.checked = !target;
        input.disabled = false;
      });
    });
  }

  async function saveCategory(productId, category, select) {
    const original = state.products.find(product => product.id === productId)?.category;
    select.disabled = true;

    try {
      await request("/api/admin-shop-editor", {
        method: "POST",
        body: JSON.stringify({ action: "category", productId, category }),
      });

      const product = state.products.find(product => product.id === productId);
      if (product) {
        product.category = category;
        product.productType = category;
        product.categoryIsSuggested = false;
      }

      // Keep the main Product editor in sync if it is opened afterward.
      if (typeof ADMIN_PRODUCTS !== "undefined") {
        const mainProduct = ADMIN_PRODUCTS.find(product => product.id === productId);
        if (mainProduct) mainProduct.productType = category;
      }
      renderAll();
    } catch (error) {
      alert(error.message);
      if (original) select.value = original;
    } finally {
      select.disabled = false;
    }
  }

  async function setFeatured(productId, featured, replaceProductId = null) {
    try {
      const data = await request("/api/admin-shop-editor", {
        method: "POST",
        body: JSON.stringify({
          action: "feature",
          productId,
          featured,
          replaceProductId,
        }),
      });

      await loadShopEditor(true);
      return !!data.ok;
    } catch (error) {
      if (error.status === 409 && error.data?.code === "FEATURE_LIMIT") {
        openReplacementModal(productId, error.data.featured || []);
        return false;
      }
      alert(error.message);
      return false;
    }
  }

  function openReplacementModal(newProductId, featuredProducts) {
    const backdrop = document.getElementById("shop-editor-modal-backdrop");
    const list = document.getElementById("shop-editor-replacement-list");
    if (!backdrop || !list) return;

    list.innerHTML = featuredProducts.map(product => `
      <button class="shop-editor-replace-option" type="button" data-replace-feature="${esc(product.id)}">
        <span>${String(product.featuredSlot || "").padStart(2,"0")}</span>
        ${product.featuredImage?.url ? `<img src="${esc(product.featuredImage.url)}" alt="" />` : ""}
        <strong>${esc(product.title)}</strong>
      </button>
    `).join("");

    list.querySelectorAll("[data-replace-feature]").forEach(button => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        const ok = await setFeatured(newProductId, true, button.dataset.replaceFeature);
        if (ok) closeReplacementModal();
        button.disabled = false;
      });
    });

    backdrop.hidden = false;
    document.body.classList.add("shop-editor-modal-open");
  }

  function closeReplacementModal() {
    const backdrop = document.getElementById("shop-editor-modal-backdrop");
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("shop-editor-modal-open");
  }

  async function applySuggestedCategories() {
    const suggested = state.products.filter(product => product.categoryIsSuggested);
    if (!suggested.length) {
      alert("Every product already has a saved shop category.");
      return;
    }

    if (!window.confirm(`Save the suggested category for ${suggested.length} product${suggested.length === 1 ? "" : "s"}?`)) return;

    const button = document.getElementById("shop-editor-auto-category");
    if (button) {
      button.disabled = true;
      button.textContent = "Categorizing...";
    }

    const failures = [];
    for (const product of suggested) {
      try {
        await request("/api/admin-shop-editor", {
          method: "POST",
          body: JSON.stringify({
            action: "category",
            productId: product.id,
            category: product.category || inferCategory(product.title, product.productType),
          }),
        });
      } catch (error) {
        failures.push(`${product.title}: ${error.message}`);
      }
    }

    await loadShopEditor(true);

    if (button) {
      button.disabled = false;
      button.textContent = "Apply Suggested Categories";
    }

    if (failures.length) {
      alert(`Some categories could not be saved:\n\n${failures.join("\n")}`);
    }
  }

  // Add storefront categories to the normal Add/Edit Product form.
  function enhanceProductEditor() {
    const select = document.getElementById("product-type");
    if (!select || select.dataset.shopCategoryEnhanced) return;
    select.dataset.shopCategoryEnhanced = "true";

    const legacy = Array.from(select.options).map(option => ({
      value: option.value,
      text: option.textContent,
    }));

    select.innerHTML = `
      <optgroup label="Shop Categories">
        ${CATEGORIES.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("")}
      </optgroup>
      <optgroup label="Legacy / Other">
        ${legacy.map(option => `<option value="${esc(option.value)}">${esc(option.text)}</option>`).join("")}
      </optgroup>
    `;

    const label = select.closest("label");
    if (label && !label.querySelector(".shop-category-help")) {
      const help = document.createElement("small");
      help.className = "shop-category-help";
      help.textContent = "This controls the category shown on the Shop page.";
      label.appendChild(help);
    }
  }

  // Add the same categories to both new-product Bulk Upload and existing-product Bulk Edit.
  function enhanceBulkEditor() {
    const global = document.getElementById("bulk-all-type");
    if (global && !global.dataset.shopCategoryEnhanced) {
      global.dataset.shopCategoryEnhanced = "true";
      global.innerHTML = `
        <option value="">Keep / detect category</option>
        ${CATEGORIES.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("")}
      `;
    }

    const originalIngest = window.ingestBulkFiles;
    if (typeof originalIngest === "function" && !originalIngest.__shopCategoryWrapped) {
      const wrapped = function(...args) {
        const result = originalIngest.apply(this, args);
        if (typeof BULK_PRODUCTS !== "undefined") {
          BULK_PRODUCTS.forEach(product => {
            if (!CATEGORIES.includes(product.type)) {
              product.type = inferCategory(product.name, product.type);
            }
          });
          if (typeof renderBulkProducts === "function") renderBulkProducts();
        }
        return result;
      };
      wrapped.__shopCategoryWrapped = true;
      window.ingestBulkFiles = wrapped;
    }

    const originalBuild = window.buildBulkProductCard;
    if (typeof originalBuild === "function" && !originalBuild.__shopCategoryWrapped) {
      const wrapped = function(product, index) {
        if (product && !CATEGORIES.includes(product.type)) {
          product.type = inferCategory(product.name, product.type);
        }

        let html = originalBuild.call(this, product, index);
        const options = CATEGORIES.map(category =>
          `<option value="${esc(category)}" ${product?.type === category ? "selected" : ""}>${esc(category)}</option>`
        ).join("");

        html = html.replace(
          /<select data-bulk-field="type">[\s\S]*?<\/select>/,
          `<select data-bulk-field="type">${options}</select>`
        );
        return html;
      };
      wrapped.__shopCategoryWrapped = true;
      window.buildBulkProductCard = wrapped;
    }

    // Existing bulk products may already be on screen.
    if (typeof BULK_PRODUCTS !== "undefined" && BULK_PRODUCTS.length && typeof renderBulkProducts === "function") {
      BULK_PRODUCTS.forEach(product => {
        if (!CATEGORIES.includes(product.type)) product.type = inferCategory(product.name, product.type);
      });
      renderBulkProducts();
    }
  }

  function boot() {
    installNavAndView();
    enhanceProductEditor();
    enhanceBulkEditor();

    // Some admin screens are dynamically re-rendered.
    const observer = new MutationObserver(() => {
      enhanceProductEditor();
      enhanceBulkEditor();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
