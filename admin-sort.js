
(() => {
  const value = section => document.querySelector(`[data-sort-section="${section}"]`)?.value || "";
  const stock = p => (p?.variants?.nodes || []).reduce((s,v)=>s+Number(v.inventoryQuantity||0),0);
  const price = p => Number(p?.variants?.nodes?.[0]?.price || 0);
  const alpha = (a,b) => String(a||"").localeCompare(String(b||""),undefined,{numeric:true,sensitivity:"base"});

  function sorted(section, products) {
    const mode=value(section);
    return [...products].sort((a,b)=>{
      if(mode==="title-desc") return alpha(b.title,a.title);
      if(mode==="price-desc") return price(b)-price(a);
      if(mode==="price-asc") return price(a)-price(b);
      if(mode==="stock-desc") return stock(b)-stock(a);
      if(mode==="stock-asc") return stock(a)-stock(b);
      if(mode==="status-asc") return alpha(a.status,b.status);
      if(mode==="variants-desc") return (b.variants?.nodes?.length||0)-(a.variants?.nodes?.length||0);
      if(mode==="variants-asc") return (a.variants?.nodes?.length||0)-(b.variants?.nodes?.length||0);
      return alpha(a.title,b.title);
    });
  }

  document.addEventListener("DOMContentLoaded",()=>{
    const wrapLegacy=(name,section)=>{
      const old=window[name];
      if(typeof old!=="function") return;
      window[name]=function(...args){
        const source=ADMIN_PRODUCTS;
        try { ADMIN_PRODUCTS=sorted(section,source); return old.apply(this,args); }
        finally { ADMIN_PRODUCTS=source; }
      };
    };
    wrapLegacy("renderProductList","products");
    wrapLegacy("renderInventory","inventory");
    wrapLegacy("renderArchive","archive");

    document.querySelector('[data-sort-section="products"]')?.addEventListener("change",()=>renderProductList());
    document.querySelector('[data-sort-section="inventory"]')?.addEventListener("change",()=>renderInventory());
    document.querySelector('[data-sort-section="archive"]')?.addEventListener("change",()=>renderArchive());
  });
})();
