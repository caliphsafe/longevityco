function getSiteHeader() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isActive = (page) => (currentPage === page ? "active" : "");

  return `
    <header class="site-header global-site-header">
      <div class="container header-inner header-inner-global">
        <button class="brand brand-centered nav-logo-trigger" aria-label="Open site navigation" aria-expanded="false" aria-controls="global-site-nav" type="button">
          <img src="assets/site-logi-2.png" alt="Longevity logo" class="brand-logo" />
        </button>
        <nav class="site-nav global-site-nav" id="global-site-nav" aria-hidden="true">
          <div class="site-nav-inner">
            <p class="home-white-time nav-overlay-time"><span id="hero-current-date">04/21/2026</span><span class="home-blackout-time-gap"></span><span id="hero-current-time">1:52 PM EDT</span></p>
            <a href="index.html" class="${isActive("index.html")}">Home</a>
            <a href="shop.html" class="${isActive("shop.html")}">Shop</a>
            <a href="uniform.html" class="${isActive("uniform.html")}">Uniform</a>
            <a href="about.html#order-info" class="${currentPage === "about.html" ? "active" : ""}">Order Info</a>
            <a href="contact.html" class="${isActive("contact.html")}">Contact</a>
            <a href="about.html" class="${isActive("about.html")}">About the Brand</a>
            <a href="lookbook.html" class="${isActive("lookbook.html")}">Lookbook</a>
            <a href="cart.html" class="nav-cart-link ${isActive("cart.html")}">Cart <span class="cart-count" data-cart-count>0</span></a>
          </div>
        </nav>
      </div>
    </header>`;
}

function getSiteFooter() {
  return `<footer class="site-footer global-site-footer"><div class="container footer-inner footer-inner-global">
    <div class="footer-center-mark"><img src="assets/logo.png" alt="Longevity logo" class="footer-logo" /></div>
    <div class="footer-links footer-links-global"><a href="index.html">Home</a><a href="shop.html">Shop</a><a href="uniform.html">Uniform</a><a href="about.html#order-info">Order Info</a><a href="contact.html">Contact</a><a href="about.html">About</a><a href="lookbook.html">Lookbook</a></div>
    <p class="footer-system-note">© 2026 LONGEVITY CO. ALL RIGHTS RESERVED.</p>
  </div></footer>`;
}

function setNavOverlayImage() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  let imagePath = "";
  if (currentPage === "shop.html" || currentPage === "product.html" || currentPage === "cart.html" || currentPage === "uniform.html") imagePath = "url('assets/hoodie.png')";
  else if (currentPage === "lookbook.html") imagePath = "url('assets/look/look1_1.png')";
  else if (currentPage === "about.html" || currentPage === "contact.html") imagePath = "url('assets/shirt.png')";
  else imagePath = "none";
  document.documentElement.style.setProperty("--nav-overlay-image", imagePath);
}

function initInjectedLogoOverlayNav() {
  const logoTrigger=document.querySelector(".nav-logo-trigger"), siteNav=document.querySelector(".site-nav");
  if(!logoTrigger||!siteNav)return;
  const closeNav=()=>{siteNav.classList.remove("open");siteNav.setAttribute("aria-hidden","true");logoTrigger.setAttribute("aria-expanded","false");document.body.classList.remove("nav-open");};
  const openNav=()=>{siteNav.classList.add("open");siteNav.setAttribute("aria-hidden","false");logoTrigger.setAttribute("aria-expanded","true");document.body.classList.add("nav-open");};
  logoTrigger.addEventListener("click",()=>siteNav.classList.contains("open")?closeNav():openNav());
  siteNav.querySelectorAll("a").forEach(link=>link.addEventListener("click",closeNav));
  siteNav.addEventListener("click",e=>{if(e.target===siteNav)closeNav();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeNav();});
}
function injectGlobalChrome(){const h=document.getElementById("site-header"),f=document.getElementById("site-footer");if(h)h.innerHTML=getSiteHeader();if(f)f.innerHTML=getSiteFooter();setNavOverlayImage();initInjectedLogoOverlayNav();}
document.addEventListener("DOMContentLoaded",injectGlobalChrome);
