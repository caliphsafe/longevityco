/*
  LONGEVITY CO. — SIMPLE SHOP CATEGORY FILTERS
  Keeps the original single product grid and adds Shopify-backed categories.
*/
(() => {
  let activeFilter = "all";

  function clean(value) {
    return String(value || "").trim().toLowerCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ");
  }

  function categoryFor(product) {
    const raw = clean(product?.category || product?.raw?.productType);
    if (["hoodie","hoodies","sweatshirt","sweatshirts"].includes(raw)) return "hoodies";
    if (["t-shirt","t-shirts","t shirt","t shirts","tee","tees","shirt","shirts"].includes(raw)) return "t-shirts";
    if (["pant","pants","trouser","trousers","jogger","joggers"].includes(raw)) return "pants";
    if (["short","shorts"].includes(raw)) return "shorts";
    if (["headwear","hat","hats","cap","caps","beanie","beanies"].includes(raw)) return "headwear";
    if (["accessory","accessories"].includes(raw)) return "accessories";

    const clue = clean([product?.name, product?.raw?.title, product?.raw?.productType].filter(Boolean).join(" "));
    if (/(hoodie|hooded|sweatshirt|pullover)/.test(clue)) return "hoodies";
    if (/(t[\s-]?shirt|tee\b|shirt\b|long[\s-]?sleeve|jersey)/.test(clue)) return "t-shirts";
    if (/(sweatpant|jogger|trouser|jean|pants?\b)/.test(clue)) return "pants";
    if (/(shorts?\b)/.test(clue)) return "shorts";
    if (/(hat\b|cap\b|beanie|headwear|snapback)/.test(clue)) return "headwear";
    return "accessories";
  }

  function applyFilter() {
    const cards = [...document.querySelectorAll("#shop-grid .shop-product-card")];
    let visible = 0;

    cards.forEach(card => {
      const handle = card.dataset.productHandle;
      const product = Array.isArray(SHOP_PRODUCTS) ? SHOP_PRODUCTS.find(item => item.handle === handle) : null;
      const show = activeFilter === "all" || (product && categoryFor(product) === activeFilter);
      card.hidden = !show;
      if (show) visible++;
    });

    const count = document.getElementById("shop-count");
    if (count) count.textContent = `${visible} Item${visible === 1 ? "" : "s"}`;

    document.querySelectorAll("[data-editorial-filter]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.editorialFilter === activeFilter);
    });
  }

  function bind() {
    document.querySelectorAll("[data-editorial-filter]").forEach(button => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.editorialFilter || "all";
        applyFilter();
      });
    });

    const grid = document.getElementById("shop-grid");
    if (grid) {
      new MutationObserver(() => requestAnimationFrame(applyFilter))
        .observe(grid, { childList: true });
    }

    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (document.querySelector("#shop-grid .shop-product-card")) {
        clearInterval(timer);
        applyFilter();
      } else if (attempts > 100) {
        clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
