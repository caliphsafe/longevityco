(() => {
  const value = section => document.querySelector(`[data-sort-section="${section}"]`)?.value || "";
  const stock = p => (p?.variants?.nodes || []).reduce((s,v)=>s+Number(v.inventoryQuantity||0),0);
  const price = p => Number(p?.variants?.nodes?.[0]?.price || 0);
  const created = p => {
    const time = new Date(p?.createdAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  };
  const alpha = (a,b) => String(a||"").localeCompare(String(b||""),undefined,{numeric:true,sensitivity:"base"});

  function sorted(section, products) {
    const mode=value(section);
    return [...products].sort((a,b)=>{
      if(mode==="title-desc") return alpha(b.title,a.title);
      if(mode==="price-desc") return price(b)-price(a);
      if(mode==="price-asc") return price(a)-price(b);
      if(mode==="stock-desc") return stock(b)-stock(a);
      if(mode==="stock-asc") return stock(a)-stock(b);
      if(mode==="date-desc") return created(b)-created(a);
      if(mode==="date-asc") return created(a)-created(b);
      if(mode==="status-asc") return alpha(a.status,b.status);
      if(mode==="variants-desc") return (b.variants?.nodes?.length||0)-(a.variants?.nodes?.length||0);
      if(mode==="variants-asc") return (a.variants?.nodes?.length||0)-(b.variants?.nodes?.length||0);
      return alpha(a.title,b.title);
    });
  }

  function addProductDateOptions() {
    const select = document.querySelector('[data-sort-section="products"]');
    if (!select || select.querySelector('option[value="date-desc"]')) return;
    const status = select.querySelector('option[value="status-asc"]');
    const newest = document.createElement("option"); newest.value="date-desc"; newest.textContent="Newest Added";
    const oldest = document.createElement("option"); oldest.value="date-asc"; oldest.textContent="Oldest Added";
    if(status){select.insertBefore(newest,status);select.insertBefore(oldest,status)}else{select.append(newest,oldest)}
  }

  function loadStyle(href) {
    if(document.querySelector(`link[href^="${href}"]`)) return;
    const link=document.createElement("link"); link.rel="stylesheet"; link.href=`${href}?v=3`; document.head.appendChild(link);
  }
  function loadScript(src) {
    if(document.querySelector(`script[src^="${src}"]`)) return;
    const script=document.createElement("script"); script.src=`${src}?v=3`; script.defer=true; document.head.appendChild(script);
  }
  function bootAddons(){
    loadScript("admin-bulk-edit-stability.js");
    loadScript("admin-select-visible.js");
    loadScript("admin-mobile-ux.js");
    loadStyle("admin-shop-editor.css");
    loadScript("admin-shop-editor.js");
    loadStyle("admin-ops.css");
    loadScript("admin-ops.js");
    loadStyle("admin-bulk-plus.css");
    loadScript("admin-bulk-plus.js");
  }

  function install(){
    addProductDateOptions();
    const wrapLegacy=(name,section)=>{
      const old=window[name];
      if(typeof old!=="function"||old.__sortWrapped)return;
      const wrapped=function(...args){
        const source=ADMIN_PRODUCTS;
        try{ADMIN_PRODUCTS=sorted(section,source);return old.apply(this,args)}
        finally{ADMIN_PRODUCTS=source}
      };
      wrapped.__sortWrapped=true;
      window[name]=wrapped;
    };
    wrapLegacy("renderProductList","products");
    wrapLegacy("renderInventory","inventory");
    wrapLegacy("renderArchive","archive");
    document.querySelector('[data-sort-section="products"]')?.addEventListener("change",()=>renderProductList());
    document.querySelector('[data-sort-section="inventory"]')?.addEventListener("change",()=>renderInventory());
    document.querySelector('[data-sort-section="archive"]')?.addEventListener("change",()=>renderArchive());
    bootAddons();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
