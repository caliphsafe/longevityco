
(() => {
  const value = section => document.querySelector(`[data-sort-section="${section}"]`)?.value || "";
  const stock = p => (p?.variants?.nodes || []).reduce((s,v)=>s+Number(v.inventoryQuantity||0),0);
  const price = p => Number(p?.variants?.nodes?.[0]?.price || 0);
  const alpha = (a,b) => String(a||"").localeCompare(String(b||""),undefined,{numeric:true,sensitivity:"base"});
  const created = p => {
    const time = new Date(p?.createdAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  };

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

    const statusOption = select.querySelector('option[value="status-asc"]');

    const newest = document.createElement("option");
    newest.value = "date-desc";
    newest.textContent = "Newest Added";

    const oldest = document.createElement("option");
    oldest.value = "date-asc";
    oldest.textContent = "Oldest Added";

    if (statusOption) {
      select.insertBefore(newest, statusOption);
      select.insertBefore(oldest, statusOption);
    } else {
      select.appendChild(newest);
      select.appendChild(oldest);
    }
  }

  document.addEventListener("DOMContentLoaded",()=>{
    addProductDateOptions();

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
