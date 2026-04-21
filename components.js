function getSiteHeader() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const isActive = (page) => (currentPage === page ? "active" : "");

  return `
    <header class="site-header global-site-header">
      <div class="container header-inner header-inner-global">
        <a href="index.html" class="brand brand-centered" aria-label="Longevity home">
          <img src="assets/site-logi-2.png" alt="Longevity logo" class="brand-logo" />
        </a>

        <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="global-site-nav">
          <span></span>
          <span></span>
        </button>

        <nav class="site-nav global-site-nav" id="global-site-nav" aria-hidden="true">
          <div class="site-nav-inner">
            <a href="index.html" class="${isActive("index.html")}">Home</a>
            <a href="shop.html" class="${isActive("shop.html")}">Shop</a>
            <a href="lookbook.html" class="${isActive("lookbook.html")}">Lookbook</a>
            <a href="about.html#order-info" class="${currentPage === "about.html" ? "active" : ""}">Order Info</a>
            <a href="about.html" class="${isActive("about.html")}">About</a>
            <a href="contact.html" class="${isActive("contact.html")}">Contact</a>
            <a href="cart.html" class="nav-cart-link ${isActive("cart.html")}">
              Cart <span class="cart-count" data-cart-count>0</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  `;
}

function getSiteFooter() {
  return `
    <footer class="site-footer global-site-footer">
      <div class="container footer-inner footer-inner-global">
        <div class="footer-center-mark">
          <img src="assets/site-logi-2.png" alt="Longevity logo" class="footer-logo" />
        </div>

        <div class="footer-links footer-links-global">
          <a href="index.html">Home</a>
          <a href="shop.html">Shop</a>
          <a href="lookbook.html">Lookbook</a>
          <a href="about.html#order-info">Order Info</a>
          <a href="about.html">About</a>
          <a href="contact.html">Contact</a>
          <a href="cart.html">Cart</a>
        </div>

        <p class="footer-system-note">© 2026 LONGEVITY CO. ALL RIGHTS RESERVED.</p>
      </div>
    </footer>
  `;
}

function setNavOverlayImage() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  let imagePath = "";

  if (currentPage === "shop.html" || currentPage === "product.html" || currentPage === "cart.html") {
    imagePath = "url('assets/hoodie.png')";
  } else if (currentPage === "lookbook.html") {
    imagePath = "url('assets/look/look1_1.png')";
  } else if (currentPage === "about.html" || currentPage === "contact.html") {
    imagePath = "url('assets/shirt.png')";
  } else {
    imagePath = "none";
  }

  document.documentElement.style.setProperty("--nav-overlay-image", imagePath);
}

function initInjectedMenu() {
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (!menuToggle || !siteNav) return;

  const closeMenu = () => {
    siteNav.classList.remove("open");
    siteNav.setAttribute("aria-hidden", "true");
    menuToggle.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  };

  const openMenu = () => {
    siteNav.classList.add("open");
    siteNav.setAttribute("aria-hidden", "false");
    menuToggle.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("nav-open");
  };

  menuToggle.addEventListener("click", () => {
    if (siteNav.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

function injectGlobalChrome() {
  const headerMount = document.getElementById("site-header");
  const footerMount = document.getElementById("site-footer");

  if (headerMount) {
    headerMount.innerHTML = getSiteHeader();
  }

  if (footerMount) {
    footerMount.innerHTML = getSiteFooter();
  }

  setNavOverlayImage();
  initInjectedMenu();
}

document.addEventListener("DOMContentLoaded", injectGlobalChrome);
