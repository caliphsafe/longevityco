const PRODUCT_DATA = {
  tee: {
    id: "tee",
    name: "Essential Graphic Tee",
    price: "$48",
    image: "assets/shirt.png",
    description: "A clean everyday staple with a minimal graphic presence and balanced fit.",
    category: "Tops",
  },
  hoodie: {
    id: "hoodie",
    name: "Heavyweight Hoodie",
    price: "$92",
    image: "assets/hoodie.png",
    description: "A structured heavyweight hoodie designed for comfort, weight, and clean silhouette.",
    category: "Tops",
  },
  pants: {
    id: "pants",
    name: "Utility Pant",
    price: "$88",
    image: "assets/pants.png",
    description: "A cleaner utility-minded pant with an easy shape and refined streetwear feel.",
    category: "Bottoms",
  },
  shorts: {
    id: "shorts",
    name: "Studio Shorts",
    price: "$54",
    image: "assets/shorts.png",
    description: "A lighter short built for ease, daily wear, and a stripped-back studio fit.",
    category: "Bottoms",
  },
  longsleeve: {
    id: "longsleeve",
    name: "Long Sleeve Graphic",
    price: "$62",
    image: "assets/longsleeve.png",
    description: "A layered graphic piece that keeps the visual language restrained and clean.",
    category: "Tops",
  },
  crewneck: {
    id: "crewneck",
    name: "Structured Crewneck",
    price: "$78",
    image: "assets/crewneck.png",
    description: "A soft but substantial crewneck with a structured silhouette and quiet presence.",
    category: "Tops",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("js-ready");

  initReveals();
  initMenu();
  initSizeGroups(document);
  initShopFavorites();
  initShopAddToCart();
  initQuickViewTriggers();
  initDrawer();
  initPanels();
  initProductPage();
  initCartPage();

  updateCartCount();
  updateFavoriteCount();
  syncFavoriteStates();
  renderFavoritesPanel();
  renderCartPanel();
});

/* ---------- shared helpers ---------- */

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("longevity_cart")) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("longevity_cart", JSON.stringify(cart));
  updateCartCount();
  renderCartPanel();
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem("longevity_favorites")) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem("longevity_favorites", JSON.stringify(favorites));
  updateFavoriteCount();
  syncFavoriteStates();
  renderFavoritesPanel();
}

function parsePrice(priceString) {
  return Number(String(priceString).replace(/[^0-9.]/g, "")) || 0;
}

function formatPrice(value) {
  return `$${value.toFixed(2).replace(".00", "")}`;
}

function buildProductFromCard(card) {
  if (!card) return null;

  return {
    id: card.dataset.productId || "",
    name: card.dataset.productName || "",
    price: card.dataset.productPrice || "$0",
    image: card.dataset.productImage || "",
    description: card.dataset.productDescription || "",
    category: card.dataset.productCategory || "",
  };
}

function getSelectedSize(scope) {
  if (!scope) return "S";
  const selected = scope.querySelector(".size-chip.is-selected");
  return selected ? (selected.dataset.size || selected.textContent.trim()) : "S";
}

function isFavorite(productId) {
  return getFavorites().some((item) => item.id === productId);
}

function toggleFavorite(product) {
  if (!product || !product.id) return;

  const favorites = getFavorites();
  const existingIndex = favorites.findIndex((item) => item.id === product.id);

  if (existingIndex > -1) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push(product);
  }

  saveFavorites(favorites);
}

function addToCart(product) {
  if (!product || !product.id) return;

  const cart = getCart();
  const existing = cart.find(
    (item) => item.id === product.id && item.size === product.size
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      ...product,
      quantity: 1,
    });
  }

  saveCart(cart);
}

function buttonFeedback(button, size) {
  if (!button) return;
  const original = button.dataset.originalLabel || button.textContent;
  button.dataset.originalLabel = original;
  button.textContent = `Added • ${size}`;
  button.classList.add("is-added");

  setTimeout(() => {
    button.textContent = original;
    button.classList.remove("is-added");
  }, 1200);
}

/* ---------- reveals ---------- */

function initReveals() {
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

/* ---------- menu ---------- */

function initMenu() {
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (!menuToggle || !siteNav) return;

  menuToggle.addEventListener("click", () => {
    siteNav.classList.toggle("open");
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("open");
    });
  });
}

/* ---------- size chips ---------- */

function initSizeGroups(root = document) {
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

/* ---------- counts ---------- */

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
  });

  document.querySelectorAll("[data-cart-count-label]").forEach((el) => {
    el.textContent = `${count} item${count === 1 ? "" : "s"}`;
  });
}

function updateFavoriteCount() {
  const favorites = getFavorites();
  document.querySelectorAll("[data-favorites-count]").forEach((el) => {
    el.textContent = favorites.length;
  });
}

/* ---------- favorites ---------- */

function syncFavoriteStates() {
  document.querySelectorAll(".shop-product-card").forEach((card) => {
    const button = card.querySelector(".favorite-btn");
    if (!button) return;

    const active = isFavorite(card.dataset.productId || "");
    button.classList.toggle("is-active", active);

    const span = button.querySelector("span");
    if (span) span.textContent = active ? "♥" : "♡";
  });

  const drawer = document.getElementById("shop-drawer");
  const drawerFavoriteBtn = document.getElementById("drawer-favorite-btn");
  if (drawer && drawerFavoriteBtn) {
    const active = isFavorite(drawer.dataset.productId || "");
    drawerFavoriteBtn.classList.toggle("is-active", active);
    const span = drawerFavoriteBtn.querySelector("span");
    if (span) span.textContent = active ? "♥" : "♡";
  }

  const productPageFavorite = document.getElementById("product-page-favorite");
  const productPageId = document.body.dataset.productId;
  if (productPageFavorite && productPageId) {
    const active = isFavorite(productPageId);
    productPageFavorite.classList.toggle("is-active", active);
    const span = productPageFavorite.querySelector("span");
    if (span) span.textContent = active ? "♥" : "♡";
  }
}

function initShopFavorites() {
  document.querySelectorAll(".shop-product-card .favorite-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = button.closest(".shop-product-card");
      toggleFavorite(buildProductFromCard(card));
    });
  });

  const drawerFavoriteBtn = document.getElementById("drawer-favorite-btn");
  if (drawerFavoriteBtn) {
    drawerFavoriteBtn.addEventListener("click", (event) => {
      event.preventDefault();
      const drawer = document.getElementById("shop-drawer");
      if (!drawer) return;
      const product = PRODUCT_DATA[drawer.dataset.productId || ""];
      toggleFavorite(product);
    });
  }

  const productPageFavorite = document.getElementById("product-page-favorite");
  if (productPageFavorite) {
    productPageFavorite.addEventListener("click", (event) => {
      event.preventDefault();
      const product = PRODUCT_DATA[document.body.dataset.productId || ""];
      toggleFavorite(product);
    });
  }
}

/* ---------- add to cart ---------- */

function initShopAddToCart() {
  document.querySelectorAll(".shop-product-card .add-cart-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = button.closest(".shop-product-card");
      const product = {
        ...buildProductFromCard(card),
        size: getSelectedSize(card),
      };

      addToCart(product);
      buttonFeedback(button, product.size);
    });
  });

  const drawerAddBtn = document.getElementById("drawer-add-cart-btn");
  if (drawerAddBtn) {
    drawerAddBtn.addEventListener("click", (event) => {
      event.preventDefault();

      const drawer = document.getElementById("shop-drawer");
      if (!drawer) return;

      const base = PRODUCT_DATA[drawer.dataset.productId || ""];
      if (!base) return;

      const product = {
        ...base,
        size: getSelectedSize(drawer),
      };

      addToCart(product);
      buttonFeedback(drawerAddBtn, product.size);
    });
  }

  const productPageAddBtn = document.getElementById("product-page-add-cart");
  if (productPageAddBtn) {
    productPageAddBtn.addEventListener("click", (event) => {
      event.preventDefault();

      const base = PRODUCT_DATA[document.body.dataset.productId || ""];
      if (!base) return;

      const scope = document.querySelector(".product-page-content") || document;
      const product = {
        ...base,
        size: getSelectedSize(scope),
      };

      addToCart(product);
      buttonFeedback(productPageAddBtn, product.size);
    });
  }
}

/* ---------- quick view ---------- */

function openDrawerForProduct(productId) {
  const drawer = document.getElementById("shop-drawer");
  const overlay = document.getElementById("shop-drawer-overlay");
  const drawerImage = document.getElementById("drawer-image");
  const drawerTitle = document.getElementById("drawer-title");
  const drawerPrice = document.getElementById("drawer-price");
  const drawerDescription = document.getElementById("drawer-description");

  if (!drawer || !overlay) return;

  const product = PRODUCT_DATA[productId];
  if (!product) return;

  drawer.dataset.productId = product.id;

  if (drawerImage) {
    drawerImage.src = product.image;
    drawerImage.alt = product.name;
  }

  if (drawerTitle) drawerTitle.textContent = product.name;
  if (drawerPrice) drawerPrice.textContent = product.price;
  if (drawerDescription) drawerDescription.textContent = product.description;

  drawer.querySelectorAll(".drawer-size-row .size-chip").forEach((chip, index) => {
    chip.classList.toggle("is-selected", index === 0);
  });

  syncFavoriteStates();
  closePanels();

  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-visible");
  document.body.classList.add("drawer-open");
}

function initQuickViewTriggers() {
  document.querySelectorAll(".product-title-trigger").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = button.closest(".shop-product-card");
      if (!card) return;

      openDrawerForProduct(card.dataset.productId || "");
    });
  });
}

function initShopQuickViewTriggers() {
  initQuickViewTriggers();
}

function initDrawer() {
  const drawer = document.getElementById("shop-drawer");
  const overlay = document.getElementById("shop-drawer-overlay");
  const closeBtn = document.getElementById("shop-drawer-close");

  if (!drawer || !overlay || !closeBtn) return;

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

/* ---------- side panels ---------- */

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
        <img src="${item.image}" alt="${item.name}" />
      </div>
      <div class="mini-item-content">
        <h4>${item.name}</h4>
        <p>${item.price}</p>
        <div class="mini-item-actions">
          <a class="mini-link-btn" href="product.html?id=${item.id}">View</a>
          <button class="mini-link-btn" type="button" data-remove-favorite="${item.id}">Remove</button>
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

function renderCartPanel() {
  const wrap = document.getElementById("cart-panel-items");
  const empty = document.getElementById("cart-panel-empty");
  const subtotal = document.getElementById("cart-panel-subtotal");
  if (!wrap || !empty || !subtotal) return;

  const cart = getCart();
  wrap.innerHTML = "";

  if (!cart.length) {
    empty.style.display = "block";
    subtotal.textContent = "$0";
    return;
  }

  empty.style.display = "none";

  let total = 0;

  cart.forEach((item, index) => {
    const price = parsePrice(item.price);
    total += price * item.quantity;

    const card = document.createElement("article");
    card.className = "mini-item";

    card.innerHTML = `
      <div class="mini-item-media">
        <img src="${item.image}" alt="${item.name}" />
      </div>
      <div class="mini-item-content">
        <h4>${item.name}</h4>
        <p>${item.price} · ${item.size} · Qty ${item.quantity}</p>
        <div class="mini-item-actions">
          <a class="mini-link-btn" href="product.html?id=${item.id}">View</a>
          <button class="mini-link-btn" type="button" data-remove-cart="${index}">Remove</button>
        </div>
      </div>
    `;

    wrap.appendChild(card);
  });

  subtotal.textContent = formatPrice(total);

  wrap.querySelectorAll("[data-remove-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-remove-cart"));
      const nextCart = getCart();
      nextCart.splice(index, 1);
      saveCart(nextCart);
    });
  });
}

function initPanels() {
  const favoritesBtn = document.getElementById("favorites-toggle-btn");
  const cartBtn = document.getElementById("cart-toggle-btn");

  if (favoritesBtn) {
    favoritesBtn.addEventListener("click", () => {
      renderFavoritesPanel();
      openPanel("favorites-panel");
    });
  }

  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      renderCartPanel();
      openPanel("cart-panel");
    });
  }

  document.querySelectorAll("[data-close-panel]").forEach((btn) => {
    btn.addEventListener("click", closePanels);
  });
}

function initUtilityPanels() {
  initPanels();
}

/* ---------- product page ---------- */

function initProductPage() {
  const title = document.getElementById("product-page-title");
  if (!title) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id") || "tee";
  const product = PRODUCT_DATA[productId] || PRODUCT_DATA.tee;

  document.body.dataset.productId = product.id;
  document.title = `${product.name} | Longevity Co.`;

  const image = document.getElementById("product-page-image");
  const price = document.getElementById("product-page-price");
  const description = document.getElementById("product-page-description");
  const category = document.getElementById("product-page-category");

  if (image) {
    image.src = product.image;
    image.alt = product.name;
  }

  title.textContent = product.name;
  if (price) price.textContent = product.price;
  if (description) description.textContent = product.description;
  if (category) category.textContent = product.category;

  syncFavoriteStates();

  const relatedWrap = document.getElementById("related-products");
  if (!relatedWrap) return;

  const related = Object.values(PRODUCT_DATA)
    .filter((item) => item.id !== product.id)
    .slice(0, 3);

  relatedWrap.innerHTML = related.map((item, index) => `
    <article
      class="product-card shop-product-card reveal-${index === 0 ? "left" : index === 1 ? "up" : "right"}"
      data-product-id="${item.id}"
      data-product-name="${item.name}"
      data-product-price="${item.price}"
      data-product-image="${item.image}"
      data-product-description="${item.description}"
      data-product-category="${item.category}"
    >
      <button class="favorite-btn" type="button" aria-label="Add to favorites">
        <span>${isFavorite(item.id) ? "♥" : "♡"}</span>
      </button>

      <a class="product-image-link" href="product.html?id=${item.id}" aria-label="View ${item.name} product page">
        <div class="product-image-wrap">
          <img src="${item.image}" alt="${item.name}" />
        </div>
      </a>

      <div class="product-meta">
        <div>
          <button class="product-title product-title-trigger" type="button">${item.name}</button>
          <p class="product-sub">${item.price}</p>
        </div>
      </div>

      <div class="product-actions">
        <div class="size-row" data-size-group>
          <button class="size-chip is-selected" type="button" data-size="S">S</button>
          <button class="size-chip" type="button" data-size="M">M</button>
          <button class="size-chip" type="button" data-size="L">L</button>
          <button class="size-chip" type="button" data-size="XL">XL</button>
        </div>

        <button class="add-cart-btn" type="button">Add to Cart</button>
      </div>
    </article>
  `;

  initSizeGroups(relatedWrap);

  relatedWrap.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = button.closest(".shop-product-card");
      toggleFavorite(buildProductFromCard(card));
    });
  });

  relatedWrap.querySelectorAll(".add-cart-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = button.closest(".shop-product-card");
      const productToAdd = {
        ...buildProductFromCard(card),
        size: getSelectedSize(card),
      };

      addToCart(productToAdd);
      buttonFeedback(button, productToAdd.size);
    });
  });

  relatedWrap.querySelectorAll(".product-title-trigger").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = button.closest(".shop-product-card");
      if (!card) return;

      openDrawerForProduct(card.dataset.productId || "");
    });
  });
}

/* ---------- cart page ---------- */

function initCartPage() {
  const cartItemsEl = document.getElementById("cart-items");
  const cartEmptyEl = document.getElementById("cart-empty");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");

  if (!cartItemsEl || !cartEmptyEl || !subtotalEl || !totalEl) return;

  function renderCart() {
    const cart = getCart();
    cartItemsEl.innerHTML = "";

    if (!cart.length) {
      cartEmptyEl.hidden = false;
      subtotalEl.textContent = "$0";
      totalEl.textContent = "$0";
      updateCartCount();
      return;
    }

    cartEmptyEl.hidden = true;

    let subtotal = 0;

    cart.forEach((item, index) => {
      const numericPrice = parsePrice(item.price);
      subtotal += numericPrice * item.quantity;

      const article = document.createElement("article");
      article.className = "cart-item";

      article.innerHTML = `
        <div class="cart-item-media">
          <img src="${item.image}" alt="${item.name}" />
        </div>

        <div class="cart-item-content">
          <div class="cart-item-top">
            <div>
              <h3>${item.name}</h3>
              <p>${item.price}</p>
            </div>
            <button class="cart-remove-btn" type="button" data-index="${index}">Remove</button>
          </div>

          <div class="cart-item-meta">
            <span>Size: ${item.size}</span>
          </div>

          <div class="cart-item-bottom">
            <div class="cart-qty">
              <button type="button" class="qty-btn" data-action="decrease" data-index="${index}">−</button>
              <span>${item.quantity}</span>
              <button type="button" class="qty-btn" data-action="increase" data-index="${index}">+</button>
            </div>

            <div class="cart-line-price">
              ${formatPrice(numericPrice * item.quantity)}
            </div>
          </div>
        </div>
      `;

      cartItemsEl.appendChild(article);
    });

    subtotalEl.textContent = formatPrice(subtotal);
    totalEl.textContent = formatPrice(subtotal);
    updateCartCount();

    cartItemsEl.querySelectorAll(".cart-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextCart = getCart();
        nextCart.splice(Number(btn.dataset.index), 1);
        saveCart(nextCart);
        renderCart();
      });
    });

    cartItemsEl.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextCart = getCart();
        const index = Number(btn.dataset.index);
        const action = btn.dataset.action;

        if (!nextCart[index]) return;

        if (action === "increase") {
          nextCart[index].quantity += 1;
        }

        if (action === "decrease") {
          nextCart[index].quantity -= 1;
          if (nextCart[index].quantity <= 0) {
            nextCart.splice(index, 1);
          }
        }

        saveCart(nextCart);
        renderCart();
      });
    });
  }

  renderCart();
}

function initCheckoutPlaceholder() {}
