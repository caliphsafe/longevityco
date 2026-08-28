(() => {
const LIMITS={headwear:1,tops:3,bottoms:2};
const state={headwear:{items:[],selections:[],none:false},tops:{items:[],selections:[]},bottoms:{items:[],selections:[]}};
const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function categoryOf(p){const r=`${p.productType||""} ${p.title||""}`.toLowerCase();if(/headwear|hat|cap|beanie/.test(r))return"headwear";if(/hoodie|sweatshirt|crewneck|t-shirt|t shirt|tee|shirt|top|sweater|longsleeve|long sleeve/.test(r))return"tops";if(/pants|pant|shorts|short|jogger|trouser|bottom/.test(r))return"bottoms";return""}
function normalize(p){const imgs=p.images?.nodes||[];const variants=(p.variants?.nodes||[]).map(v=>({id:v.id,title:v.title||"Default",availableForSale:v.availableForSale!==false,selectedOptions:v.selectedOptions||[],price:v.price||p.priceRange?.minVariantPrice||{amount:"0",currencyCode:"USD"}}));return{id:p.id,handle:p.handle,title:p.title,image:p.featuredImage?.url||imgs[0]?.url||"",productType:p.productType||"",variants}}
function label(v){const s=(v?.selectedOptions||[]).find(o=>String(o.name).toLowerCase()==="size");return s?.value||(v?.title&&v.title!=="Default Title"?v.title:"One Size")}
function first(p){return p?.variants?.find(v=>v.availableForSale)||p?.variants?.[0]||null}
function make(cat,idx=0){const a=state[cat].items;if(!a.length)return null;idx=((idx%a.length)+a.length)%a.length;const v=first(a[idx]);return{uid:`${cat}-${Date.now()}-${Math.random()}`,productIndex:idx,variantId:v?.id||""}}
function product(cat,s){return state[cat].items[s.productIndex]||null}
function variant(cat,s){const p=product(cat,s);return p?.variants?.find(v=>v.id===s.variantId)||first(p)}
function ensure(){["headwear","tops","bottoms"].forEach(c=>{if(state[c].items.length&&!state[c].selections.length){const s=make(c);if(s)state[c].selections=[s]}})}
function move(cat,i,d){const s=state[cat].selections[i];if(!s)return;const a=state[cat].items;s.productIndex=(s.productIndex+d+a.length)%a.length;s.variantId=first(product(cat,s))?.id||"";render(cat);summary()}
function setVar(cat,i,id){state[cat].selections[i].variantId=id;render(cat);summary()}
function add(cat){const b=state[cat];if(b.selections.length>=LIMITS[cat]||!b.items.length)return;const idx=b.items.length>1?((b.selections.at(-1)?.productIndex||0)+1)%b.items.length:0;const s=make(cat,idx);if(s)b.selections.push(s);render(cat);summary()}
function remove(cat,i){if(i<=0&&state[cat].selections.length===1)return;state[cat].selections.splice(i,1);render(cat);summary()}
function sizes(cat,i,p,s){if(!p?.variants?.length)return"";return `<div class="uniform-size-row">${p.variants.map(v=>`<button class="uniform-size-chip ${v.id===variant(cat,s)?.id?"is-selected":""}" data-var="${esc(v.id)}" data-cat="${cat}" data-i="${i}" ${v.availableForSale?"":"disabled"}>${esc(label(v))}</button>`).join("")}</div>`}
function card(cat,s,i){const p=product(cat,s);if(!p)return"";return `<div class="uniform-choice-card"><div class="uniform-choice-stage">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.title)}">`:""}</div><div class="uniform-choice-info"><strong>${esc(p.title)}</strong></div><div class="uniform-choice-controls">${sizes(cat,i,p,s)}${i>0?`<button class="uniform-remove-layer" data-remove="${i}">REMOVE</button>`:""}</div></div>`}
function render(cat){
 const w=document.getElementById(`uniform-${cat}-list`);if(!w)return;
 if(cat==="headwear"&&state.headwear.none)w.innerHTML=`<div class="uniform-none-state"><div><strong>HEADWEAR OFF</strong><span>Top + bottom look</span></div></div>`;
 else w.innerHTML=`<div class="uniform-choice">${state[cat].selections.map((s,i)=>card(cat,s,i)).join("")}</div>`;
 w.querySelectorAll("[data-var]").forEach(b=>b.onclick=()=>setVar(b.dataset.cat,+b.dataset.i,b.dataset.var));
 w.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>remove(cat,+b.dataset.remove));
 const ab=document.querySelector(`[data-add-layer="${cat}"]`);if(ab)ab.disabled=state[cat].selections.length>=LIMITS[cat]||!state[cat].items.length;
}
function picks(){const r=[];["headwear","tops","bottoms"].forEach(c=>{if(c==="headwear"&&state.headwear.none)return;state[c].selections.forEach(s=>{const p=product(c,s),v=variant(c,s);if(p&&v)r.push({category:c,product:p,variant:v})})});return r}
function summary(){const p=picks(),txt=`${p.length} item${p.length===1?"":"s"} selected`;document.getElementById("uniform-item-count").textContent=txt;document.getElementById("uniform-mobile-count").textContent=txt;const bad=!p.length||p.some(x=>!x.variant?.id||x.variant.availableForSale===false);document.getElementById("uniform-add-all").disabled=bad;document.getElementById("uniform-mobile-add").disabled=bad}
function toggleNone(){state.headwear.none=!state.headwear.none;const b=document.getElementById("uniform-headwear-none");b.classList.toggle("is-active",state.headwear.none);b.setAttribute("aria-pressed",String(state.headwear.none));render("headwear");summary()}
function random(){state.headwear.none=false;const n=document.getElementById("uniform-headwear-none");n.classList.remove("is-active");n.setAttribute("aria-pressed","false");["headwear","tops","bottoms"].forEach(c=>{const a=state[c].items;if(!a.length)return;const idx=Math.floor(Math.random()*a.length),s=make(c,idx);if(s){const av=a[idx].variants.filter(v=>v.availableForSale);s.variantId=(av[Math.floor(Math.random()*av.length)]||a[idx].variants[0])?.id||"";state[c].selections=[s]}});["headwear","tops","bottoms"].forEach(render);summary()}
function lines(){const m=new Map;picks().forEach(x=>m.set(x.variant.id,(m.get(x.variant.id)||0)+1));return Array.from(m,([merchandiseId,quantity])=>({merchandiseId,quantity}))}
async function buy(){
 const ps=picks();if(!ps.length)return;const buttons=[document.getElementById("uniform-add-all"),document.getElementById("uniform-mobile-add")];buttons.forEach(b=>b.disabled=true);const msg=document.getElementById("uniform-cart-message");
 try{if(typeof ensureShopifyCart!=="function"||typeof apiPostJson!=="function")throw new Error("Cart unavailable");const cart=await ensureShopifyCart();const res=await apiPostJson("/api/shopify-cart-lines-add",{cartId:cart.id,lines:lines()});const updated=res?.cart;if(updated?.id&&typeof setShopifyCartId==="function")setShopifyCartId(updated.id);if(typeof updateCartCountUI==="function")updateCartCountUI(updated?.totalQuantity||0);if(typeof renderCartPanel==="function")renderCartPanel(updated);if(typeof openPanel==="function")openPanel("cart-panel");msg.textContent="LOOK ADDED TO CART";}catch(e){console.error(e);msg.textContent="Unable to add look. Please try again."}finally{summary()}
}
function bind(){
 document.querySelectorAll("[data-slot-prev]").forEach(b=>b.onclick=()=>move(b.dataset.slotPrev,0,-1));
 document.querySelectorAll("[data-slot-next]").forEach(b=>b.onclick=()=>move(b.dataset.slotNext,0,1));
 document.querySelectorAll("[data-add-layer]").forEach(b=>b.onclick=()=>add(b.dataset.addLayer));
 document.getElementById("uniform-headwear-none").onclick=toggleNone;
 document.getElementById("uniform-pick-for-me").onclick=random;
 document.getElementById("uniform-add-all").onclick=buy;document.getElementById("uniform-mobile-add").onclick=buy;
}
async function boot(){bind();try{const r=await fetch("/api/shopify-products?collection=shop-all");if(!r.ok)throw new Error("Products unavailable");const d=await r.json();(d.products||d||[]).map(normalize).forEach(p=>{const c=categoryOf(p);if(c)state[c].items.push(p)});ensure();["headwear","tops","bottoms"].forEach(render);summary()}catch(e){console.error(e);document.getElementById("uniform-canvas").innerHTML='<div class="uniform-none-state"><strong>UNABLE TO LOAD LOOK STUDIO</strong></div>'}}
document.addEventListener("DOMContentLoaded",boot);
})();