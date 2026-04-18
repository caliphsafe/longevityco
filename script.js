document.addEventListener("DOMContentLoaded", () => {
  const revealItems = document.querySelectorAll(".reveal-left, .reveal-right, .reveal-up");
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      siteNav.classList.toggle("open");
    });

    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("open");
      });
    });
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
      threshold: 0.14,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 0.05, 0.28)}s`;
    observer.observe(item);
  });

  initSizeChips();
  initFavorites();
  initShopDrawer();
  initAddToCartButtons();
  initCartPage();
  initCheckoutPlaceholder();
  initUtilityPanels();
  updateCartCountUI();
  updateFavoritesCountUI();
  syncFavoriteButtons();
  renderFavoritesPanel();
  renderCartPanel();
});

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("longevity_cart")) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("longevity_cart", JSON.stringify(cart));
  updateCartCountUI();
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
  updateFavoritesCountUI();
  syncFavoriteButtons();
  renderFavoritesPanel();
}

function parsePrice(priceString) {
  return Number(String(priceString).replace(/[^0-9.]/g, "")) || 0;
}

function formatPrice(value) {
  return `$${value.toFixed(2).replace(".00", "")}`;
}

function updateCartCountUI() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
  });

  document.querySelectorAll("[data-cart-count-label]").forEach((el) => {
    el.textContent = `${count} item${count === 1 ? "" : "s"}`;
  });
}

function updateFavoritesCountUI() {
  const favorites = getFavorites();
  document.querySelectorAll("[data-favorites-count]").forEach((el) => {
    el.textContent = favorites.length;
  });
}

function initSizeChips() {
  document.querySelectorAll(".size-row").forEach((row) => {
    const chips = row.querySelectorAll(".size-chip");

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((btn) => btn.classList.remove("is-selected"));
        chip.classList.add("is-selected");
      });
    });
  });
}

function buildProductFromCard(card) {
  return {
    id: card.dataset.productId || "item",
    name: card.dataset.productName || "Item",
    price: card.dataset.productPrice || "$0",
    image: card.dataset.productImage || "",
    description: card.dataset.productDescription || "",
  };
}

function isFavorite(productId) {
  return getFavorites().some((item) => item.id === productId);
}

function toggleFavorite(product) {
  const favorites = getFavorites();
  const index = favorites.findIndex((item) => item.id === product.id);

  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(product);
  }

  saveFavorites(favorites);
}

function syncFavoriteButtons() {
  document.querySelectorAll(".shop-product-card").forEach((card) => {
    const button = card.querySelector(".favorite-btn");
    if (!button) return;

    const active = isFavorite(card.dataset.productId || "");
    button.classList.toggle("is-active", active);

    const span = button.querySelector("span");
    if (span) span.textContent = active ? "♥" : "♡";
  });
}

function initFavorites() {
  document.querySelectorAll(".shop-product-card .favorite-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const card = button.closest(".shop-product-card");
      if (!card) return;

      toggleFavorite(buildProductFromCard(card));
    });
  });

  const drawerFavoriteBtn = document.getElementById("drawer-favorite-btn");
  if (drawerFavoriteBtn) {
    drawerFavoriteBtn.addEventListener("click", () => {
      const drawer = document.getElementById("shop-drawer");
      if (!drawer) return;

      const product = {
        id: drawer.dataset.productId || "item",
        name: document.getElementById("drawer-title")?.textContent?.trim() || "Item",
        price: document.getElementById("drawer-price")?.textContent?.trim() || "$0",
        image: document.getElementById("drawer-image")?.getAttribute("src") || "",
        description: document.getElementById("drawer-description")?.textContent?.trim() || "",
      };

      toggleFavorite(product);

      const active = isFavorite(product.id);
      drawerFavoriteBtn.classList.toggle("is-active", active);
      const span = drawerFavoriteBtn.querySelector("span");
      if (span) span.textContent = active ? "♥" : "♡";
    });
  }
}

function addItemToCart(product) {
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

function initAddToCartButtons() {
  document.querySelectorAll(".add-cart-btn").forEach((button) => {
    if (button.id === "checkout-placeholder-btn") return;

    button.addEventListener("click", (event) => {
      if (button.classList.contains("panel-cart-link")) return;

      event.stopPropagation();

      const card = button.closest(".shop-product-card");
      const drawer = button.closest(".shop-drawer");

      let product = null;

      if (card) {
        const selected = card.querySelector(".size-chip.is-selected");
        product = {
          id: card.dataset.productId || "item",
          name: card.dataset.productName || "Item",
          price: card.dataset.productPrice || "$0",
          image: card.dataset.productImage || "",
          description: card.dataset.productDescription || "",
          size: selected ? selected.textContent.trim() : "S",
        };
      }

      if (drawer) {
        const selected = drawer.querySelector(".drawer-size-row .size-chip.is-selected");
        product = {
          id: drawer.dataset.productId || "item",
          name: document.getElementById("drawer-title")?.textContent?.trim() || "Item",
          price: document.getElementById("drawer-price")?.textContent?.trim() || "$0",
          image: document.getElementById("drawer-image")?.getAttribute("src") || "",
          description: document.getElementById("drawer-description")?.textContent?.trim() || "",
          size: selected ? selected.textContent.trim() : "S",
        };
      }

      if (!product) return;

      addItemToCart(product);

      const original = button.textContent;
      button.textContent = `Added • ${product.size}`;
      button.classList.add("is-added");

      setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-added");
      }, 1300);
    });
  });
}

function initShopDrawer() {
  const drawer = document.getElementById("shop-drawer");
  const overlay = document.getElementById("shop-drawer-overlay");
  const closeBtn = document.getElementById("shop-drawer-close");

  if (!drawer || !overlay || !closeBtn) return;

  const drawerImage = document.getElementById("drawer-image");
  const drawerTitle = document.getElementById("drawer-title");
  const drawerPrice = document.getElementById("drawer-price");
  const drawerDescription = document.getElementById("drawer-description");
  const drawerFavoriteBtn = document.getElementById("drawer-favorite-btn");

  document.querySelectorAll(".product-click-area, .product-title-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const card = trigger.closest(".shop-product-card");
      if (!card) return;

      const productName = card.dataset.productName || "";
      const productPrice = card.dataset.productPrice || "";
      const productImage = card.dataset.productImage || "";
      const productDescription = card.dataset.productDescription || "";
      const productId = card.dataset.productId || "";

      drawer.dataset.productId = productId;
      drawerImage.src = productImage;
      drawerImage.alt = productName;
      drawerTitle.textContent = productName;
      drawerPrice.textContent = productPrice;
      drawerDescription.textContent = productDescription;

      drawer.querySelectorAll(".drawer-size-row .size-chip").forEach((chip, index) => {
        chip.classList.toggle("is-selected", index === 0);
      });

      const active = isFavorite(productId);
      drawerFavoriteBtn.classList.toggle("is-active", active);
      const span = drawerFavoriteBtn.querySelector("span");
      if (span) span.textContent = active ? "♥" : "♡";

      closePanels();
      drawer.classList.add("is-open");
      overlay.classList.add("is-visible");
      drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("drawer-open");
    });
  });

  const closeDrawer = () => {
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
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
      updateCartCountUI();
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
    updateCartCountUI();

    cartItemsEl.querySelectorAll(".cart-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cart = getCart();
        cart.splice(Number(btn.dataset.index), 1);
        saveCart(cart);
        renderCart();
      });
    });

    cartItemsEl.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cart = getCart();
        const index = Number(btn.dataset.index);
        const action = btn.dataset.action;

        if (!cart[index]) return;

        if (action === "increase") {
          cart[index].quantity += 1;
        }

        if (action === "decrease") {
          cart[index].quantity -= 1;
          if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
          }
        }

        saveCart(cart);
        renderCart();
      });
    });
  }

  renderCart();
}

function initCheckoutPlaceholder() {
  const btn = document.getElementById("checkout-placeholder-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const original = btn.textContent;
    btn.textContent = "Checkout Coming Soon";
    btn.classList.add("is-added");

    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("is-added");
    }, 1400);
  });
}

function closePanels() {
  document.querySelectorAll(".side-panel").forEach((panel) => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  });

  const overlay = document.getElementById("shop-drawer-overlay");
  if (overlay && !document.getElementById("shop-drawer")?.classList.contains("is-open")) {
    overlay.classList.remove("is-visible");
    document.body.classList.remove("drawer-open");
  }
}

function openPanel(panelId) {
  const panel = document.getElementById(panelId);
  const overlay = document.getElementById("shop-drawer-overlay");
  const productDrawer = document.getElementById("shop-drawer");

  if (!panel || !overlay) return;

  if (productDrawer) {
    productDrawer.classList.remove("is-open");
    productDrawer.setAttribute("aria-hidden", "true");
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
        <button class="mini-link-btn" type="button" data-remove-favorite="${item.id}">Remove</button>
      </div>
    `;

    wrap.appendChild(card);
  });

  wrap.querySelectorAll("[data-remove-favorite]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-favorite");
      const favorites = getFavorites().filter((item) => item.id !== id);
      saveFavorites(favorites);
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
        <button class="mini-link-btn" type="button" data-remove-cart="${index}">Remove</button>
      </div>
    `;

    wrap.appendChild(card);
  });

  subtotal.textContent = formatPrice(total);

  wrap.querySelectorAll("[data-remove-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-remove-cart"));
      const cart = getCart();
      cart.splice(index, 1);
      saveCart(cart);
    });
  });
}

function initUtilityPanels() {
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
    cartBtn.addEventListener("click", () => {
      renderCartPanel();
      openPanel("cart-panel");
    });
  }

  document.querySelectorAll("[data-close-panel]").forEach((btn) => {
    btn.addEventListener("click", closePanels);
  });

  if (overlay) {
    overlay.addEventListener("click", closePanels);
  }
}
