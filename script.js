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
});

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

function initAddToCartButtons() {
  document.querySelectorAll(".add-cart-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      const card = button.closest(".shop-product-card");
      const drawer = button.closest(".shop-drawer");

      let productName = "Item";
      let size = "S";

      if (card) {
        productName = card.dataset.productName || "Item";
        const selected = card.querySelector(".size-chip.is-selected");
        size = selected ? selected.textContent.trim() : "S";
      }

      if (drawer) {
        productName = document.getElementById("drawer-title")?.textContent?.trim() || "Item";
        const selected = drawer.querySelector(".drawer-size-row .size-chip.is-selected");
        size = selected ? selected.textContent.trim() : "S";
      }

      const original = button.textContent;
      button.textContent = `Added • ${size}`;
      button.classList.add("is-added");

      setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-added");
      }, 1300);

      console.log(`Added to cart: ${productName} (${size})`);
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
