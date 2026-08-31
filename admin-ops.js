
(() => {
  const STATE={orders:[],merch:[],dashboard:null};
  const $=id=>document.getElementById(id);
  const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const cash=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n||0));
  const dt=v=>v?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(v)):"—";
  const qty=o=>(o?.lineItems?.nodes||[]).reduce((s,i)=>s+Number(i.quantity||0),0);
  const total=o=>Number(o?.totalPriceSet?.shopMoney?.amount||0);
  const customer=o=>[o?.customer?.firstName,o?.customer?.lastName].filter(Boolean).join(" ")||o?.email||"Guest";
  let installed=false;

  function ready(fn){
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn,{once:true});
    else fn();
  }

  ready(()=>{let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},60)});

  function install(){
    if(installed) return true;
    const nav=document.querySelector(".admin-sidebar nav");
    const main=document.querySelector(".admin-main");
    if(!nav||!main) return false;
    ensureViews(main);
    rebuildNav(nav);
    bindNav(nav);
    bindControls();
    installed=true;
    return true;
  }

  function ensureViews(main){
    if(!$("view-fulfillment")) main.insertAdjacentHTML("beforeend",`
      ${view("fulfillment","Operations","Fulfillment",`
        <div class="ops-toolbar"><input id="ops-fulfillment-search" type="search" placeholder="Search order or customer"><select id="ops-fulfillment-filter"><option value="OPEN">Needs action</option><option value="ALL">All orders</option></select><button class="ops-button secondary" id="ops-fulfillment-refresh">Refresh</button></div>
        <div class="ops-grid" id="ops-fulfillment-metrics"></div><div class="ops-panel"><div class="ops-panel-head"><div><h2>Shipping Queue</h2><p>Orders that still need fulfillment.</p></div></div><div class="ops-list" id="ops-fulfillment-list"></div></div>
      `)}
      ${view("uniform-editor","Merchandising","Uniform Editor",`
        <div class="ops-note">Assign products to Uniform without changing the public Shop category.</div>
        <div class="ops-toolbar"><input id="ops-uniform-search" type="search" placeholder="Search products"><select id="ops-uniform-filter"><option value="ALL">All products</option><option value="HEADWEAR">Headwear</option><option value="TOPS">Tops</option><option value="BOTTOMS">Bottoms</option><option value="OFF">Not in Uniform</option></select><button class="ops-button secondary" id="ops-uniform-refresh">Refresh</button></div><div id="ops-uniform-list"></div>
      `)}
      ${view("drops","Release Management","Drops",`
        <div class="ops-note">Organize products into named drops using Shopify product tags. This does not publish or unpublish products.</div>
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Assign Product to Drop</h2></div></div><div class="ops-form-grid"><label class="ops-field">Product<select id="ops-drop-product"></select></label><label class="ops-field">Drop Name<input id="ops-drop-name" placeholder="FALL 2026"></label><div class="ops-field ops-field-full"><button class="ops-button" id="ops-drop-assign">Assign to Drop</button></div></div><p class="admin-message" id="ops-drop-message"></p></div>
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Current Drops</h2></div><button class="ops-button secondary" id="ops-drop-refresh">Refresh</button></div><div id="ops-drop-groups"></div></div>
      `)}
      ${view("returns","Post Purchase","Returns",`
        <div class="ops-note">Review refunded and partially-refunded orders. This screen does not issue refunds or restock inventory.</div>
        <div class="ops-toolbar"><input id="ops-returns-search" type="search" placeholder="Search order or customer"><select id="ops-returns-filter"><option value="ALL">Refunded + partial</option><option value="REFUNDED">Refunded</option><option value="PARTIALLY_REFUNDED">Partially refunded</option></select><button class="ops-button secondary" id="ops-returns-refresh">Refresh</button></div><div class="ops-list" id="ops-returns-list"></div>
      `)}
      ${view("analytics","Performance","Analytics",`
        <div class="ops-panel-head"><div><p class="ops-kicker">Last 30 Days</p><h2>Store Performance</h2></div><button class="ops-button secondary" id="ops-analytics-refresh">Refresh</button></div>
        <div class="ops-grid" id="ops-analytics-metrics"></div><div class="ops-panel"><div class="ops-panel-head"><div><h2>Top Products</h2></div></div><div class="ops-bars" id="ops-analytics-products"></div></div>
      `)}
      ${view("settings","Administration","Settings",`
        <div class="ops-panel"><div class="ops-panel-head"><div><h2>Admin Preferences</h2><p>Stored only in this browser.</p></div></div><div class="ops-form-grid"><label class="ops-field">Default Landing<select id="ops-setting-landing"><option value="dashboard">Dashboard</option><option value="orders">Orders</option><option value="fulfillment">Fulfillment</option><option value="products">Products</option><option value="inventory">Inventory</option></select></label><label class="ops-field">Low Stock Reference<input id="ops-setting-low-stock" type="number" min="0" max="100" value="5"></label></div><div style="margin-top:12px"><button class="ops-button" id="ops-settings-save">Save Preferences</button></div><p class="admin-message" id="ops-settings-message"></p></div>
      `)}
    `);
  }

  function view(id,kicker,title,body){return `<section class="admin-view" id="view-${id}" data-view-panel="${id}"><div class="admin-page-head"><div><p class="admin-kicker">${kicker}</p><h1>${title}</h1></div></div>${body}</section>`}

  function rebuildNav(nav){
    const wanted=[["dashboard","Dashboard"],["orders","Orders"],["fulfillment","Fulfillment"],["products","Products"],["shop-editor","Shop Editor"],["uniform-editor","Uniform Editor"],["inventory","Inventory"],["drops","Drops"],["customers","Customers"],["discounts","Discounts"],["draft-orders","Draft Orders"],["returns","Returns"],["abandoned","Abandoned"],["analytics","Analytics"],["settings","Settings"]];
    const existing={};
    nav.querySelectorAll("[data-view]").forEach(b=>existing[b.dataset.view]=b);
    nav.innerHTML="";
    wanted.forEach(([v,l])=>{const b=existing[v]||document.createElement("button");b.type="button";b.className="admin-nav-link"+(v==="dashboard"?" is-active":"");b.dataset.view=v;b.textContent=l;nav.appendChild(b)});
  }

  function bindNav(nav){
    nav.querySelectorAll("[data-view]").forEach(b=>{
      b.onclick=()=>{
        nav.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("is-active",x===b));
        if(typeof switchView==="function") switchView(b.dataset.view);
        else document.querySelectorAll(".admin-view").forEach(x=>x.classList.toggle("is-active",x.dataset.viewPanel===b.dataset.view));
        if(b.dataset.view==="fulfillment") loadOrders().then(renderFulfillment).catch(showOpsError);
        if(b.dataset.view==="uniform-editor") loadMerch().then(renderUniform).catch(showOpsError);
        if(b.dataset.view==="drops") loadMerch().then(renderDrops).catch(showOpsError);
        if(b.dataset.view==="returns") loadOrders().then(renderReturns).catch(showOpsError);
        if(b.dataset.view==="analytics") loadAnalytics().catch(showOpsError);
        if(b.dataset.view==="shop-editor" && typeof window.loadShopEditor==="function") window.loadShopEditor();
      };
    });
  }

  function bindControls(){
    $("ops-fulfillment-search")?.addEventListener("input",renderFulfillment);
    $("ops-fulfillment-filter")?.addEventListener("change",renderFulfillment);
    $("ops-fulfillment-refresh")?.addEventListener("click",()=>loadOrders(true).then(renderFulfillment).catch(showOpsError));
    $("ops-uniform-search")?.addEventListener("input",renderUniform);
    $("ops-uniform-filter")?.addEventListener("change",renderUniform);
    $("ops-uniform-refresh")?.addEventListener("click",()=>loadMerch(true).then(renderUniform).catch(showOpsError));
    $("ops-drop-refresh")?.addEventListener("click",()=>loadMerch(true).then(renderDrops).catch(showOpsError));
    $("ops-drop-assign")?.addEventListener("click",assignDrop);
    $("ops-returns-search")?.addEventListener("input",renderReturns);
    $("ops-returns-filter")?.addEventListener("change",renderReturns);
    $("ops-returns-refresh")?.addEventListener("click",()=>loadOrders(true).then(renderReturns).catch(showOpsError));
    $("ops-analytics-refresh")?.addEventListener("click",()=>loadAnalytics(true).catch(showOpsError));
    $("ops-settings-save")?.addEventListener("click",saveSettings);
    loadSettings();
  }

  async function loadOrders(force=false){if(STATE.orders.length&&!force)return STATE.orders;const d=await apiJson("/api/admin-orders");STATE.orders=d.orders||[];return STATE.orders}
  async function loadMerch(force=false){if(STATE.merch.length&&!force)return STATE.merch;const d=await apiJson("/api/admin-merchandising");STATE.merch=d.products||[];return STATE.merch}

  function renderFulfillment(){
    const q=($("ops-fulfillment-search")?.value||"").toLowerCase(), f=$("ops-fulfillment-filter")?.value||"OPEN";
    const openAll=STATE.orders.filter(o=>String(o.displayFulfillmentStatus||"").toUpperCase()!=="FULFILLED");
    const rows=STATE.orders.filter(o=>{const hay=`${o.name||""} ${customer(o)} ${o.email||""}`.toLowerCase();const open=String(o.displayFulfillmentStatus||"").toUpperCase()!=="FULFILLED";return(!q||hay.includes(q))&&(f==="ALL"||open)});
    $("ops-fulfillment-metrics").innerHTML=metric("Needs Shipping",openAll.length)+metric("Units to Pack",openAll.reduce((s,o)=>s+qty(o),0))+metric("Queue Value",cash(openAll.reduce((s,o)=>s+total(o),0)))+metric("Oldest",openAll.length?dt([...openAll].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))[0].createdAt):"—");
    $("ops-fulfillment-list").innerHTML=rows.length?rows.map(o=>`<article class="ops-row"><div><strong>${esc(o.name)}</strong><small>${esc(customer(o))} · ${dt(o.createdAt)}</small></div><span>${esc(o.displayFulfillmentStatus||"—")}</span><span>${qty(o)} items</span><div class="ops-row-actions"><button class="ops-chip" data-go-orders>View Orders</button></div></article>`).join(""):`<div class="ops-empty">No orders in this queue.</div>`;
    $("ops-fulfillment-list")?.querySelectorAll("[data-go-orders]").forEach(b=>b.onclick=()=>document.querySelector('.admin-sidebar [data-view="orders"]')?.click());
  }
  function metric(a,b){return `<article class="ops-metric"><span>${esc(a)}</span><strong>${esc(b)}</strong></article>`}

  function uniformTag(p){return (p.tags||[]).map(String).find(t=>/^LC_UNIFORM:(HEADWEAR|TOPS|BOTTOMS)$/i.test(t))?.split(":")[1]?.toUpperCase()||"OFF"}
  function suggested(p){const s=`${p.productType||""} ${p.title||""}`.toLowerCase();if(/hat|cap|beanie|headwear/.test(s))return"HEADWEAR";if(/pants|short|jogger|bottom|trouser/.test(s))return"BOTTOMS";return"TOPS"}
  function renderUniform(){
    const q=($("ops-uniform-search")?.value||"").toLowerCase(),f=$("ops-uniform-filter")?.value||"ALL";
    const rows=STATE.merch.filter(p=>(!q||`${p.title} ${p.productType}`.toLowerCase().includes(q))&&(f==="ALL"||uniformTag(p)===f));
    $("ops-uniform-list").innerHTML=rows.length?rows.map(p=>{const active=uniformTag(p);return `<article class="ops-product-card"><img src="${esc(p.featuredImage?.url||"")}" alt=""><div><h3>${esc(p.title)}</h3><p>${esc(p.productType||"Uncategorized")} · Suggested: ${suggested(p)}</p></div><div class="ops-segment">${["HEADWEAR","TOPS","BOTTOMS","OFF"].map(v=>`<button class="${active===v?"is-active":""}" data-uniform-product="${esc(p.id)}" data-uniform-value="${v}">${v}</button>`).join("")}</div></article>`}).join(""):`<div class="ops-empty">No products found.</div>`;
    $("ops-uniform-list")?.querySelectorAll("[data-uniform-product]").forEach(b=>b.onclick=()=>setUniform(b.dataset.uniformProduct,b.dataset.uniformValue,b));
  }
  async function setUniform(productId,value,btn){btn.disabled=true;try{await apiJson("/api/admin-merchandising",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"uniform",productId,value})});await loadMerch(true);renderUniform()}catch(e){alert(e.message)}finally{btn.disabled=false}}

  function dropTags(p){return (p.tags||[]).filter(t=>String(t).toUpperCase().startsWith("LC_DROP:")).map(t=>String(t).slice(8))}
  function renderDrops(){
    if($("ops-drop-product")) $("ops-drop-product").innerHTML=STATE.merch.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join("");
    const groups={};STATE.merch.forEach(p=>dropTags(p).forEach(d=>(groups[d]??=[]).push(p)));
    const names=Object.keys(groups).sort();
    $("ops-drop-groups").innerHTML=names.length?names.map(n=>`<div class="ops-drop-group"><h3>${esc(n)}</h3><div class="ops-drop-products">${groups[n].map(p=>`<span>${esc(p.title)} <button class="ops-chip" data-clear-drop="${esc(n)}" data-drop-product="${esc(p.id)}">×</button></span>`).join("")}</div></div>`).join(""):`<div class="ops-empty">No drops assigned yet.</div>`;
    $("ops-drop-groups")?.querySelectorAll("[data-clear-drop]").forEach(b=>b.onclick=()=>clearDrop(b.dataset.dropProduct,b.dataset.clearDrop));
  }
  async function assignDrop(){const productId=$("ops-drop-product")?.value,dropName=($("ops-drop-name")?.value||"").trim();if(!productId||!dropName)return msg("ops-drop-message","Choose a product and enter a drop name.");try{await apiJson("/api/admin-merchandising",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"drop",productId,dropName})});$("ops-drop-name").value="";msg("ops-drop-message","Product assigned.");await loadMerch(true);renderDrops()}catch(e){msg("ops-drop-message",e.message)}}
  async function clearDrop(productId,dropName){try{await apiJson("/api/admin-merchandising",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"drop-remove",productId,dropName})});await loadMerch(true);renderDrops()}catch(e){alert(e.message)}}

  function renderReturns(){
    const q=($("ops-returns-search")?.value||"").toLowerCase(),f=$("ops-returns-filter")?.value||"ALL";
    const rows=STATE.orders.filter(o=>{const s=String(o.displayFinancialStatus||"").toUpperCase();const ok=s==="REFUNDED"||s==="PARTIALLY_REFUNDED";const hay=`${o.name||""} ${customer(o)} ${o.email||""}`.toLowerCase();return ok&&(!q||hay.includes(q))&&(f==="ALL"||s===f)});
    $("ops-returns-list").innerHTML=rows.length?rows.map(o=>`<article class="ops-row"><div><strong>${esc(o.name)}</strong><small>${esc(customer(o))} · ${dt(o.createdAt)}</small></div><span>${esc(o.displayFinancialStatus)}</span><span>${qty(o)} items</span><div class="ops-row-actions"><button class="ops-chip" data-go-orders>View Order</button></div></article>`).join(""):`<div class="ops-empty">No refunded orders found in the loaded order history.</div>`;
    $("ops-returns-list")?.querySelectorAll("[data-go-orders]").forEach(b=>b.onclick=()=>document.querySelector('.admin-sidebar [data-view="orders"]')?.click());
  }

  async function loadAnalytics(force=false){if(STATE.dashboard&&!force)return renderAnalytics();const [d]=await Promise.all([apiJson("/api/admin-dashboard?days=30"),loadOrders(force)]);STATE.dashboard=d;renderAnalytics()}
  function renderAnalytics(){const m=STATE.dashboard?.metrics||{};$("ops-analytics-metrics").innerHTML=metric("Revenue",cash(m.revenue||0))+metric("Orders",m.orders||0)+metric("Average Order",cash(m.averageOrder||0))+metric("Units Sold",m.unitsSold||0);const counts={};STATE.orders.forEach(o=>(o.lineItems?.nodes||[]).forEach(i=>counts[i.name]=(counts[i.name]||0)+Number(i.quantity||0)));const rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8),max=rows[0]?.[1]||1;$("ops-analytics-products").innerHTML=rows.length?rows.map(([name,n])=>`<div class="ops-bar"><span>${esc(name)}</span><div class="ops-bar-track"><div class="ops-bar-fill" style="width:${Math.max(3,(n/max)*100)}%"></div></div><strong>${n} units</strong></div>`).join(""):`<div class="ops-empty">No order product data available.</div>`}

  function loadSettings(){try{const s=JSON.parse(localStorage.getItem("longevity_admin_ops_settings")||"{}");if($("ops-setting-landing"))$("ops-setting-landing").value=s.landing||"dashboard";if($("ops-setting-low-stock"))$("ops-setting-low-stock").value=s.lowStock??5}catch{}}
  function saveSettings(){const s={landing:$("ops-setting-landing")?.value||"dashboard",lowStock:Number($("ops-setting-low-stock")?.value||5)};localStorage.setItem("longevity_admin_ops_settings",JSON.stringify(s));msg("ops-settings-message","Preferences saved on this device.")}
  function msg(id,t){if($(id))$(id).textContent=t}
  function showOpsError(e){console.error(e);alert(e?.message||"Unable to load this admin section.")}
})();
