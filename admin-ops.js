
(() => {
  const STATE={orders:[],products:[],merch:[],dashboard:null};
  const $=id=>document.getElementById(id);
  const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const cash=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n||0));
  const dt=v=>v?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(v)):"—";
  const qty=o=>(o?.lineItems?.nodes||[]).reduce((s,i)=>s+Number(i.quantity||0),0);
  const total=o=>Number(o?.totalPriceSet?.shopMoney?.amount||0);
  const customer=o=>[o?.customer?.firstName,o?.customer?.lastName].filter(Boolean).join(" ")||o?.email||"Guest";

  document.addEventListener("DOMContentLoaded",()=>setTimeout(init,90));

  function init(){
    const nav=document.querySelector(".admin-sidebar nav");
    const main=document.querySelector(".admin-main");
    if(!nav||!main||$("view-fulfillment")) return;
    injectViews(main);
    rebuildNav(nav);
    bind();
  }

  function rebuildNav(nav){
    const wanted=[
      ["dashboard","Dashboard"],["orders","Orders"],["fulfillment","Fulfillment"],["products","Products"],
      ["shop-editor","Shop Editor"],["uniform-editor","Uniform Editor"],["inventory","Inventory"],["drops","Drops"],
      ["customers","Customers"],["discounts","Discounts"],["draft-orders","Draft Orders"],["returns","Returns"],
      ["abandoned","Abandoned"],["analytics","Analytics"],["settings","Settings"]
    ];
    const existing={};
    nav.querySelectorAll("[data-view]").forEach(b=>existing[b.dataset.view]=b);
    nav.querySelectorAll("[data-shop-editor-nav]").forEach(b=>existing["shop-editor"]=b);
    nav.innerHTML="";
    wanted.forEach(([view,label])=>{
      let b=existing[view]||document.createElement("button");
      b.type="button";
      b.className="admin-nav-link"+(view==="dashboard"?" is-active":"");
      b.dataset.view=view;
      b.textContent=label;
      nav.appendChild(b);
    });
  }

  function injectViews(main){
    main.insertAdjacentHTML("beforeend",`
      ${view("fulfillment","Operations","Fulfillment",`
        <div class="ops-toolbar"><input id="ops-fulfillment-search" type="search" placeholder="Search order or customer"><select id="ops-fulfillment-filter"><option value="OPEN">Needs action</option><option value="ALL">All orders</option></select><button class="ops-button secondary" id="ops-fulfillment-refresh">Refresh</button></div>
        <div class="ops-grid" id="ops-fulfillment-metrics"></div><div class="ops-panel"><div class="ops-panel-head"><div><h2>Shipping Queue</h2><p>Orders that still need fulfillment.</p></div></div><div class="ops-list" id="ops-fulfillment-list"></div></div>
      `)}
      ${view("uniform-editor","Merchandising","Uniform Editor",`
        <div class="ops-note">Assign products to the Uniform builder without changing their Shop category. Headwear, Tops and Bottoms are stored as Longevity product tags.</div>
        <div class="ops-toolbar"><input id="ops-uniform-search" type="search" placeholder="Search products"><select id="ops-uniform-filter"><option value="ALL">All products</option><option value="HEADWEAR">Headwear</option><option value="TOPS">Tops</option><option value="BOTTOMS">Bottoms</option><option value="OFF">Not in Uniform</option></select><button class="ops-button secondary" id="ops-uniform-refresh">Refresh</button></div>
        <div id="ops-uniform-list"></div>
      `)}
      ${view("drops","Release Management","Drops",`
        <div class="ops-note">Organize products into named drops using product tags. This does not publish, unpublish or change product inventory.</div>
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Assign Product to Drop</h2><p>Create a drop simply by assigning the first product to a new name.</p></div></div>
        <div class="ops-form-grid"><label class="ops-field">Product<select id="ops-drop-product"></select></label><label class="ops-field">Drop Name<input id="ops-drop-name" placeholder="FALL 2026"></label><div class="ops-field ops-field-full"><button class="ops-button" id="ops-drop-assign">Assign to Drop</button></div></div><p class="admin-message" id="ops-drop-message"></p></div>
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Current Drops</h2></div><button class="ops-button secondary" id="ops-drop-refresh">Refresh</button></div><div id="ops-drop-groups"></div></div>
      `)}
      ${view("returns","Post Purchase","Returns",`
        <div class="ops-note">This first Returns workspace is intentionally non-destructive. It surfaces refunded and partially-refunded orders using the order access already connected. No refund or restock action is performed from this screen yet.</div>
        <div class="ops-toolbar"><input id="ops-returns-search" type="search" placeholder="Search order or customer"><select id="ops-returns-filter"><option value="ALL">Refunded + partial</option><option value="REFUNDED">Refunded</option><option value="PARTIALLY_REFUNDED">Partially refunded</option></select><button class="ops-button secondary" id="ops-returns-refresh">Refresh</button></div><div class="ops-list" id="ops-returns-list"></div>
      `)}
      ${view("analytics","Performance","Analytics",`
        <div class="ops-panel-head"><div><p class="ops-kicker">Last 30 Days</p><h2>Store Performance</h2></div><button class="ops-button secondary" id="ops-analytics-refresh">Refresh</button></div>
        <div class="ops-grid" id="ops-analytics-metrics"></div>
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Top Products</h2><p>Units sold from the orders currently returned by Shopify.</p></div></div><div class="ops-bars" id="ops-analytics-products"></div></div>
      `)}
      ${view("settings","Administration","Settings",`
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Admin Preferences</h2><p>These preferences are stored only in this browser and do not alter Shopify.</p></div></div>
        <div class="ops-form-grid"><label class="ops-field">Default Landing<select id="ops-setting-landing"><option value="dashboard">Dashboard</option><option value="orders">Orders</option><option value="fulfillment">Fulfillment</option><option value="products">Products</option><option value="inventory">Inventory</option></select></label><label class="ops-field">Low Stock Reference<input id="ops-setting-low-stock" type="number" min="0" max="100" value="5"></label></div>
        <div style="margin-top:12px"><button class="ops-button" id="ops-settings-save">Save Preferences</button></div><p class="admin-message" id="ops-settings-message"></p></div>
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Expansion Status</h2></div></div><div class="ops-note">This admin expansion is modular. The original admin remains underneath it. Restoring the previous admin-sort.js disables this expansion without touching Shopify data.</div></div>
      `)}
    `);
  }

  function view(id,kicker,title,body){
    return `<section class="admin-view" id="view-${id}" data-view-panel="${id}"><div class="admin-page-head"><div><p class="admin-kicker">${kicker}</p><h1>${title}</h1></div></div>${body}</section>`;
  }

  function bind(){
    document.querySelectorAll(".admin-sidebar [data-view]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.view,b)));
    $("ops-fulfillment-search")?.addEventListener("input",renderFulfillment);
    $("ops-fulfillment-filter")?.addEventListener("change",renderFulfillment);
    $("ops-fulfillment-refresh")?.addEventListener("click",()=>loadOrders(true).then(renderFulfillment));
    $("ops-uniform-search")?.addEventListener("input",renderUniform);
    $("ops-uniform-filter")?.addEventListener("change",renderUniform);
    $("ops-uniform-refresh")?.addEventListener("click",()=>loadMerch(true).then(renderUniform));
    $("ops-drop-refresh")?.addEventListener("click",()=>loadMerch(true).then(renderDrops));
    $("ops-drop-assign")?.addEventListener("click",assignDrop);
    $("ops-returns-search")?.addEventListener("input",renderReturns);
    $("ops-returns-filter")?.addEventListener("change",renderReturns);
    $("ops-returns-refresh")?.addEventListener("click",()=>loadOrders(true).then(renderReturns));
    $("ops-analytics-refresh")?.addEventListener("click",()=>loadAnalytics(true));
    $("ops-settings-save")?.addEventListener("click",saveSettings);
    loadSettings();
  }

  function go(v,b){
    document.querySelectorAll(".admin-nav-link").forEach(x=>x.classList.toggle("is-active",x===b));
    if(typeof window.switchView==="function") window.switchView(v);
    else{
      document.querySelectorAll(".admin-view").forEach(x=>x.classList.toggle("is-active",x.dataset.viewPanel===v));
    }
    if(v==="fulfillment") loadOrders().then(renderFulfillment);
    if(v==="uniform-editor") loadMerch().then(renderUniform);
    if(v==="drops") loadMerch().then(renderDrops);
    if(v==="returns") loadOrders().then(renderReturns);
    if(v==="analytics") loadAnalytics();
  }

  async function loadOrders(force=false){
    if(STATE.orders.length&&!force)return STATE.orders;
    const d=await apiJson("/api/admin-orders");
    STATE.orders=d.orders||[];
    return STATE.orders;
  }

  async function loadMerch(force=false){
    if(STATE.merch.length&&!force)return STATE.merch;
    const d=await apiJson("/api/admin-merchandising");
    STATE.merch=d.products||[];
    return STATE.merch;
  }

  function renderFulfillment(){
    const q=($("ops-fulfillment-search")?.value||"").toLowerCase();
    const f=$("ops-fulfillment-filter")?.value||"OPEN";
    let rows=STATE.orders.filter(o=>{
      const hay=`${o.name||""} ${customer(o)} ${o.email||""}`.toLowerCase();
      const open=!["FULFILLED"].includes(String(o.displayFulfillmentStatus||"").toUpperCase());
      return (!q||hay.includes(q))&&(f==="ALL"||open);
    });
    const open=STATE.orders.filter(o=>String(o.displayFulfillmentStatus||"").toUpperCase()!=="FULFILLED");
    const units=open.reduce((s,o)=>s+qty(o),0);
    $("ops-fulfillment-metrics").innerHTML=metric("Needs Shipping",open.length)+metric("Units to Pack",units)+metric("Queue Value",cash(open.reduce((s,o)=>s+total(o),0)))+metric("Oldest",open.length?dt([...open].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))[0].createdAt):"—");
    $("ops-fulfillment-list").innerHTML=rows.length?rows.map(o=>`<article class="ops-row"><div><strong>${esc(o.name)}</strong><small>${esc(customer(o))} · ${dt(o.createdAt)}</small></div><span>${esc(o.displayFulfillmentStatus||"—")}</span><span>${qty(o)} items</span><div class="ops-row-actions"><button class="ops-chip" data-open-order>View Orders</button></div></article>`).join(""):`<div class="ops-empty">No orders in this queue.</div>`;
    $("ops-fulfillment-list").querySelectorAll("[data-open-order]").forEach(b=>b.onclick=()=>document.querySelector('.admin-sidebar [data-view="orders"]')?.click());
  }
  function metric(a,b){return `<article class="ops-metric"><span>${esc(a)}</span><strong>${esc(b)}</strong></article>`}

  function uniformTag(p){return (p.tags||[]).map(String).find(t=>/^LC_UNIFORM:(HEADWEAR|TOPS|BOTTOMS)$/i.test(t))?.split(":")[1]?.toUpperCase()||"OFF"}
  function suggested(p){let s=`${p.productType||""} ${p.title||""}`.toLowerCase();if(/hat|cap|beanie|headwear/.test(s))return"HEADWEAR";if(/pants|short|jogger|bottom|trouser/.test(s))return"BOTTOMS";return"TOPS"}
  function renderUniform(){
    const q=($("ops-uniform-search")?.value||"").toLowerCase();
    const f=$("ops-uniform-filter")?.value||"ALL";
    let rows=STATE.merch.filter(p=>(!q||`${p.title} ${p.productType}`.toLowerCase().includes(q))&&(f==="ALL"||uniformTag(p)===f));
    $("ops-uniform-list").innerHTML=rows.length?rows.map(p=>{
      const active=uniformTag(p),hint=suggested(p);
      return `<article class="ops-product-card"><img src="${esc(p.featuredImage?.url||"")}" alt=""><div><h3>${esc(p.title)}</h3><p>${esc(p.productType||"Uncategorized")} · Suggested: ${hint}</p></div><div class="ops-segment">${["HEADWEAR","TOPS","BOTTOMS","OFF"].map(v=>`<button class="${active===v?"is-active":""}" data-uniform-product="${esc(p.id)}" data-uniform-value="${v}">${v==="OFF"?"OFF":v}</button>`).join("")}</div></article>`
    }).join(""):`<div class="ops-empty">No products found.</div>`;
    $("ops-uniform-list").querySelectorAll("[data-uniform-product]").forEach(b=>b.onclick=()=>setUniform(b.dataset.uniformProduct,b.dataset.uniformValue,b));
  }
  async function setUniform(productId,value,btn){
    btn.disabled=true;
    try{await apiJson("/api/admin-merchandising",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"uniform",productId,value})});await loadMerch(true);renderUniform()}
    catch(e){alert(e.message)}finally{btn.disabled=false}
  }

  function dropTags(p){return (p.tags||[]).filter(t=>String(t).toUpperCase().startsWith("LC_DROP:")).map(t=>String(t).slice(8))}
  function renderDrops(){
    const sel=$("ops-drop-product"); if(sel)sel.innerHTML=STATE.merch.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join("");
    const groups={};
    STATE.merch.forEach(p=>dropTags(p).forEach(d=>(groups[d]??=[]).push(p)));
    const names=Object.keys(groups).sort();
    $("ops-drop-groups").innerHTML=names.length?names.map(n=>`<div class="ops-drop-group"><h3>${esc(n)}</h3><div class="ops-drop-products">${groups[n].map(p=>`<span>${esc(p.title)} <button class="ops-chip" data-clear-drop="${esc(n)}" data-drop-product="${esc(p.id)}">×</button></span>`).join("")}</div></div>`).join(""):`<div class="ops-empty">No drops assigned yet.</div>`;
    $("ops-drop-groups").querySelectorAll("[data-clear-drop]").forEach(b=>b.onclick=()=>clearDrop(b.dataset.dropProduct,b.dataset.clearDrop));
  }
  async function assignDrop(){
    const productId=$("ops-drop-product")?.value,dropName=($("ops-drop-name")?.value||"").trim();
    if(!productId||!dropName)return message("ops-drop-message","Choose a product and enter a drop name.");
    try{await apiJson("/api/admin-merchandising",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"drop",productId,dropName})});$("ops-drop-name").value="";message("ops-drop-message","Product assigned.");await loadMerch(true);renderDrops()}catch(e){message("ops-drop-message",e.message)}
  }
  async function clearDrop(productId,dropName){
    try{await apiJson("/api/admin-merchandising",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"drop-remove",productId,dropName})});await loadMerch(true);renderDrops()}catch(e){alert(e.message)}
  }

  function renderReturns(){
    const q=($("ops-returns-search")?.value||"").toLowerCase(),f=$("ops-returns-filter")?.value||"ALL";
    const rows=STATE.orders.filter(o=>{
      const s=String(o.displayFinancialStatus||"").toUpperCase();
      const isReturn=s==="REFUNDED"||s==="PARTIALLY_REFUNDED";
      const hay=`${o.name||""} ${customer(o)} ${o.email||""}`.toLowerCase();
      return isReturn&&(!q||hay.includes(q))&&(f==="ALL"||s===f);
    });
    $("ops-returns-list").innerHTML=rows.length?rows.map(o=>`<article class="ops-row"><div><strong>${esc(o.name)}</strong><small>${esc(customer(o))} · ${dt(o.createdAt)}</small></div><span>${esc(o.displayFinancialStatus)}</span><span>${qty(o)} items</span><div class="ops-row-actions"><button class="ops-chip" data-return-order>View Order</button></div></article>`).join(""):`<div class="ops-empty">No refunded orders found in the loaded order history.</div>`;
    $("ops-returns-list").querySelectorAll("[data-return-order]").forEach(b=>b.onclick=()=>document.querySelector('.admin-sidebar [data-view="orders"]')?.click());
  }

  async function loadAnalytics(force=false){
    if(STATE.dashboard&&!force)return renderAnalytics();
    try{
      const [d]=await Promise.all([apiJson("/api/admin-dashboard?days=30"),loadOrders(force)]);
      STATE.dashboard=d;renderAnalytics();
    }catch(e){$("ops-analytics-metrics").innerHTML=`<div class="ops-empty">${esc(e.message)}</div>`}
  }
  function renderAnalytics(){
    const m=STATE.dashboard?.metrics||{};
    $("ops-analytics-metrics").innerHTML=metric("Revenue",cash(m.revenue||0))+metric("Orders",m.orders||0)+metric("Average Order",cash(m.averageOrder||0))+metric("Units Sold",m.unitsSold||0);
    const counts={};
    STATE.orders.forEach(o=>(o.lineItems?.nodes||[]).forEach(i=>counts[i.name]=(counts[i.name]||0)+Number(i.quantity||0)));
    const rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8),max=rows[0]?.[1]||1;
    $("ops-analytics-products").innerHTML=rows.length?rows.map(([name,n])=>`<div class="ops-bar"><span>${esc(name)}</span><div class="ops-bar-track"><div class="ops-bar-fill" style="width:${Math.max(3,(n/max)*100)}%"></div></div><strong>${n} units</strong></div>`).join(""):`<div class="ops-empty">No order product data available.</div>`;
  }

  function loadSettings(){
    try{
      const s=JSON.parse(localStorage.getItem("longevity_admin_ops_settings")||"{}");
      if($("ops-setting-landing"))$("ops-setting-landing").value=s.landing||"dashboard";
      if($("ops-setting-low-stock"))$("ops-setting-low-stock").value=s.lowStock??5;
    }catch{}
  }
  function saveSettings(){
    const s={landing:$("ops-setting-landing").value,lowStock:Number($("ops-setting-low-stock").value||5)};
    localStorage.setItem("longevity_admin_ops_settings",JSON.stringify(s));message("ops-settings-message","Preferences saved on this device.");
  }
  function message(id,t){if($(id))$(id).textContent=t}
})();
