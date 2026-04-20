function getSiteHeader() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const isActive = (page) => (currentPage === page ? "active" : "");

  return `
    <header class="site-header global-site-header">
      <div class="container header-inner header-inner-global">
        <button class="menu-toggle" aria-label="Toggle menu">
          <span></span>
          <span></span>
        </button>

        <a href="index.html" class="brand brand-centered" aria-label="Longevity home">
          <img src="assets/logo.png" alt="Longevity logo" class="brand-logo" />
        </a>

        <nav class="site-nav global-site-nav">
          <a href="index.html" class="${isActive("index.html")}">Home</a>
          <a href="shop.html" class="${isActive("shop.html")}">Shop</a>
          <a href="lookbook.html" class="${isActive("lookbook.html")}">Lookbook</a>
          <a href="about.html" class="${isActive("about.html")}">About</a>
          <a href="contact.html" class="${isActive("contact.html")}">Contact</a>
          <a href="cart.html" class="nav-cart-link ${isActive("cart.html")}">
            Cart <span class="cart-count" data-cart-count>0</span>
          </a>
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
          <img src="assets/logo.png" alt="Longevity logo" class="footer-logo" />
        </div>

        <div class="footer-links footer-links-global">
          <a href="index.html">Home</a>
          <a href="shop.html">Shop</a>
          <a href="lookbook.html">Lookbook</a>
          <a href="about.html">About</a>
          <a href="contact.html">Contact</a>
          <a href="cart.html">Cart</a>
        </div>

        <p class="footer-system-note">LON-NE / DIRECT / WEBSTORE / STUDIO</p>
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
