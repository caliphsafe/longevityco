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
  updateCartCountUI();
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

function initFavorites() {
  document.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      button.classList.toggle("is-active");

      const span = button.querySelector("span");
      if (span) {
        span.textContent = button.classList.contains("is-active") ? "♥" : "♡";
      }
    });
  });
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

  document.querySelectorAll(".product-click-area, .product-title").forEach((trigger) => {
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

      drawerFavoriteBtn.classList.remove("is-active");
      const span = drawerFavoriteBtn.querySelector("span");
      if (span) span.textContent = "♡";

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
  overlay.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
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
