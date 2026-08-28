(() => {
  const LIMITS = { headwear: 1, tops: 3, bottoms: 2 };
  const state = {
    headwear: { items: [], selections: [], none: false },
    tops: { items: [], selections: [] },
    bottoms: { items: [], selections: [] },
  };

  const money = (amount, currency = "USD") => {
    const value = Number(amount || 0);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
      }).format(value);
    } catch {
      return `$${value.toFixed(2).replace(".00", "")}`;
    }
  };

  const escape = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function categoryOf(product) {
    const raw = `${product.productType || ""} ${product.title || ""}`.toLowerCase();
    if (/headwear|hat|cap|beanie/.test(raw)) return "headwear";
    if (/hoodie|sweatshirt|crewneck|t-shirt|t shirt|tee|shirt|top|sweater|longsleeve|long sleeve/.test(raw)) return "tops";
    if (/pants|pant|shorts|short|jogger|trouser|bottom/.test(raw)) return "bottoms";
    return "";
  }

  function normalizeProduct(product) {
    const images = product.images?.nodes || [];
    const variants = (product.variants?.nodes || []).map((variant) => ({
      id: variant.id,
      title: variant.title || "Default",
      availableForSale: variant.availableForSale !== false,
      selectedOptions: variant.selectedOptions || [],
      price: {
        amount: Number(variant.price?.amount || product.priceRange?.minVariantPrice?.amount || 0),
        currencyCode: variant.price?.currencyCode || product.priceRange?.minVariantPrice?.currencyCode || "USD",
      },
    }));
    const price = product.priceRange?.minVariantPrice || {};

    return {
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: product.featuredImage?.url || images[0]?.url || "",
      productType: product.productType || "",
      price: Number(price.amount || variants[0]?.price?.amount || 0),
      currency: price.currencyCode || variants[0]?.price?.currencyCode || "USD",
      variants,
    };
  }

  function variantLabel(variant) {
    if (!variant) return "Default";
    const size = (variant.selectedOptions || []).find(
      (option) => String(option.name || "").toLowerCase() === "size"
    );
    if (size?.value) return size.value;
    if (variant.title && variant.title !== "Default Title") return variant.title;
    return "One Size";
  }

  function firstAvailableVariant(product) {
    return product?.variants?.find((variant) => variant.availableForSale) ||
      product?.variants?.[0] ||
      null;
  }

  function createSelection(category, productIndex = 0) {
    const items = state[category].items;
    if (!items.length) return null;

    const safeIndex = ((productIndex % items.length) + items.length) % items.length;
    const product = items[safeIndex];
    const variant = firstAvailableVariant(product);

    return {
      uid: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productIndex: safeIndex,
      variantId: variant?.id || "",
    };
  }

  function selectedProduct(category, selection) {
    return state[category].items[selection.productIndex] || null;
  }

  function selectedVariant(category, selection) {
    const product = selectedProduct(category, selection);
    return product?.variants?.find((variant) => variant.id === selection.variantId) ||
      firstAvailableVariant(product);
  }

  function ensureInitialSelections() {
    ["headwear", "tops", "bottoms"].forEach((category) => {
      if (!state[category].items.length) return;
      if (!state[category].selections.length) {
        const selection = createSelection(category, 0);
        if (selection) state[category].selections.push(selection);
      }
    });
  }

  function setProductIndex(category, selectionIndex, nextIndex) {
    const bucket = state[category];
    const selection = bucket.selections[selectionIndex];
    if (!selection || !bucket.items.length) return;

    selection.productIndex = ((nextIndex % bucket.items.length) + bucket.items.length) % bucket.items.length;
    const product = selectedProduct(category, selection);
    const variant = firstAvailableVariant(product);
    selection.variantId = variant?.id || "";
    renderCategory(category);
    renderSummary();
  }

  function move(category, selectionIndex, direction) {
    const selection = state[category].selections[selectionIndex];
    if (!selection) return;
    setProductIndex(category, selectionIndex, selection.productIndex + direction);
  }

  function setVariant(category, selectionIndex, variantId) {
    const selection = state[category].selections[selectionIndex];
    if (!selection) return;
    selection.variantId = variantId;
    renderCategory(category);
    renderSummary();
  }

  function addLayer(category) {
    const bucket = state[category];
    if (bucket.selections.length >= LIMITS[category] || !bucket.items.length) return;

    const avoidIndex = bucket.selections.at(-1)?.productIndex ?? -1;
    const nextIndex = bucket.items.length > 1
      ? (avoidIndex + 1) % bucket.items.length
      : 0;

    const selection = createSelection(category, nextIndex);
    if (selection) bucket.selections.push(selection);

    renderCategory(category);
    renderSummary();
  }

  function removeLayer(category, selectionIndex) {
    const bucket = state[category];
    if (selectionIndex <= 0 && bucket.selections.length === 1) return;
    bucket.selections.splice(selectionIndex, 1);
    renderCategory(category);
    renderSummary();
  }

  function toggleHeadwearNone() {
    state.headwear.none = !state.headwear.none;
    const button = document.getElementById("uniform-headwear-none");
    button?.classList.toggle("is-active", state.headwear.none);
    button?.setAttribute("aria-pressed", String(state.headwear.none));
    renderCategory("headwear");
    renderSummary();
  }

  function buildVariantButtons(category, selectionIndex, product, selection) {
    const variants = product?.variants || [];
    if (!variants.length) return "";

    const meaningful = variants.length > 1 ||
      variantLabel(variants[0]) !== "One Size";

    if (!meaningful) {
      return `<div class="uniform-size-row"><span class="uniform-size-label">Option</span>
        <button class="uniform-size-chip is-selected" type="button" disabled>One Size</button></div>`;
    }

    return `<div class="uniform-size-row">
      <span class="uniform-size-label">Size</span>
      ${variants.map((variant) => {
        const active = variant.id === selectedVariant(category, selection)?.id;
        return `<button
          class="uniform-size-chip ${active ? "is-selected" : ""}"
          type="button"
          data-uniform-variant="${escape(variant.id)}"
          data-category="${category}"
          data-selection-index="${selectionIndex}"
          ${variant.availableForSale ? "" : "disabled"}
        >${escape(variantLabel(variant))}</button>`;
      }).join("")}
    </div>`;
  }

  function renderChoice(category, selection, selectionIndex) {
    const product = selectedProduct(category, selection);
    if (!product) return "";

    const variant = selectedVariant(category, selection);
    const priceAmount = Number(variant?.price?.amount ?? product.price);
    const currency = variant?.price?.currencyCode || product.currency;

    return `
      <article class="uniform-choice ${selectionIndex > 0 ? "is-extra" : ""}" data-uniform-choice="${escape(selection.uid)}">
        <button class="uniform-arrow prev" type="button" data-uniform-prev="${selectionIndex}" aria-label="Previous ${category}">←</button>

        <div class="uniform-choice-main">
          <div class="uniform-choice-stage">
            ${product.image ? `<img src="${escape(product.image)}" alt="${escape(product.title)}">` : ""}
          </div>
          <div class="uniform-choice-info">
            <strong>${escape(product.title)}</strong>
            <span>${escape(money(priceAmount, currency))}</span>
          </div>
        </div>

        <button class="uniform-arrow next" type="button" data-uniform-next="${selectionIndex}" aria-label="Next ${category}">→</button>

        <div class="uniform-choice-controls">
          ${buildVariantButtons(category, selectionIndex, product, selection)}
          ${selectionIndex > 0 ? `<button class="uniform-remove-layer" type="button" data-uniform-remove="${selectionIndex}">Remove</button>` : ""}
        </div>
      </article>
    `;
  }

  function renderCategory(category) {
    const bucket = state[category];
    const wrap = document.getElementById(`uniform-${category}-list`);
    if (!wrap) return;

    if (category === "headwear" && bucket.none) {
      wrap.innerHTML = `
        <div class="uniform-none-state">
          <div>
            <strong>No Headwear</strong>
            <span>Top + bottom only.</span>
          </div>
        </div>`;
    } else if (!bucket.items.length) {
      wrap.innerHTML = `
        <div class="uniform-none-state">
          <div><strong>No products available</strong><span>This category is currently empty.</span></div>
        </div>`;
    } else {
      wrap.innerHTML = bucket.selections
        .map((selection, index) => renderChoice(category, selection, index))
        .join("");
    }

    wrap.querySelectorAll("[data-uniform-prev]").forEach((button) => {
      button.addEventListener("click", () => move(category, Number(button.dataset.uniformPrev), -1));
    });
    wrap.querySelectorAll("[data-uniform-next]").forEach((button) => {
      button.addEventListener("click", () => move(category, Number(button.dataset.uniformNext), 1));
    });
    wrap.querySelectorAll("[data-uniform-remove]").forEach((button) => {
      button.addEventListener("click", () => removeLayer(category, Number(button.dataset.uniformRemove)));
    });
    wrap.querySelectorAll("[data-uniform-variant]").forEach((button) => {
      button.addEventListener("click", () => {
        setVariant(
          category,
          Number(button.dataset.selectionIndex),
          button.dataset.uniformVariant
        );
      });
    });

    const addButton = document.querySelector(`[data-add-layer="${category}"]`);
    if (addButton) {
      addButton.disabled = bucket.selections.length >= LIMITS[category] || !bucket.items.length;
      addButton.textContent =
        bucket.selections.length >= LIMITS[category]
          ? category === "tops" ? "Top Limit Reached" : "Bottom Limit Reached"
          : category === "tops" ? "+ Add Another Top" : "+ Add Another Bottom";
    }
  }

  function activeSelections() {
    const rows = [];
    ["headwear", "tops", "bottoms"].forEach((category) => {
      if (category === "headwear" && state.headwear.none) return;

      state[category].selections.forEach((selection) => {
        const product = selectedProduct(category, selection);
        const variant = selectedVariant(category, selection);
        if (!product || !variant) return;
        rows.push({ category, selection, product, variant });
      });
    });
    return rows;
  }

  function renderSummary() {
    const picks = activeSelections();
    const total = picks.reduce((sum, pick) => {
      return sum + Number(pick.variant?.price?.amount ?? pick.product.price ?? 0);
    }, 0);
    const currency = picks[0]?.variant?.price?.currencyCode || picks[0]?.product?.currency || "USD";

    const itemCountText = `${picks.length} item${picks.length === 1 ? "" : "s"}`;
    const totalText = money(total, currency);

    document.getElementById("uniform-total").textContent = totalText;
    document.getElementById("uniform-item-count").textContent = itemCountText;
    document.getElementById("uniform-add-cart-total").textContent = totalText;
    document.getElementById("uniform-mobile-count").textContent = itemCountText;
    document.getElementById("uniform-mobile-total").textContent = totalText;

    const list = document.getElementById("uniform-selected-list");
    list.innerHTML = picks.map((pick) => {
      const amount = Number(pick.variant?.price?.amount ?? pick.product.price ?? 0);
      const curr = pick.variant?.price?.currencyCode || pick.product.currency;
      const label = variantLabel(pick.variant);
      return `<div>
        <span>${escape(pick.product.title)}<small>${escape(label)}</small></span>
        <span>${escape(money(amount, curr))}</span>
      </div>`;
    }).join("");

    if (!picks.length) {
      list.innerHTML = `<div><span>No items selected</span><span></span></div>`;
    }

    const invalid = picks.some((pick) => !pick.variant?.id || pick.variant.availableForSale === false);
    const disable = !picks.length || invalid;
    document.getElementById("uniform-add-all").disabled = disable;
    document.getElementById("uniform-mobile-add").disabled = disable;
  }

  function randomIndex(length, disallow = []) {
    if (!length) return 0;
    const pool = Array.from({ length }, (_, index) => index).filter((index) => !disallow.includes(index));
    const usable = pool.length ? pool : Array.from({ length }, (_, index) => index);
    return usable[Math.floor(Math.random() * usable.length)];
  }

  function randomAvailableVariant(product) {
    const variants = (product?.variants || []).filter((variant) => variant.availableForSale);
    if (!variants.length) return product?.variants?.[0] || null;
    return variants[Math.floor(Math.random() * variants.length)];
  }

  function pickForMe() {
    state.headwear.none = false;
    document.getElementById("uniform-headwear-none")?.classList.remove("is-active");
    document.getElementById("uniform-headwear-none")?.setAttribute("aria-pressed", "false");

    ["headwear", "tops", "bottoms"].forEach((category) => {
      const bucket = state[category];
      if (!bucket.items.length) return;

      const index = randomIndex(bucket.items.length);
      const selection = createSelection(category, index);
      if (!selection) return;

      const product = bucket.items[index];
      const variant = randomAvailableVariant(product);
      selection.variantId = variant?.id || "";
      bucket.selections = [selection];
    });

    ["headwear", "tops", "bottoms"].forEach(renderCategory);
    renderSummary();

    const button = document.getElementById("uniform-pick-for-me");
    if (button) {
      const original = button.innerHTML;
      button.innerHTML = "<span>New Look</span><span>↻</span>";
      setTimeout(() => { button.innerHTML = original; }, 900);
    }
  }

  function aggregateCartLines(picks) {
    const map = new Map();
    picks.forEach((pick) => {
      const id = pick.variant?.id;
      if (!id) return;
      map.set(id, (map.get(id) || 0) + 1);
    });
    return Array.from(map, ([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
  }

  async function addUniformToCart(sourceButton) {
    const picks = activeSelections();
    if (!picks.length) return;

    const unavailable = picks.find((pick) => !pick.variant?.id || pick.variant.availableForSale === false);
    if (unavailable) {
      const message = document.getElementById("uniform-cart-message");
      message.textContent = "Choose an available size for every selected item.";
      message.classList.add("is-error");
      return;
    }

    const buttons = [
      document.getElementById("uniform-add-all"),
      document.getElementById("uniform-mobile-add"),
    ].filter(Boolean);

    buttons.forEach((button) => {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
    });

    const desktopButton = document.getElementById("uniform-add-all");
    const mobileButton = document.getElementById("uniform-mobile-add");
    const message = document.getElementById("uniform-cart-message");

    if (desktopButton) desktopButton.querySelector("span").textContent = "Adding...";
    if (mobileButton) mobileButton.textContent = "Adding...";
    if (message) {
      message.textContent = "";
      message.classList.remove("is-error");
    }

    try {
      const lines = aggregateCartLines(picks);
      let updatedCart = null;

      if (typeof ensureShopifyCart === "function" && typeof apiPostJson === "function") {
        const cart = await ensureShopifyCart();
        const response = await apiPostJson("/api/shopify-cart-lines-add", {
          cartId: cart.id,
          lines,
        });
        updatedCart = response?.cart || null;
      } else {
        throw new Error("Store cart is unavailable.");
      }

      if (updatedCart?.id && typeof setShopifyCartId === "function") {
        setShopifyCartId(updatedCart.id);
      }
      if (typeof updateCartCountUI === "function") {
        updateCartCountUI(updatedCart?.totalQuantity || 0);
      }
      if (typeof renderCartPanel === "function") {
        renderCartPanel(updatedCart);
      }
      if (typeof openPanel === "function") {
        openPanel("cart-panel");
      }

      if (desktopButton) desktopButton.querySelector("span").textContent = "Added to Cart";
      if (mobileButton) mobileButton.textContent = "Added";
      if (message) message.textContent = `${picks.length} item${picks.length === 1 ? "" : "s"} added to your cart.`;

      setTimeout(() => {
        if (desktopButton) desktopButton.querySelector("span").textContent = "Add Uniform to Cart";
        if (mobileButton) mobileButton.textContent = "Add to Cart";
        renderSummary();
      }, 1300);
    } catch (error) {
      console.error("Uniform cart error:", error);
      if (desktopButton) desktopButton.querySelector("span").textContent = "Add Uniform to Cart";
      if (mobileButton) mobileButton.textContent = "Add to Cart";
      if (message) {
        message.textContent = error?.message || "Unable to add this uniform to the cart.";
        message.classList.add("is-error");
      }
      renderSummary();
    }
  }

  function bindStaticControls() {
    document.getElementById("uniform-headwear-none")?.addEventListener("click", toggleHeadwearNone);
    document.getElementById("uniform-pick-for-me")?.addEventListener("click", pickForMe);
    document.querySelectorAll("[data-add-layer]").forEach((button) => {
      button.addEventListener("click", () => addLayer(button.dataset.addLayer));
    });
    document.getElementById("uniform-add-all")?.addEventListener("click", (event) => {
      addUniformToCart(event.currentTarget);
    });
    document.getElementById("uniform-mobile-add")?.addEventListener("click", (event) => {
      addUniformToCart(event.currentTarget);
    });
  }

  async function boot() {
    bindStaticControls();

    try {
      const response = await fetch("/api/shopify-products?collection=shop-all");
      if (!response.ok) throw new Error(`Unable to load products (${response.status}).`);
      const data = await response.json();
      const products = (data.products || data || []).map(normalizeProduct);

      products.forEach((product) => {
        const category = categoryOf(product);
        if (category) state[category].items.push(product);
      });

      ensureInitialSelections();
      ["headwear", "tops", "bottoms"].forEach(renderCategory);
      renderSummary();
    } catch (error) {
      console.error("Uniform builder failed:", error);
      const builder = document.querySelector(".uniform-builder-wrap");
      if (builder) {
        builder.innerHTML = `<p class="uniform-error">Unable to load the outfit builder.</p>`;
      }
      const message = document.getElementById("uniform-cart-message");
      if (message) {
        message.textContent = "The uniform builder could not load products.";
        message.classList.add("is-error");
      }
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
