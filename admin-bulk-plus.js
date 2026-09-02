(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const PICKER_SELECTED = new Set();
  let installed = false;
  let enhancing = false;
  let validationPatched = false;
  let summaryPatched = false;

  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn,{once:true});
    else fn();
  }

  ready(()=>{
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(install() || tries>160) clearInterval(timer);
    },50);
  });

  function install(){
    if(installed) return true;
    const view=$("#view-bulk");
    const nav=$(".admin-sidebar nav");
    if(!view || !nav || typeof BULK_PRODUCTS==="undefined") return false;

    patchValidation();
    patchSummary();
    installNavigation(nav);
    enhanceBulkView(view);
    observe(view, nav);
    installed=true;
    return true;
  }

  function patchValidation(){
    if(validationPatched || typeof window.validateBulkProduct!=="function") return;
    const original=window.validateBulkProduct;
    window.validateBulkProduct=function(product){
      const result=original(product) || {ready:false,issues:[]};
      if(product?.isExisting){
        const issues=(result.issues||[]).filter(issue=>issue!=="Image required");
        return {ready:issues.length===0,issues};
      }
      return result;
    };
    validationPatched=true;
  }

  function patchSummary(){
    if(summaryPatched || typeof window.updateBulkSummary!=="function") return;
    const original=window.updateBulkSummary;
    window.updateBulkSummary=function(...args){
      const result=original.apply(this,args);
      refreshWorkspaceLabels();
      return result;
    };
    summaryPatched=true;
  }

  function installNavigation(nav){
    const ensure=()=>{
      let current=nav.querySelector('[data-view="bulk"]');
      if(!current){
        current=document.createElement("button");
        current.type="button";
        current.className="admin-nav-link";
        current.dataset.view="bulk";
        const products=nav.querySelector('[data-view="products"]');
        const shop=nav.querySelector('[data-view="shop-editor"]');
        if(shop) nav.insertBefore(current,shop);
        else if(products?.nextSibling) nav.insertBefore(current,products.nextSibling);
        else nav.appendChild(current);
      }
      current.textContent="Bulk Upload / Edit";
      bindNavButton(current,nav);
      return current;
    };
    ensure();
  }

  function bindNavButton(btn,nav){
    if(!btn || btn.dataset.bulkPlusBound==="1") return;
    btn.dataset.bulkPlusBound="1";
    btn.addEventListener("click",()=>{
      nav.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("is-active",x===btn));
      if(typeof switchView==="function") switchView("bulk");
      else document.querySelectorAll(".admin-view").forEach(x=>x.classList.toggle("is-active",x.dataset.viewPanel==="bulk"));
      setTimeout(()=>{
        enhanceBulkView($("#view-bulk"));
        renderExistingPicker();
      },0);
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
        if(p) p.textContent="Create new products from photos, build products manually, or bring existing Shopify items into one batch for editing.";
      }

      const zone=$("#bulk-upload-zone",view);
      if(zone && !$("#bulk-plus-workflow",view)){
        zone.insertAdjacentHTML("beforebegin",`
          <section class="bulk-plus-workflow" id="bulk-plus-workflow">
            <div class="bulk-plus-workflow-copy">
              <p class="admin-kicker">Start a Batch</p>
              <h2>New products and existing products, together.</h2>
              <p>Choose the fastest entry point. You can mix uploaded products, manually-created products, and existing Shopify products in the same workspace.</p>
            </div>
            <div class="bulk-plus-workflow-actions">
              <button class="bulk-plus-primary" id="bulk-plus-existing-products" type="button">+ ADD EXISTING PRODUCTS</button>
              <button class="bulk-plus-secondary" id="bulk-plus-add-product" type="button">+ ADD BLANK PRODUCT</button>
              <button class="bulk-plus-secondary" id="bulk-plus-choose-images" type="button">UPLOAD PRODUCT PHOTOS</button>
            </div>
            <div class="bulk-plus-steps">
              <span><b>01</b> Add items</span>
              <span><b>02</b> Review details</span>
              <span><b>03</b> Apply shared defaults</span>
              <span><b>04</b> Save the batch</span>
            </div>
          </section>

          <section class="bulk-plus-existing-picker" id="bulk-plus-existing-picker" hidden>
            <div class="bulk-plus-picker-head">
              <div>
                <p class="admin-kicker">Existing Shopify Products</p>
                <h2>Add products to this bulk workspace.</h2>
              </div>
              <button class="admin-text-btn" id="bulk-plus-close-picker" type="button">Close</button>
            </div>
            <div class="bulk-plus-picker-toolbar">
              <input id="bulk-plus-product-search" type="search" placeholder="Search product name or type">
              <select id="bulk-plus-product-status">
                <option value="ALL">All products</option>
                <option value="ACTIVE">Live</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div class="bulk-plus-picker-selection">
              <button type="button" id="bulk-plus-select-visible">Select visible</button>
              <button type="button" id="bulk-plus-clear-selection">Clear</button>
              <span id="bulk-plus-picker-count">0 selected</span>
            </div>
            <div class="bulk-plus-picker-list" id="bulk-plus-picker-list"></div>
            <div class="bulk-plus-picker-footer">
              <span id="bulk-plus-picker-help">Choose products to edit in this batch.</span>
              <button class="bulk-plus-primary" id="bulk-plus-add-selected" type="button" disabled>ADD SELECTED TO WORKSPACE</button>
            </div>
          </section>
        `);

        $("#bulk-plus-existing-products",view)?.addEventListener("click",()=>togglePicker(true));
        $("#bulk-plus-close-picker",view)?.addEventListener("click",()=>togglePicker(false));
        $("#bulk-plus-add-product",view)?.addEventListener("click",addBlankProduct);
        $("#bulk-plus-choose-images",view)?.addEventListener("click",()=>$("#bulk-product-images",view)?.click());
        $("#bulk-plus-product-search",view)?.addEventListener("input",renderExistingPicker);
        $("#bulk-plus-product-status",view)?.addEventListener("change",renderExistingPicker);
        $("#bulk-plus-select-visible",view)?.addEventListener("click",selectVisibleExisting);
        $("#bulk-plus-clear-selection",view)?.addEventListener("click",clearExistingSelection);
        $("#bulk-plus-add-selected",view)?.addEventListener("click",addSelectedExistingProducts);
      }

      enhanceCards(view);
      refreshWorkspaceLabels();
    } finally {
      enhancing=false;
    }
  }

  function togglePicker(open){
    const picker=$("#bulk-plus-existing-picker");
    if(!picker) return;
    picker.hidden=!open;
    if(open){
      renderExistingPicker();
      setTimeout(()=>$("#bulk-plus-product-search")?.focus(),0);
    }
  }

  function catalog(){
    try{return typeof ADMIN_PRODUCTS!=="undefined" ? (ADMIN_PRODUCTS||[]) : []}
    catch{return []}
  }

  function productPrice(product){
    return product?.variants?.nodes?.[0]?.price ?? "";
  }

  function variantSize(variant){
    if(typeof getVariantSize==="function") return getVariantSize(variant);
    const option=(variant?.selectedOptions||[]).find(o=>String(o.name).toLowerCase()==="size");
    return option?.value || variant?.title || "Default";
  }

  function existingImages(product){
    return (product?.media?.nodes||[])
      .filter(node=>node.mediaContentType==="IMAGE" && node.preview?.image?.url)
      .map((node,index)=>({
        id:node.id || `existing-${product.id}-${index}`,
        file:null,
        filename:"",
        url:node.preview.image.url,
        order:index+1,
        inputIndex:index,
        existing:true
      }));
  }

  function inventoryTotal(product){
    return (product?.variants?.nodes||[]).reduce((sum,v)=>sum+Math.max(0,Number(v.inventoryQuantity||0)),0);
  }

  function queuedProductIds(){
    return new Set((BULK_PRODUCTS||[]).map(p=>p.productId).filter(Boolean));
  }

  function filteredCatalog(){
    const q=($("#bulk-plus-product-search")?.value||"").trim().toLowerCase();
    const status=$("#bulk-plus-product-status")?.value||"ALL";
    const queued=queuedProductIds();
    return catalog().filter(product=>{
      const hay=`${product.title||""} ${product.productType||""} ${product.vendor||""}`.toLowerCase();
      const matchQ=!q || hay.includes(q);
      const matchStatus=status==="ALL" || String(product.status||"").toUpperCase()===status;
      return matchQ && matchStatus && !queued.has(product.id);
    });
  }

  function renderExistingPicker(){
    const list=$("#bulk-plus-picker-list");
    if(!list) return;
    const products=filteredCatalog();

    if(!catalog().length){
      list.innerHTML=`<div class="bulk-plus-picker-empty">Loading products…</div>`;
      updatePickerControls();
      return;
    }

    if(!products.length){
      list.innerHTML=`<div class="bulk-plus-picker-empty">No available products match this search, or matching products are already in the workspace.</div>`;
      updatePickerControls();
      return;
    }

    list.innerHTML=products.map(product=>{
      const checked=PICKER_SELECTED.has(product.id);
      const img=product.featuredImage?.url || product.media?.nodes?.find(n=>n.preview?.image?.url)?.preview?.image?.url || "";
      return `
        <label class="bulk-plus-picker-row ${checked?"is-selected":""}">
          <input type="checkbox" value="${escapeHtml(product.id)}" ${checked?"checked":""} data-bulk-plus-existing-check>
          <span class="bulk-plus-picker-image">${img?`<img src="${escapeHtml(img)}" alt="">`:"<i>NO IMAGE</i>"}</span>
          <span class="bulk-plus-picker-info">
            <strong>${escapeHtml(product.title||"Untitled Product")}</strong>
            <small>${escapeHtml(product.productType||"Uncategorized")} · ${escapeHtml(String(product.status||"—"))}</small>
          </span>
          <span class="bulk-plus-picker-meta">
            <b>${escapeHtml(formatMoney(productPrice(product)))}</b>
            <small>${inventoryTotal(product)} in stock</small>
          </span>
        </label>
      `;
    }).join("");

    $$("[data-bulk-plus-existing-check]",list).forEach(input=>{
      input.addEventListener("change",()=>{
        if(input.checked) PICKER_SELECTED.add(input.value);
        else PICKER_SELECTED.delete(input.value);
        input.closest(".bulk-plus-picker-row")?.classList.toggle("is-selected",input.checked);
        updatePickerControls();
      });
    });
    updatePickerControls();
  }

  function formatMoney(value){
    const n=Number(value||0);
    try{return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n)}
    catch{return `$${n.toFixed(2)}`}
  }

  function updatePickerControls(){
    const count=PICKER_SELECTED.size;
    const countEl=$("#bulk-plus-picker-count");
    const add=$("#bulk-plus-add-selected");
    if(countEl) countEl.textContent=`${count} selected`;
    if(add){
      add.disabled=count===0;
      add.textContent=count ? `ADD ${count} SELECTED TO WORKSPACE` : "ADD SELECTED TO WORKSPACE";
    }
  }

  function selectVisibleExisting(){
    filteredCatalog().forEach(p=>PICKER_SELECTED.add(p.id));
    renderExistingPicker();
  }

  function clearExistingSelection(){
    PICKER_SELECTED.clear();
    renderExistingPicker();
  }

  function toBulkProduct(product){
    const variants=product?.variants?.nodes||[];
    let sizes=variants.map(variant=>({
      name:variantSize(variant),
      quantity:Math.max(0,Number(variant.inventoryQuantity||0)),
      variantId:variant.id
    })).filter(size=>String(size.name||"").trim());

    if(!sizes.length) sizes=[{name:"Default",quantity:0,variantId:null}];

    return {
      id:typeof makeBulkId==="function" ? makeBulkId("existing") : `existing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      productId:product.id,
      isExisting:true,
      name:product.title||"",
      price:productPrice(product),
      type:product.productType||"Product",
      status:product.status==="ACTIVE" ? "ACTIVE" : "DRAFT",
      vendor:product.vendor||"Longevity Co.",
      description:typeof stripHtml==="function" ? stripHtml(product.descriptionHtml||"") : String(product.descriptionHtml||"").replace(/<[^>]*>/g,""),
      collectionIds:(product.collections?.nodes||[]).map(collection=>collection.id),
      sizes,
      images:existingImages(product),
      state:"editing",
      error:""
    };
  }

  function addSelectedExistingProducts(){
    if(typeof BULK_IS_UPLOADING!=="undefined" && BULK_IS_UPLOADING) return;
    const queued=queuedProductIds();
    const products=catalog().filter(product=>PICKER_SELECTED.has(product.id) && !queued.has(product.id));
    if(!products.length) return;

    products.forEach(product=>BULK_PRODUCTS.push(toBulkProduct(product)));
    PICKER_SELECTED.clear();

    forceBulkRender();
    togglePicker(false);

    requestAnimationFrame(()=>{
      enhanceCards($("#view-bulk"));
      const cards=$$(".bulk-product-card",$("#view-bulk"));
      const firstAdded=cards[Math.max(0,cards.length-products.length)];
      firstAdded?.scrollIntoView({behavior:"smooth",block:"center"});
    });
  }

  function addBlankProduct(){
    if(typeof BULK_IS_UPLOADING!=="undefined" && BULK_IS_UPLOADING) return;

    BULK_PRODUCTS.push({
      id:typeof makeBulkId==="function" ? makeBulkId("product") : `product-${Date.now()}`,
      name:"",
      price:"",
      type:"Tops",
      status:"DRAFT",
      vendor:"Longevity Co.",
      description:"",
      collectionIds:typeof getDefaultBulkCollections==="function" ? getDefaultBulkCollections() : [],
      sizes:typeof makeDefaultSizes==="function" ? makeDefaultSizes() : [{name:"S",quantity:0},{name:"M",quantity:0},{name:"L",quantity:0},{name:"XL",quantity:0}],
      images:[],
      state:"editing",
      error:""
    });

    forceBulkRender();
    requestAnimationFrame(()=>{
      enhanceCards($("#view-bulk"));
      const cards=$$(".bulk-product-card",$("#view-bulk"));
      const card=cards[cards.length-1];
      card?.scrollIntoView({behavior:"smooth",block:"center"});
      card?.querySelector('[data-bulk-field="name"]')?.focus();
    });
  }

  function forceBulkRender(){
    if(typeof renderBulkProducts==="function"){
      // The stability wrapper keys off state. New items change the signature,
      // so a normal render is safe and avoids the old render loop.
      renderBulkProducts();
    }
    if(typeof updateBulkSummary==="function") updateBulkSummary();
    renderExistingPicker();
  }

  function enhanceCards(view){
    $$(".bulk-product-card",view).forEach(card=>{
      if(card.dataset.bulkPlusEnhanced==="1") return;
      card.dataset.bulkPlusEnhanced="1";

      const productId=card.dataset.bulkProductId;
      const product=BULK_PRODUCTS.find(p=>p.id===productId);
      if(!product) return;

      const head=$(".bulk-card-head",card);
      if(head && !$(".bulk-plus-source-label",head)){
        head.insertAdjacentHTML("beforeend",`<span class="bulk-plus-source-label ${product.isExisting?"is-existing":"is-new"}">${product.isExisting?"EXISTING SHOPIFY PRODUCT":"NEW PRODUCT"}</span>`);
      }

      const images=$(".bulk-images-strip",card);
      if(images && !$(".bulk-plus-card-image-tools",card)){
        const tools=document.createElement("div");
        tools.className="bulk-plus-card-image-tools";

        if(product.isExisting){
          tools.innerHTML=`
            <span class="bulk-plus-existing-media-note">Existing Shopify images are preserved with this product.</span>
            <small>${product.images.length ? `${product.images.length} image${product.images.length===1?"":"s"} currently attached` : "No product image currently attached"}</small>
          `;
        } else {
          tools.innerHTML=`
            <input type="file" accept="image/*" multiple hidden data-bulk-plus-file-input>
            <button type="button" data-bulk-plus-add-images>+ ADD IMAGES TO THIS PRODUCT</button>
            <small>${product.images.length ? `${product.images.length} image${product.images.length===1?"":"s"} attached` : "No images attached yet"}</small>
          `;
          const input=$("[data-bulk-plus-file-input]",tools);
          $("[data-bulk-plus-add-images]",tools)?.addEventListener("click",()=>input?.click());
          input?.addEventListener("change",e=>{
            attachImages(product,Array.from(e.target.files||[]));
            e.target.value="";
          });
        }
        images.insertAdjacentElement("afterend",tools);
      }

      if(product.isExisting){
        const duplicate=$("[data-duplicate-product]",card);
        if(duplicate){
          duplicate.disabled=true;
          duplicate.title="Existing Shopify products are edited in place. Use Add Blank Product to create a separate new item.";
          duplicate.textContent="Editing Existing Product";
        }
      }
    });
  }

  function attachImages(product,files){
    if(product?.isExisting) return;
    const imageFiles=files.filter(file=>file.type?.startsWith("image/"));
    if(!imageFiles.length) return;

    const start=product.images.length;
    imageFiles.forEach((file,index)=>{
      product.images.push({
        id:typeof makeBulkId==="function" ? makeBulkId("image") : `image-${Date.now()}-${index}`,
        file,
        filename:file.name,
        url:URL.createObjectURL(file),
        order:null,
        inputIndex:start+index
      });
    });

    product.state="editing";
    product.error="";
    forceBulkRender();
    requestAnimationFrame(()=>enhanceCards($("#view-bulk")));
  }

  function refreshWorkspaceLabels(){
    const ready=(BULK_PRODUCTS||[]).filter(p=>{
      try{return validateBulkProduct(p).ready && p.state!=="success"}catch{return false}
    }).length;
    const existing=(BULK_PRODUCTS||[]).filter(p=>p.isExisting).length;
    const fresh=(BULK_PRODUCTS||[]).filter(p=>!p.isExisting).length;

    const button=$("#bulk-publish-btn");
    if(button && !BULK_IS_UPLOADING){
      button.textContent=ready ? `SAVE ${ready} READY ITEM${ready===1?"":"S"}` : "SAVE READY ITEMS";
    }

    const label=$("#bulk-publish-label");
    if(label && BULK_PRODUCTS?.length){
      label.textContent=`${ready} item${ready===1?"":"s"} ready to save`;
    }

    const detail=$("#bulk-publish-detail");
    if(detail && BULK_PRODUCTS?.length){
      detail.textContent=`Workspace: ${fresh} new · ${existing} existing Shopify product${existing===1?"":"s"}.`;
    }
  }

  function observe(view,nav){
    const viewObserver=new MutationObserver(()=>{
      enhanceBulkView(view);
      refreshWorkspaceLabels();
    });
    viewObserver.observe(view,{childList:true,subtree:true});

    const navObserver=new MutationObserver(()=>{
      installNavigation(nav);
    });
    navObserver.observe(nav,{childList:true});

    // Products can refresh after login, status changes, edits, and saves.
    let lastCount=-1;
    setInterval(()=>{
      const count=catalog().length;
      if(count!==lastCount){
        lastCount=count;
        if(!$("#bulk-plus-existing-picker")?.hidden) renderExistingPicker();
      }
    },800);
  }
})();
