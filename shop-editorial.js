(() => {
  const ORDER = [["hoodies","Hoodies"],["t-shirts","T-Shirts"],["pants","Pants"],["shorts","Shorts"],["headwear","Headwear"],["accessories","Accessories"]];
  let active="all", rendered=false;
  const clean=v=>String(v||"").trim().toLowerCase().replace(/[_/]+/g," ").replace(/\s+/g," ");

  function categoryFor(p){
    const raw=clean(p?.category||p?.raw?.productType);
    if(["hoodie","hoodies","sweatshirt","sweatshirts"].includes(raw)) return "hoodies";
    if(["t-shirt","t-shirts","t shirt","t shirts","tee","tees","shirt","shirts"].includes(raw)) return "t-shirts";
    if(["pant","pants","trouser","trousers","jogger","joggers"].includes(raw)) return "pants";
    if(["short","shorts"].includes(raw)) return "shorts";
    if(["headwear","hat","hats","cap","caps","beanie","beanies"].includes(raw)) return "headwear";
    if(["accessory","accessories"].includes(raw)) return "accessories";
    const clue=clean([p?.name,p?.raw?.title,p?.raw?.productType].filter(Boolean).join(" "));
    if(/(hoodie|hooded|sweatshirt|pullover)/.test(clue)) return "hoodies";
    if(/(t[\s-]?shirt|tee\b|shirt\b|long[\s-]?sleeve|jersey)/.test(clue)) return "t-shirts";
    if(/(sweatpant|jogger|trouser|jean|pants?\b)/.test(clue)) return "pants";
    if(/(shorts?\b)/.test(clue)) return "shorts";
    if(/(hat\b|cap\b|beanie|headwear|snapback)/.test(clue)) return "headwear";
    return "accessories";
  }

  function slot(p){
    for(const tag of (p?.raw?.tags||[])){ const m=String(tag).match(/^LC_FEATURED:([1-4])$/i); if(m) return Number(m[1]); }
    return 0;
  }

  function card(p,i=0){
    const reveal=i%3===0?"reveal-left":i%3===1?"reveal-up":"reveal-right";
    return `<article class="product-card shop-product-card ${reveal}"
      data-product-handle="${escapeHtml(p.handle)}" data-product-name="${escapeHtml(p.name)}"
      data-product-price="${escapeHtml(p.price)}" data-product-image="${escapeHtml(p.image)}"
      data-product-second-image="${escapeHtml(p.secondImage||"")}" data-product-description="${escapeHtml(p.description)}"
      data-product-category="${escapeHtml(p.category)}" data-variants='${escapeHtml(JSON.stringify(p.variants))}'>
      <button class="favorite-btn" type="button" aria-label="Add to favorites"><span>${isFavorite(p.handle)?"♥":"♡"}</span></button>
      <a class="product-image-link" href="product.html?handle=${encodeURIComponent(p.handle)}" aria-label="View ${escapeHtml(p.name)} product page">
        <div class="product-image-wrap"><img class="product-image-primary" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.imageAlt||p.name)}" />
        ${p.secondImage?`<img class="product-image-secondary" src="${escapeHtml(p.secondImage)}" alt="${escapeHtml(p.name)} alternate image" />`:""}</div>
      </a>
      <div class="product-meta"><div><button class="product-title product-title-trigger" type="button">${escapeHtml(p.name)}</button><p class="product-sub">${escapeHtml(p.price)}</p></div></div>
      <div class="product-actions"><div class="size-row" data-size-group>${buildSizeOptions(p)}</div><button class="add-cart-btn" type="button">Add to Cart</button></div>
    </article>`;
  }

  function activate(scope){ initSizeChips(scope); initShopInteractions(); syncFavoriteButtons(); initRevealAnimations(); }

  function featured(){
    const tagged=SHOP_PRODUCTS.filter(slot).sort((a,b)=>slot(a)-slot(b)).slice(0,4);
    return tagged.length?tagged:SHOP_PRODUCTS.slice(0,4);
  }

  function renderFeatured(){
    const wrap=document.getElementById("shop-featured-grid"), section=document.getElementById("shop-featured-section");
    if(!wrap||!section)return;
    const items=featured();
    section.hidden=!items.length;
    wrap.innerHTML=items.map(card).join("");
    const count=document.getElementById("featured-count"); if(count) count.textContent=`${items.length} / 4`;
    activate(wrap);
  }

  function renderCatalog(){
    const host=document.getElementById("categorized-shop-sections"); if(!host)return;
    const featuredHandles=new Set(featured().map(p=>p.handle));
    const catalog=SHOP_PRODUCTS.filter(p=>!featuredHandles.has(p.handle));
    const visible=active==="featured" ? [] : (active==="all"?catalog:catalog.filter(p=>categoryFor(p)===active));
    const count=document.getElementById("shop-count"); if(count) count.textContent=`${visible.length} Item${visible.length===1?"":"s"}`;
    document.querySelectorAll("[data-editorial-filter]").forEach(b=>b.classList.toggle("is-active",b.dataset.editorialFilter===active));

    const sections=(active==="featured"?[]:(active==="all"?ORDER:ORDER.filter(([key])=>key===active))).map(([key,label])=>{
      const items=catalog.filter(p=>categoryFor(p)===key);
      if(!items.length)return "";
      return `<section class="simple-product-section"><div class="simple-section-heading"><span>${escapeHtml(label)}</span><span>${items.length}</span></div>
        <div class="product-grid shop-grid simple-category-grid">${items.map(card).join("")}</div></section>`;
    }).join("");
    host.innerHTML=active==="featured" ? "" : (sections || `<div class="simple-empty-category">No items in this category.</div>`);
    activate(host);
  }

  function render(){
    if(!Array.isArray(SHOP_PRODUCTS)||!SHOP_PRODUCTS.length)return;
    const bootstrap=document.getElementById("shop-grid"); if(bootstrap){bootstrap.innerHTML="";bootstrap.classList.add("shop-bootstrap-grid");}
    renderFeatured(); renderCatalog(); rendered=true;
  }

  function boot(){
    document.querySelectorAll("[data-editorial-filter]").forEach(b=>b.addEventListener("click",()=>{
      active=b.dataset.editorialFilter||"featured";
      const featuredSection=document.getElementById("shop-featured-section");
      if(featuredSection) featuredSection.hidden = active!=="featured" && active!=="all";
      renderCatalog();

    }));
    let tries=0; const timer=setInterval(()=>{tries++; if(Array.isArray(SHOP_PRODUCTS)&&SHOP_PRODUCTS.length){clearInterval(timer);setTimeout(render,50);} else if(tries>100)clearInterval(timer);},100);
    const grid=document.getElementById("shop-grid"); if(grid)new MutationObserver(()=>{if(rendered&&grid.children.length){grid.innerHTML="";}}).observe(grid,{childList:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();

/* SHOP V11 — sync Shop nav directly beneath the real rendered site header. */
(() => {
  function syncShopHeaderHeight() {
    const host = document.getElementById("site-header");
    if (!host) return;

    const header = host.querySelector(".site-header") || host;
    const height = Math.ceil(header.getBoundingClientRect().height || 0);
    if (height > 0) {
      document.documentElement.style.setProperty("--shop-header-height", `${height}px`);
    }
  }

  const sync = () => requestAnimationFrame(syncShopHeaderHeight);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }

  window.addEventListener("load", sync);
  window.addEventListener("resize", sync, { passive: true });

  if ("ResizeObserver" in window) {
    const timer = setInterval(() => {
      const host = document.getElementById("site-header");
      const header = host?.querySelector(".site-header");
      if (!header) return;

      clearInterval(timer);
      const observer = new ResizeObserver(sync);
      observer.observe(header);
      sync();
    }, 100);

    setTimeout(() => clearInterval(timer), 5000);
  }
})();
