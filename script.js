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

  if ("IntersectionObserver" in window) {
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
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  initSizeChips();
  initFavorites();
  initAddToCartButtons();
  initCartPage();
  initCheckoutPlaceholder();
  initUtilityPanels();
  initProductPage();
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

  const productPageFavorite = document.getElementById("product-page-favorite");
  const productPage = document.body.dataset.productId;
  if (productPageFavorite && productPage) {
    const active = isFavorite(productPage);
    productPageFavorite.classList.toggle("is-active", active);
    const span = productPageFavorite.querySelector("span");
    if (span) span.textContent = active ? "♥" : "♡";
  }
}

function initFavorites() {
  document.querySelectorAll(".shop-product-card .favorite-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const card = button.closest(".shop-product-card");
      if (!card) return;

      toggleFavorite(buildProductFromCard(card));
    });
  });

  const productPageFavorite = document.getElementById("product-page-favorite");
  if (productPageFavorite) {
    productPageFavorite.addEventListener("click", () => {
      const productId = document.body.dataset.productId;
      const product = PRODUCT_DATA[productId];
      if (!product) return;
      toggleFavorite(product);
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
      const productPageButton = button.closest(".product-page-content");

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

      if (productPageButton && button.id === "product-page-add-cart") {
        const productId = document.body.dataset.productId;
        const data = PRODUCT_DATA[productId];
        const selected = document.querySelector(".product-page-size-row .size-chip.is-selected");

        if (data) {
          product = {
            ...data,
            size: selected ? selected.textContent.trim() : "S",
          };
        }
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
  if (overlay) {
    overlay.classList.remove("is-visible");
    document.body.classList.remove("drawer-open");
  }
}

function openPanel(panelId) {
  const panel = document.getElementById(panelId);
  const overlay = document.getElementById("shop-drawer-overlay");
  if (!panel || !overlay) return;

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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanels();
    }
  });
}

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

  syncFavoriteButtons();

  const relatedWrap = document.getElementById("related-products");
  if (relatedWrap) {
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
      >
        <button class="favorite-btn" type="button" aria-label="Add to favorites">
          <span>${isFavorite(item.id) ? "♥" : "♡"}</span>
        </button>

        <a class="product-click-area" href="product.html?id=${item.id}" aria-label="View ${item.name} details">
          <div class="product-image-wrap">
            <img src="${item.image}" alt="${item.name}" />
          </div>
        </a>

        <div class="product-meta">
          <div>
            <a class="product-title product-title-link" href="product.html?id=${item.id}">${item.name}</a>
            <p class="product-sub">${item.price}</p>
          </div>
        </div>
      </article>
    `;

    relatedWrap.querySelectorAll(".favorite-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const card = button.closest(".shop-product-card");
        if (!card) return;
        toggleFavorite(buildProductFromCard(card));
      });
    });
  }
}
