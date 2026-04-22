let SHOP_PRODUCTS = [];
let SHOP_PRODUCTS_BY_HANDLE = {};
let CURRENT_DRAWER_PRODUCT = null;
let CURRENT_SHOP_FILTER = "all";
let SHOP_COLLECTION_TITLE = "Collection";
let CURRENT_PRODUCT_IMAGES = [];
let CURRENT_PRODUCT_IMAGE_INDEX = 0;
/* ----------------------------
   bootstrap
---------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("js-ready");

  initHeroDateTime();
  initRevealAnimations();
  initSizeChips(document);

  initPanels();
  initDrawer();   // IMPORTANT FIX

  await initHomeRandomProduct();
  await initShopPage();
  await initProductPage();
  await initCartPage();
  await syncLiveCartUI();

  initCheckoutButtons();

  updateFavoritesCountUI();
  syncFavoriteButtons();
  renderFavoritesPanel();
});

/* ----------------------------
   date / time
---------------------------- */

function initHeroDateTime() {
  const dateEls = document.querySelectorAll("#hero-current-date");
  const timeEls = document.querySelectorAll("#hero-current-time");

  if (!dateEls.length || !timeEls.length) return;

  function updateHeroDateTime() {
    const now = new Date();

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });

    const dateText = dateFormatter.format(now);
    const timeText = timeFormatter.format(now);

    dateEls.forEach((el) => {
      el.textContent = dateText;
    });

    timeEls.forEach((el) => {
      el.textContent = timeText;
    });
  }

  updateHeroDateTime();
  setInterval(updateHeroDateTime, 1000);
}

/* ----------------------------
   helpers
---------------------------- */

function formatMoney(amount, currencyCode = "USD") {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2).replace(".00", "")}`;
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLocalFavoriteKey() {
  return "longevity_favorites";
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(getLocalFavoriteKey())) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(getLocalFavoriteKey(), JSON.stringify(favorites));
  updateFavoritesCountUI();
  syncFavoriteButtons();
  renderFavoritesPanel();
}

function isFavorite(productHandle) {
  return getFavorites().some((item) => item.id === productHandle);
}

function toggleFavorite(product) {
  if (!product || !product.id) return;

  const favorites = getFavorites();
  const index = favorites.findIndex((item) => item.id === product.id);

  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(product);
  }

  saveFavorites(favorites);
}

function getShopifyCartId() {
  try {
    return localStorage.getItem("longevity_shopify_cart_id") || "";
  } catch {
    return "";
  }
}

function setShopifyCartId(cartId) {
  localStorage.setItem("longevity_shopify_cart_id", cartId);
}

function clearShopifyCartId() {
  localStorage.removeItem("longevity_shopify_cart_id");
}

function updateCartCountLabelUI(quantity = null) {
  const count = quantity == null ? 0 : Number(quantity) || 0;

  document.querySelectorAll("[data-cart-count-label]").forEach((el) => {
    el.textContent = `${count} item${count === 1 ? "" : "s"}`;
  });
}

function getSelectedSize(scope) {
  if (!scope) return "";
  const selected = scope.querySelector(".size-chip.is-selected");
  return selected ? (selected.dataset.size || selected.textContent.trim()) : "";
}

function getProductCardData(card) {
  if (!card) return null;

  try {
    const variants = JSON.parse(card.dataset.variants || "[]");
    return {
      id: card.dataset.productHandle || "",
      handle: card.dataset.productHandle || "",
      name: card.dataset.productName || "",
      price: card.dataset.productPrice || "",
      image: card.dataset.productImage || "",
      description: card.dataset.productDescription || "",
      category: card.dataset.productCategory || "",
      variants,
    };
  } catch {
    return null;
  }
}

async function initHomeRandomProduct() {
  const wrap = document.getElementById("home-random-product");
  const image = document.getElementById("home-random-product-image");
  const title = document.getElementById("home-random-product-title");
  const price = document.getElementById("home-random-product-price");
  const link = document.getElementById("home-random-product-link");

  if (!wrap || !image || !title || !price || !link) return;

  try {
    let products = SHOP_PRODUCTS;

    if (!products.length) {
      products = await fetchProducts();
    }

    if (!products.length) return;

    const randomProduct = products[Math.floor(Math.random() * products.length)];

    image.src = randomProduct.image;
    image.alt = randomProduct.imageAlt || randomProduct.name;
    title.textContent = randomProduct.name;
    price.textContent = randomProduct.price;
    link.href = `product.html?handle=${encodeURIComponent(randomProduct.handle)}`;

    requestAnimationFrame(() => {
      wrap.classList.add("is-ready");
    });
  } catch (error) {
    console.error("Failed to load home random product:", error);
  }
}

function getVariantForSize(product, size) {
  if (!product?.variants?.length) return null;
  if (!size) return product.variants[0];

  const normalized = String(size).trim().toLowerCase();

  const exactSizeVariant = product.variants.find((variant) =>
    (variant.selectedOptions || []).some(
      (option) =>
        String(option.name).toLowerCase() === "size" &&
        String(option.value).trim().toLowerCase() === normalized
    )
  );

  if (exactSizeVariant) return exactSizeVariant;

  const titleMatch = product.variants.find(
    (variant) => String(variant.title).trim().toLowerCase() === normalized
  );

  return titleMatch || product.variants[0];
}

function showAddedState(button, label = "Added") {
  if (!button) return;

  const original = button.dataset.originalLabel || button.textContent;
  button.dataset.originalLabel = original;
  button.textContent = label;
  button.classList.add("is-added");

  setTimeout(() => {
    button.textContent = original;
    button.classList.remove("is-added");
  }, 1200);
}

function normalizeCategory(product) {
  const raw = String(product.category || product.raw?.productType || "").trim().toLowerCase();

  if (
    raw.includes("pant") ||
    raw.includes("short") ||
    raw.includes("bottom") ||
    raw.includes("trouser") ||
    raw.includes("jean")
  ) {
    return "bottoms";
  }

  return "tops";
}

function getFilteredProducts(products, filter = "all") {
  if (filter === "all") return products;
  return products.filter((product) => normalizeCategory(product) === filter);
}

function sortProductsNewestFirst(products) {
  return [...products].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.raw?.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || b.raw?.createdAt || 0).getTime();
    return bDate - aDate;
  });
}

function updateShopHeader(products) {
  const countEl = document.getElementById("shop-count");
  const titleEl = document.getElementById("shop-collection-title");

  if (countEl) {
    countEl.textContent = `${products.length} Item${products.length === 1 ? "" : "s"}`;
  }

  if (titleEl) {
    titleEl.textContent = SHOP_COLLECTION_TITLE;
  }
}

function updateShopFilterUI(activeFilter) {
  document.querySelectorAll(".shop-chip[data-filter]").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.filter === activeFilter);
  });
}

/* ----------------------------
   api
---------------------------- */

async function apiGetJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data;
}

async function apiPostJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data;
}

async function fetchProducts() {
  const data = await apiGetJson("/api/shopify-products?collection=shop-all");

  const products = Array.isArray(data) ? data : data.products || [];
  SHOP_COLLECTION_TITLE = Array.isArray(data)
    ? "Collection"
    : data.collectionTitle || "Collection";

  SHOP_PRODUCTS = products.map(normalizeShopifyProduct);
  SHOP_PRODUCTS_BY_HANDLE = Object.fromEntries(
    SHOP_PRODUCTS.map((product) => [product.handle, product])
  );

  return SHOP_PRODUCTS;
}

async function fetchProductByHandle(handle) {
  const product = await apiGetJson(`/api/shopify-product?handle=${encodeURIComponent(handle)}`);
  const normalized = normalizeShopifyProduct(product);
  SHOP_PRODUCTS_BY_HANDLE[normalized.handle] = normalized;
  return normalized;
}

async function ensureShopifyCart() {
  const existingCartId = getShopifyCartId();

  if (existingCartId) {
    try {
      const existingCartResponse = await apiGetJson(
        `/api/shopify-cart?id=${encodeURIComponent(existingCartId)}`
      );
      return existingCartResponse.cart;
    } catch {
      clearShopifyCartId();
    }
  }

  const created = await apiPostJson("/api/shopify-cart-create", {});
  const cart = created.cart;
  if (cart?.id) setShopifyCartId(cart.id);
  return cart;
}

async function addVariantToShopifyCart(merchandiseId, quantity = 1) {
  const cart = await ensureShopifyCart();

  const updated = await apiPostJson("/api/shopify-cart-lines-add", {
    cartId: cart.id,
    lines: [{ merchandiseId, quantity }],
  });

  if (updated?.cart?.id) {
    setShopifyCartId(updated.cart.id);
  }

  return updated.cart;
}

async function fetchCurrentShopifyCart() {
  const cartId = getShopifyCartId();
  if (!cartId) return null;

  try {
    const response = await apiGetJson(`/api/shopify-cart?id=${encodeURIComponent(cartId)}`);
    return response.cart;
  } catch {
    clearShopifyCartId();
    return null;
  }
}

/* ----------------------------
   normalize shopify data
---------------------------- */

function normalizeShopifyProduct(product) {
  const imageNodes = product?.images?.nodes || [];

  const featuredImage =
    product?.featuredImage?.url ||
    imageNodes?.[0]?.url ||
    "";

  const imageAlt =
    product?.featuredImage?.altText ||
    imageNodes?.[0]?.altText ||
    product?.title ||
    "";

  const allImages = imageNodes.length
    ? imageNodes.map((img) => ({
        url: img.url,
        altText: img.altText || product?.title || "",
      }))
    : featuredImage
      ? [{ url: featuredImage, altText: imageAlt }]
      : [];

  const variants = (product?.variants?.nodes || []).map((variant) => ({
    id: variant.id,
    title: variant.title,
    availableForSale: variant.availableForSale,
    selectedOptions: variant.selectedOptions || [],
    price: variant.price || product?.priceRange?.minVariantPrice || null,
    image: variant.image?.url || featuredImage,
    imageAlt: variant.image?.altText || imageAlt,
  }));

  const productType =
    product?.productType ||
    product?.options?.[0]?.name ||
    "Product";

  return {
    id: product.handle,
    handle: product.handle,
    name: product.title,
    title: product.title,
    description: product.description || "",
    image: featuredImage,
    imageAlt,
    images: allImages,
    secondImage: allImages[1]?.url || "",
    price: formatMoney(
      product?.priceRange?.minVariantPrice?.amount,
      product?.priceRange?.minVariantPrice?.currencyCode || "USD"
    ),
    priceAmount: product?.priceRange?.minVariantPrice?.amount || "0",
    currencyCode: product?.priceRange?.minVariantPrice?.currencyCode || "USD",
    category: productType,
    createdAt: product?.createdAt || "",
    variants,
    options: product?.options || [],
    raw: product,
  };
}

/* ----------------------------
   reveal animation
---------------------------- */

function initRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal-left, .reveal-right, .reveal-up");
  if (!revealItems.length) return;

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 0.05, 0.25)}s`;
    observer.observe(item);
  });
}

/* ----------------------------
   size chips
---------------------------- */

function initSizeChips(root = document) {
  root.querySelectorAll("[data-size-group]").forEach((group) => {
    const chips = group.querySelectorAll(".size-chip");

    chips.forEach((chip) => {
      chip.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        chips.forEach((btn) => btn.classList.remove("is-selected"));
        chip.classList.add("is-selected");
      });
    });
  });
}

/* ----------------------------
   counts
---------------------------- */

function updateCartCountUI(quantity = null) {
  const count = quantity == null ? 0 : Number(quantity) || 0;

  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
  });

  updateCartCountLabelUI(count);
}

function updateFavoritesCountUI() {
  const favorites = getFavorites();
  document.querySelectorAll("[data-favorites-count]").forEach((el) => {
    el.textContent = favorites.length;
  });
}

/* ----------------------------
   shop page
---------------------------- */

async function initShopPage() {
  const grid = document.getElementById("shop-grid") || document.querySelector(".shop-grid");
  if (!grid) return;

  try {
    const products = await fetchProducts();
    bindShopFilters();
    renderFilteredShopGrid();
    initRevealAnimations();
  } catch (error) {
    console.error("Failed to load Shopify products:", error);
  }
}

function bindShopFilters() {
  document.querySelectorAll(".shop-chip[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      CURRENT_SHOP_FILTER = chip.dataset.filter || "all";
      updateShopFilterUI(CURRENT_SHOP_FILTER);
      renderFilteredShopGrid();
      initRevealAnimations();
    });
  });
}

function renderFilteredShopGrid() {
  const filteredProducts = getFilteredProducts(SHOP_PRODUCTS, CURRENT_SHOP_FILTER);
  updateShopHeader(filteredProducts);
  updateShopFilterUI(CURRENT_SHOP_FILTER);
  renderShopGrid(filteredProducts);
}

function buildSizeOptions(product) {
  const sizeOption = product.options.find(
    (option) => String(option.name).toLowerCase() === "size"
  );

  let values = sizeOption?.values || [];

  if (!values.length && product.variants.length > 1) {
    values = product.variants.map((variant) => {
      const sizeSelected = (variant.selectedOptions || []).find(
        (option) => String(option.name).toLowerCase() === "size"
      );
      return sizeSelected?.value || variant.title;
    });
  }

  const uniqueValues = [...new Set(values)].filter(Boolean);

  if (!uniqueValues.length) {
    return `<button class="size-chip is-selected" type="button" data-size="Default">Default</button>`;
  }

  return uniqueValues
    .map(
      (value, index) => `
        <button class="size-chip ${index === 0 ? "is-selected" : ""}" type="button" data-size="${escapeHtml(value)}">
          ${escapeHtml(value)}
        </button>
      `
    )
    .join("");
}

function renderShopGrid(products) {
  const grid = document.getElementById("shop-grid") || document.querySelector(".shop-grid");
  if (!grid) return;

  grid.innerHTML = products
    .map((product, index) => {
      const revealCycle = index % 3;
      const revealClass =
        revealCycle === 0 ? "reveal-left" : revealCycle === 1 ? "reveal-up" : "reveal-right";

      return `
        <article
          class="product-card shop-product-card ${revealClass}"
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
              <img
                class="product-image-primary"
                src="${escapeHtml(product.image)}"
                alt="${escapeHtml(product.imageAlt || product.name)}"
              />
              ${
                product.secondImage
                  ? `<img
                      class="product-image-secondary"
                      src="${escapeHtml(product.secondImage)}"
                      alt="${escapeHtml(product.name)} alternate image"
                    />`
                  : ""
              }
            </div>
          </a>

          <div class="product-meta">
            <div>
              <button class="product-title product-title-trigger" type="button">${escapeHtml(product.name)}</button>
              <p class="product-sub">${escapeHtml(product.price)}</p>
            </div>
          </div>

          <div class="product-actions">
            <div class="size-row" data-size-group>
              ${buildSizeOptions(product)}
            </div>

            <button class="add-cart-btn" type="button">Add to Cart</button>
          </div>
        </article>
      `;
    })
    .join("");

  initSizeChips(grid);
  initShopInteractions();
  syncFavoriteButtons();
}

function syncFavoriteButtons() {
  document.querySelectorAll(".shop-product-card").forEach((card) => {
    const button = card.querySelector(".favorite-btn");
    if (!button) return;

    const active = isFavorite(card.dataset.productHandle || "");
    button.classList.toggle("is-active", active);

    const span = button.querySelector("span");
    if (span) span.textContent = active ? "♥" : "♡";
  });

  const drawerFavoriteBtn = document.getElementById("drawer-favorite-btn");
  if (drawerFavoriteBtn && CURRENT_DRAWER_PRODUCT) {
    const active = isFavorite(CURRENT_DRAWER_PRODUCT.handle);
    drawerFavoriteBtn.classList.toggle("is-active", active);
    const span = drawerFavoriteBtn.querySelector("span");
    if (span) span.textContent = active ? "♥" : "♡";
  }

  const productPageFavorite = document.getElementById("product-page-favorite");
  const pageHandle = document.body.dataset.productHandle || "";
  if (productPageFavorite && pageHandle) {
    const active = isFavorite(pageHandle);
    productPageFavorite.classList.toggle("is-active", active);
    const span = productPageFavorite.querySelector("span");
    if (span) span.textContent = active ? "♥" : "♡";
  }
}

function initShopInteractions() {
  document.querySelectorAll(".shop-product-card").forEach((card) => {
    const favoriteBtn = card.querySelector(".favorite-btn");
    const addBtn = card.querySelector(".add-cart-btn");
    const titleBtn = card.querySelector(".product-title-trigger");

    if (favoriteBtn) {
      favoriteBtn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(getProductCardData(card));
      };
    }

    if (addBtn) {
      addBtn.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const product = getProductCardData(card);
        if (!product) return;

        const size = getSelectedSize(card);
        const variant = getVariantForSize(product, size);
        if (!variant?.id) return;

        try {
          const cart = await addVariantToShopifyCart(variant.id, 1);
          updateCartCountUI(cart?.totalQuantity || 0);
          renderCartPanel(cart);
          showAddedState(addBtn, `Added • ${size || "Default"}`);
        } catch (error) {
          console.error("Failed to add to cart:", error);
        }
      };
    }

    if (titleBtn) {
      titleBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openProductDrawer(card.dataset.productHandle || "");
      };
    }
  });
}

/* ----------------------------
   quick view drawer
---------------------------- */

function openProductDrawer(productHandle) {
  const drawer = document.getElementById("shop-drawer");
  const overlay = document.getElementById("shop-drawer-overlay");
  const drawerImage = document.getElementById("drawer-image");
  const drawerTitle = document.getElementById("drawer-title");
  const drawerPrice = document.getElementById("drawer-price");
  const drawerDescription = document.getElementById("drawer-description");
  const drawerLink = document.getElementById("drawer-product-link");

  if (!drawer || !overlay) return;

  const product = SHOP_PRODUCTS_BY_HANDLE[productHandle];
  if (!product) return;

  CURRENT_DRAWER_PRODUCT = product;
  drawer.dataset.productHandle = product.handle;

  if (drawerImage) {
    drawerImage.src = product.image;
    drawerImage.alt = product.imageAlt || product.name;
  }

  if (drawerTitle) drawerTitle.textContent = product.name;
  if (drawerPrice) drawerPrice.textContent = product.price;
  if (drawerDescription) drawerDescription.textContent = product.description;
  if (drawerLink) drawerLink.href = `product.html?handle=${encodeURIComponent(product.handle)}`;

  const sizeRow = drawer.querySelector(".drawer-size-row");
  if (sizeRow) {
    sizeRow.innerHTML = buildSizeOptions(product);
    initSizeChips(sizeRow.parentElement || drawer);
  }

  syncFavoriteButtons();
  closePanels();

  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-visible");
  document.body.classList.add("drawer-open");
}

function initDrawer() {
  const drawer = document.getElementById("shop-drawer");
  const overlay = document.getElementById("shop-drawer-overlay");
  const closeBtn = document.getElementById("shop-drawer-close");
  const drawerFavoriteBtn = document.getElementById("drawer-favorite-btn");
  const drawerAddBtn = document.getElementById("drawer-add-cart-btn");

  if (!drawer || !overlay || !closeBtn) return;

  if (drawerFavoriteBtn) {
    drawerFavoriteBtn.addEventListener("click", (event) => {
      event.preventDefault();
      if (CURRENT_DRAWER_PRODUCT) {
        toggleFavorite(CURRENT_DRAWER_PRODUCT);
      }
    });
  }

  if (drawerAddBtn) {
    drawerAddBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!CURRENT_DRAWER_PRODUCT) return;

      const size = getSelectedSize(drawer);
      const variant = getVariantForSize(CURRENT_DRAWER_PRODUCT, size);
      if (!variant?.id) return;

      try {
        const cart = await addVariantToShopifyCart(variant.id, 1);
        updateCartCountUI(cart?.totalQuantity || 0);
        renderCartPanel(cart);
        showAddedState(drawerAddBtn, `Added • ${size || "Default"}`);
      } catch (error) {
        console.error("Failed to add drawer item:", error);
      }
    });
  }

  const closeDrawer = () => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");

    if (!document.querySelector(".side-panel.is-open")) {
      overlay.classList.remove("is-visible");
      document.body.classList.remove("drawer-open");
    }
  };

  closeBtn.addEventListener("click", closeDrawer);

  overlay.addEventListener("click", () => {
    closeDrawer();
    closePanels();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closePanels();
    }
  });
}

/* ----------------------------
   panels
---------------------------- */

function closePanels() {
  document.querySelectorAll(".side-panel").forEach((panel) => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  });

  const overlay = document.getElementById("shop-drawer-overlay");
  const drawer = document.getElementById("shop-drawer");

  if (overlay && !drawer?.classList.contains("is-open")) {
    overlay.classList.remove("is-visible");
    document.body.classList.remove("drawer-open");
  }
}

function openPanel(panelId) {
  const panel = document.getElementById(panelId);
  const overlay = document.getElementById("shop-drawer-overlay");
  const drawer = document.getElementById("shop-drawer");

  if (!panel || !overlay) return;

  if (drawer) {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll(".side-panel").forEach((item) => {
    item.classList.remove("is-open");
    item.setAttribute("aria-hidden", "true");
  });

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-visible");
  document.body.classList.add("drawer-open");
}

function renderFavoritesPanel() {
  const wrap = document.getElementById("favorites-items");
  const empty = document.getElementById("favorites-empty");
  if (!wrap || !empty) return;

  const favorites = getFavorites();
  wrap.innerHTML = "";

  if (!favorites.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  favorites.forEach((item) => {
    const card = document.createElement("article");
    card.className = "mini-item";

    card.innerHTML = `
      <div class="mini-item-media">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />
      </div>
      <div class="mini-item-content">
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.price)}</p>
        <div class="mini-item-actions">
          <a class="mini-link-btn" href="product.html?handle=${encodeURIComponent(item.handle || item.id)}">View</a>
          <button class="mini-link-btn" type="button" data-remove-favorite="${escapeHtml(item.id)}">Remove</button>
        </div>
      </div>
    `;

    wrap.appendChild(card);
  });

  wrap.querySelectorAll("[data-remove-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-favorite");
      const nextFavorites = getFavorites().filter((item) => item.id !== id);
      saveFavorites(nextFavorites);
    });
  });
}

function renderCartPanel(cart = null) {
  const wrap = document.getElementById("cart-panel-items");
  const empty = document.getElementById("cart-panel-empty");
  const subtotal = document.getElementById("cart-panel-subtotal");
  const checkoutLinks = document.querySelectorAll("[data-checkout-link]");

  if (!wrap || !empty || !subtotal) return;

  const currentCart = cart || null;
  const lines = currentCart?.lines?.nodes || [];

  wrap.innerHTML = "";

  if (!lines.length) {
    empty.style.display = "block";
    subtotal.textContent = "$0";
    checkoutLinks.forEach((link) => {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
    });
    return;
  }

  empty.style.display = "none";

  lines.forEach((line) => {
    const variant = line.merchandise;
    const product = variant?.product;
    const image =
      variant?.image?.url ||
      product?.featuredImage?.url ||
      "";

    const sizeValue =
      (variant?.selectedOptions || []).find(
        (option) => String(option.name).toLowerCase() === "size"
      )?.value || variant?.title || "Default";

    const card = document.createElement("article");
    card.className = "mini-item";

    card.innerHTML = `
      <div class="mini-item-media">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product?.title || "")}" />
      </div>
      <div class="mini-item-content">
        <h4>${escapeHtml(product?.title || "")}</h4>
        <p>${escapeHtml(formatMoney(variant?.price?.amount, variant?.price?.currencyCode))} · ${escapeHtml(sizeValue)} · Qty ${escapeHtml(String(line.quantity))}</p>
        <div class="mini-item-actions">
          <a class="mini-link-btn" href="product.html?handle=${encodeURIComponent(product?.handle || "")}">View</a>
        </div>
      </div>
    `;

    wrap.appendChild(card);
  });

  subtotal.textContent = formatMoney(
    currentCart?.cost?.subtotalAmount?.amount,
    currentCart?.cost?.subtotalAmount?.currencyCode
  );

  checkoutLinks.forEach((link) => {
    if (currentCart?.checkoutUrl) {
      link.setAttribute("href", currentCart.checkoutUrl);
      link.removeAttribute("aria-disabled");
    }
  });
}

function initPanels() {
  const favoritesBtn = document.getElementById("favorites-toggle-btn");
  const cartBtn = document.getElementById("cart-toggle-btn");
  const overlay = document.getElementById("shop-drawer-overlay");

  if (favoritesBtn) {
    favoritesBtn.addEventListener("click", () => {
      renderFavoritesPanel();
      openPanel("favorites-panel");
    });
  }

  if (cartBtn) {
    cartBtn.addEventListener("click", async () => {
      const cart = await fetchCurrentShopifyCart();
      renderCartPanel(cart);
      openPanel("cart-panel");
    });
  }

  document.querySelectorAll("[data-close-panel]").forEach((btn) => {
    btn.addEventListener("click", closePanels);
  });

  if (overlay) {
    overlay.addEventListener("click", closePanels);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanels();
    }
  });
}
/* PRODUCT GALLERY */

function renderProductImageGallery() {
  const mainImage = document.getElementById("product-page-image");
  const thumbsWrap = document.getElementById("product-page-thumbs");
  const prevBtn = document.getElementById("product-image-prev");
  const nextBtn = document.getElementById("product-image-next");

  if (!mainImage || !CURRENT_PRODUCT_IMAGES.length) return;

  const current = CURRENT_PRODUCT_IMAGES[CURRENT_PRODUCT_IMAGE_INDEX];
  mainImage.src = current.url;
  mainImage.alt = current.altText || "Product image";

  if (thumbsWrap) {
    thumbsWrap.innerHTML = CURRENT_PRODUCT_IMAGES
      .map(
        (img, index) => `
          <button
            class="product-thumb ${index === CURRENT_PRODUCT_IMAGE_INDEX ? "is-active" : ""}"
            type="button"
            data-thumb-index="${index}"
            aria-label="View product image ${index + 1}"
          >
            <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.altText || "Thumbnail")}" />
          </button>
        `
      )
      .join("");

    thumbsWrap.querySelectorAll("[data-thumb-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        CURRENT_PRODUCT_IMAGE_INDEX = Number(btn.dataset.thumbIndex || 0);
        renderProductImageGallery();
      });
    });
  }

  if (prevBtn) prevBtn.disabled = CURRENT_PRODUCT_IMAGES.length <= 1;
  if (nextBtn) nextBtn.disabled = CURRENT_PRODUCT_IMAGES.length <= 1;
}

function bindProductImageGalleryControls() {
  const prevBtn = document.getElementById("product-image-prev");
  const nextBtn = document.getElementById("product-image-next");

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (!CURRENT_PRODUCT_IMAGES.length) return;
      CURRENT_PRODUCT_IMAGE_INDEX =
        (CURRENT_PRODUCT_IMAGE_INDEX - 1 + CURRENT_PRODUCT_IMAGES.length) % CURRENT_PRODUCT_IMAGES.length;
      renderProductImageGallery();
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (!CURRENT_PRODUCT_IMAGES.length) return;
      CURRENT_PRODUCT_IMAGE_INDEX =
        (CURRENT_PRODUCT_IMAGE_INDEX + 1) % CURRENT_PRODUCT_IMAGES.length;
      renderProductImageGallery();
    };
  }
}
/* ----------------------------
   product page
---------------------------- */

async function initProductPage() {
  const title = document.getElementById("product-page-title");
  if (!title) return;

  const params = new URLSearchParams(window.location.search);
  const handle = params.get("handle") || params.get("id");
  if (!handle) return;

  try {
    const product = await fetchProductByHandle(handle);

    document.body.dataset.productHandle = product.handle;
    document.title = `${product.name} | Longevity Co.`;

    const image = document.getElementById("product-page-image");
    const price = document.getElementById("product-page-price");
    const description = document.getElementById("product-page-description");
    const category = document.getElementById("product-page-category");
    const favoriteBtn = document.getElementById("product-page-favorite");
    const addBtn = document.getElementById("product-page-add-cart");
    const sizeRow = document.querySelector(".product-page-size-row");

    CURRENT_PRODUCT_IMAGES = product.images?.length
  ? product.images
  : [{ url: product.image, altText: product.imageAlt || product.name }];

CURRENT_PRODUCT_IMAGE_INDEX = 0;

if (image) {
  image.src = CURRENT_PRODUCT_IMAGES[0]?.url || product.image;
  image.alt = CURRENT_PRODUCT_IMAGES[0]?.altText || product.name;
}

renderProductImageGallery();
bindProductImageGalleryControls();
    title.textContent = product.name;
    if (price) price.textContent = product.price;
    if (description) description.textContent = product.description;
    if (category) category.textContent = product.category;

    if (sizeRow) {
      sizeRow.innerHTML = buildSizeOptions(product);
      initSizeChips(sizeRow.parentElement || document);
    }

    if (favoriteBtn) {
      favoriteBtn.onclick = (event) => {
        event.preventDefault();
        toggleFavorite(product);
      };
    }

    if (addBtn) {
      addBtn.onclick = async (event) => {
        event.preventDefault();

        const scope = document.querySelector(".product-page-content") || document;
        const size = getSelectedSize(scope);
        const variant = getVariantForSize(product, size);
        if (!variant?.id) return;

        try {
          const cart = await addVariantToShopifyCart(variant.id, 1);
          updateCartCountUI(cart?.totalQuantity || 0);
          renderCartPanel(cart);
          showAddedState(addBtn, `Added • ${size || "Default"}`);
        } catch (error) {
          console.error("Failed to add PDP item:", error);
        }
      };
    }

    syncFavoriteButtons();
  } catch (error) {
    console.error("Failed to load Shopify product:", error);
  }
}

/* ----------------------------
   cart page
---------------------------- */

async function initCartPage() {
  const cartItemsEl = document.getElementById("cart-items");
  const cartEmptyEl = document.getElementById("cart-empty");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-placeholder-btn");

  if (!cartItemsEl || !cartEmptyEl || !subtotalEl || !totalEl) return;

  async function updateCartLineQuantity(lineId, quantity) {
    const cartId = getShopifyCartId();
    if (!cartId) return null;

    const response = await apiPostJson("/api/shopify-cart-lines-update", {
      cartId,
      lines: [{ id: lineId, quantity }],
    });

    return response.cart;
  }

  async function removeCartLine(lineId) {
    const cartId = getShopifyCartId();
    if (!cartId) return null;

    const response = await apiPostJson("/api/shopify-cart-lines-remove", {
      cartId,
      lineIds: [lineId],
    });

    return response.cart;
  }

  async function renderCartPage() {
    const cart = await fetchCurrentShopifyCart();

    cartItemsEl.innerHTML = "";

    const lines = cart?.lines?.nodes || [];

    if (!lines.length) {
      cartEmptyEl.hidden = false;
      subtotalEl.textContent = "$0";
      totalEl.textContent = "$0";
      updateCartCountUI(0);
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    cartEmptyEl.hidden = true;

    lines.forEach((line) => {
      const variant = line.merchandise;
      const product = variant?.product;
      const image =
        variant?.image?.url ||
        product?.featuredImage?.url ||
        "";

      const sizeValue =
        (variant?.selectedOptions || []).find(
          (option) => String(option.name).toLowerCase() === "size"
        )?.value || variant?.title || "Default";

      const unitPrice = Number(variant?.price?.amount || 0);
      const quantity = Number(line.quantity || 0);
      const linePrice = unitPrice * quantity;

      const article = document.createElement("article");
      article.className = "cart-item";

      article.innerHTML = `
        <div class="cart-item-media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(product?.title || "")}" />
        </div>

        <div class="cart-item-content">
          <div class="cart-item-top">
            <div>
              <h3>${escapeHtml(product?.title || "")}</h3>
              <p>${escapeHtml(formatMoney(variant?.price?.amount, variant?.price?.currencyCode))}</p>
            </div>

            <button class="cart-remove-btn" type="button" data-remove-line-id="${escapeHtml(line.id)}">
              Remove
            </button>
          </div>

          <div class="cart-item-meta">
            <span>Size: ${escapeHtml(sizeValue)}</span>
          </div>

          <div class="cart-item-bottom">
            <div class="cart-qty">
              <button type="button" class="qty-btn" data-qty-action="decrease" data-line-id="${escapeHtml(line.id)}">−</button>
              <span>${escapeHtml(String(quantity))}</span>
              <button type="button" class="qty-btn" data-qty-action="increase" data-line-id="${escapeHtml(line.id)}">+</button>
            </div>

            <div class="cart-line-price">
              ${escapeHtml(formatMoney(linePrice, variant?.price?.currencyCode))}
            </div>
          </div>
        </div>
      `;

      cartItemsEl.appendChild(article);
    });

    subtotalEl.textContent = formatMoney(
      cart?.cost?.subtotalAmount?.amount,
      cart?.cost?.subtotalAmount?.currencyCode
    );

    totalEl.textContent = formatMoney(
      cart?.cost?.totalAmount?.amount,
      cart?.cost?.totalAmount?.currencyCode
    );

    updateCartCountUI(cart?.totalQuantity || 0);

    if (checkoutBtn && cart?.checkoutUrl) {
      checkoutBtn.disabled = false;
      checkoutBtn.onclick = () => {
        window.location.href = cart.checkoutUrl;
      };
    }

    cartItemsEl.querySelectorAll("[data-remove-line-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await removeCartLine(btn.dataset.removeLineId);
        await renderCartPage();
        const liveCart = await fetchCurrentShopifyCart();
        renderCartPanel(liveCart);
      });
    });

    cartItemsEl.querySelectorAll("[data-qty-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const lineId = btn.dataset.lineId;
        const action = btn.dataset.qtyAction;
        const currentLine = lines.find((line) => line.id === lineId);
        if (!currentLine) return;

        const currentQty = Number(currentLine.quantity || 0);
        const nextQty = action === "increase" ? currentQty + 1 : currentQty - 1;

        if (nextQty <= 0) {
          await removeCartLine(lineId);
        } else {
          await updateCartLineQuantity(lineId, nextQty);
        }

        await renderCartPage();
        const liveCart = await fetchCurrentShopifyCart();
        renderCartPanel(liveCart);
      });
    });
  }

  await renderCartPage();
}

/* ----------------------------
   live cart ui
---------------------------- */

async function syncLiveCartUI() {
  const cart = await fetchCurrentShopifyCart();
  updateCartCountUI(cart?.totalQuantity || 0);
  renderCartPanel(cart);
}

/* ----------------------------
   checkout buttons
---------------------------- */

function initCheckoutButtons() {
  document.querySelectorAll("[data-checkout-link]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      const cart = await fetchCurrentShopifyCart();
      if (!cart?.checkoutUrl) {
        event.preventDefault();
      }
    });
  });
}
