(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  let installed = false;
  let enhancing = false;

  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn,{once:true});
    else fn();
  }

  ready(()=>{
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(install() || tries>120) clearInterval(timer);
    },50);
  });

  function install(){
    if(installed) return true;
    const view=$("#view-bulk");
    const nav=$(".admin-sidebar nav");
    if(!view || !nav || typeof BULK_PRODUCTS==="undefined") return false;

    installNavigation(nav);
    enhanceBulkView(view);
    observe();
    installed=true;
    return true;
  }

  function installNavigation(nav){
    const ensure=()=>{
      const current=nav.querySelector('[data-view="bulk"]');
      if(current){
        current.textContent="Bulk Upload / Edit";
        return current;
      }

      const btn=document.createElement("button");
      btn.type="button";
      btn.className="admin-nav-link";
      btn.dataset.view="bulk";
      btn.textContent="Bulk Upload / Edit";

      const products=nav.querySelector('[data-view="products"]');
      const shop=nav.querySelector('[data-view="shop-editor"]');
      if(shop) nav.insertBefore(btn,shop);
      else if(products?.nextSibling) nav.insertBefore(btn,products.nextSibling);
      else nav.appendChild(btn);

      bindNavButton(btn,nav);
      return btn;
    };

    const btn=ensure();
    bindNavButton(btn,nav);

    const mo=new MutationObserver(()=>{
      const b=ensure();
      bindNavButton(b,nav);
    });
    mo.observe(nav,{childList:true});
  }

  function bindNavButton(btn,nav){
    if(!btn || btn.dataset.bulkPlusBound==="1") return;
    btn.dataset.bulkPlusBound="1";
    btn.addEventListener("click",()=>{
      nav.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("is-active",x===btn));
      if(typeof switchView==="function") switchView("bulk");
      else document.querySelectorAll(".admin-view").forEach(x=>x.classList.toggle("is-active",x.dataset.viewPanel==="bulk"));
      setTimeout(()=>enhanceBulkView($("#view-bulk")),0);
    });
  }

  function enhanceBulkView(view){
    if(!view || enhancing) return;
    enhancing=true;
    try{
      const h1=$("h1",view);
      if(h1) h1.textContent="Bulk Upload / Edit";

      const kicker=$(".admin-kicker",view);
      if(kicker) kicker.textContent="Catalog Workspace";

      const intro=$(".bulk-intro",view);
      if(intro && !intro.dataset.bulkPlusCopy){
        intro.dataset.bulkPlusCopy="1";
        const p=$("p",intro);
        if(p) p.textContent="Build a batch manually or drop product photos to create multiple products at once.";
      }

      const zone=$("#bulk-upload-zone",view);
      if(zone && !$("#bulk-plus-workflow",view)){
        zone.insertAdjacentHTML("beforebegin",`
          <section class="bulk-plus-workflow" id="bulk-plus-workflow">
            <div class="bulk-plus-workflow-copy">
              <p class="admin-kicker">Start a Batch</p>
              <h2>Add products your way.</h2>
              <p>Create a blank item and fill it in, or choose/drop product photos and let the filename grouping build the products for you.</p>
            </div>
            <div class="bulk-plus-workflow-actions">
              <button class="bulk-plus-primary" id="bulk-plus-add-product" type="button">+ ADD BLANK PRODUCT</button>
              <button class="bulk-plus-secondary" id="bulk-plus-choose-images" type="button">CHOOSE PRODUCT PHOTOS</button>
            </div>
            <div class="bulk-plus-steps">
              <span><b>01</b> Add items</span>
              <span><b>02</b> Attach / arrange images</span>
              <span><b>03</b> Apply shared defaults</span>
              <span><b>04</b> Upload ready products</span>
            </div>
          </section>
        `);

        $("#bulk-plus-add-product",view)?.addEventListener("click",addBlankProduct);
        $("#bulk-plus-choose-images",view)?.addEventListener("click",()=>$("#bulk-product-images",view)?.click());
      }

      enhanceCards(view);
    } finally {
      enhancing=false;
    }
  }

  function addBlankProduct(){
    if(typeof BULK_IS_UPLOADING!=="undefined" && BULK_IS_UPLOADING) return;

    BULK_PRODUCTS.push({
      id: typeof makeBulkId==="function" ? makeBulkId("product") : `product-${Date.now()}`,
      name: "",
      price: "",
      type: "Tops",
      status: "DRAFT",
      vendor: "Longevity Co.",
      description: "",
      collectionIds: typeof getDefaultBulkCollections==="function" ? getDefaultBulkCollections() : [],
      sizes: typeof makeDefaultSizes==="function" ? makeDefaultSizes() : [{name:"S",quantity:0},{name:"M",quantity:0},{name:"L",quantity:0},{name:"XL",quantity:0}],
      images: [],
      state: "editing",
      error: ""
    });

    if(typeof renderBulkProducts==="function") renderBulkProducts();
    if(typeof updateBulkSummary==="function") updateBulkSummary();

    requestAnimationFrame(()=>{
      enhanceCards($("#view-bulk"));
      const cards=$$(".bulk-product-card",$("#view-bulk"));
      const card=cards[cards.length-1];
      card?.scrollIntoView({behavior:"smooth",block:"center"});
      card?.querySelector('[data-bulk-field="name"]')?.focus();
    });
  }

  function enhanceCards(view){
    $$(".bulk-product-card",view).forEach(card=>{
      if(card.dataset.bulkPlusEnhanced==="1") return;
      card.dataset.bulkPlusEnhanced="1";

      const productId=card.dataset.bulkProductId;
      const product=BULK_PRODUCTS.find(p=>p.id===productId);
      if(!product) return;

      const images=$(".bulk-images-strip",card);
      if(images){
        const tools=document.createElement("div");
        tools.className="bulk-plus-card-image-tools";
        tools.innerHTML=`
          <input type="file" accept="image/*" multiple hidden data-bulk-plus-file-input>
          <button type="button" data-bulk-plus-add-images>+ ADD IMAGES TO THIS PRODUCT</button>
          <small>${product.images.length ? `${product.images.length} image${product.images.length===1?"":"s"} attached` : "No images attached yet"}</small>
        `;
        images.insertAdjacentElement("afterend",tools);

        const input=$("[data-bulk-plus-file-input]",tools);
        $("[data-bulk-plus-add-images]",tools)?.addEventListener("click",()=>input?.click());
        input?.addEventListener("change",e=>{
          attachImages(product,Array.from(e.target.files||[]));
          e.target.value="";
        });
      }

      const head=$(".bulk-card-head",card);
      if(head && !$(".bulk-plus-manual-label",head) && !String(product.name||"").trim()){
        head.insertAdjacentHTML("beforeend",`<span class="bulk-plus-manual-label">MANUAL ITEM</span>`);
      }
    });
  }

  function attachImages(product,files){
    const imageFiles=files.filter(file=>file.type?.startsWith("image/"));
    if(!imageFiles.length) return;

    const start=product.images.length;
    imageFiles.forEach((file,index)=>{
      product.images.push({
        id: typeof makeBulkId==="function" ? makeBulkId("image") : `image-${Date.now()}-${index}`,
        file,
        filename:file.name,
        url:URL.createObjectURL(file),
        order:null,
        inputIndex:start+index
      });
    });

    product.state="editing";
    product.error="";

    if(typeof renderBulkProducts==="function") renderBulkProducts();
    if(typeof updateBulkSummary==="function") updateBulkSummary();
    requestAnimationFrame(()=>enhanceCards($("#view-bulk")));
  }

  function observe(){
    const view=$("#view-bulk");
    if(!view) return;
    const mo=new MutationObserver(()=>enhanceBulkView(view));
    mo.observe(view,{childList:true,subtree:true});
  }
})();
