function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function isActive(page) {
  return getCurrentPage() === page ? "active" : "";
}

function getSiteHeader() {
  return `
    <header class="site-header global-site-header">
      <div class="container header-inner header-inner-global">
        <div class="header-side header-side-left">
          <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="global-site-nav">
            <span></span>
            <span></span>
          </button>

          <nav class="site-nav global-site-nav nav-left desktop-nav" aria-label="Primary left">
            <a href="index.html" class="${isActive("index.html")}">Home</a>
            <a href="shop.html" class="${isActive("shop.html")}">Shop</a>
            <a href="lookbook.html" class="${isActive("lookbook.html")}">Lookbook</a>
          </nav>
        </div>

        <a href="index.html" class="brand brand-centered" aria-label="Longevity home">
          <img src="assets/logo.png" alt="Longevity logo" class="brand-logo" />
        </a>

        <div class="header-side header-side-right">
          <nav class="site-nav global-site-nav nav-right desktop-nav" aria-label="Primary right">
            <a href="about.html" class="${isActive("about.html")}">About</a>
            <a href="contact.html" class="${isActive("contact.html")}">Contact</a>
            <a href="cart.html" class="nav-cart-link ${isActive("cart.html")}">
              Cart <span class="cart-count" data-cart-count>0</span>
            </a>
          </nav>
        </div>
      </div>

      <nav
        class="site-nav mobile-site-nav"
        id="global-site-nav"
        aria-label="Mobile navigation"
      >
        <a href="index.html" class="${isActive("index.html")}">Home</a>
        <a href="shop.html" class="${isActive("shop.html")}">Shop</a>
        <a href="lookbook.html" class="${isActive("lookbook.html")}">Lookbook</a>
        <a href="about.html" class="${isActive("about.html")}">About</a>
        <a href="contact.html" class="${isActive("contact.html")}">Contact</a>
        <a href="cart.html" class="nav-cart-link ${isActive("cart.html")}">
          Cart <span class="cart-count" data-cart-count>0</span>
        </a>
      </nav>
    </header>
  `;
}

function getSiteFooter() {
  return `
    <footer class="site-footer global-site-footer">
      <div class="container footer-inner footer-inner-global">
        <div class="footer-block footer-block-left">
          <p class="footer-system-note">Longevity / New England / Direct</p>
        </div>

        <div class="footer-center-mark">
          <a href="index.html" aria-label="Longevity home">
            <img src="assets/logo.png" alt="Longevity logo" class="footer-logo" />
          </a>
        </div>

        <div class="footer-block footer-block-right">
          <div class="footer-links footer-links-global">
            <a href="index.html">Home</a>
            <a href="shop.html">Shop</a>
            <a href="lookbook.html">Lookbook</a>
            <a href="about.html">About</a>
            <a href="contact.html">Contact</a>
            <a href="cart.html">Cart</a>
          </div>
        </div>
      </div>
    </footer>
  `;
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
}

document.addEventListener("DOMContentLoaded", injectGlobalChrome);
