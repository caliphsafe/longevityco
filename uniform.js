(() => {
const LIMITS={headwear:1,tops:1,bottoms:1},state={headwear:{items:[],selections:[],none:false},tops:{items:[],selections:[]},bottoms:{items:[],selections:[]}};
const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function cat(p){let r=`${p.productType||""} ${p.title||""}`.toLowerCase();if(/headwear|hat|cap|beanie/.test(r))return"headwear";if(/hoodie|sweatshirt|crewneck|t-shirt|t shirt|tee|shirt|top|sweater|longsleeve|long sleeve/.test(r))return"tops";if(/pants|pant|shorts|short|jogger|trouser|bottom/.test(r))return"bottoms";return""}
function norm(p){let imgs=p.images?.nodes||[],vs=(p.variants?.nodes||[]).map(v=>({id:v.id,title:v.title||"Default",availableForSale:v.availableForSale!==false,selectedOptions:v.selectedOptions||[]}));return{id:p.id,title:p.title,image:p.featuredImage?.url||imgs[0]?.url||"",productType:p.productType||"",variants:vs}}
function label(v){let s=(v?.selectedOptions||[]).find(o=>String(o.name).toLowerCase()==="size");return s?.value||(v?.title&&v.title!=="Default Title"?v.title:"One Size")}
function first(p){return p?.variants?.find(v=>v.availableForSale)||p?.variants?.[0]||null}
function make(c,i=0){let a=state[c].items;if(!a.length)return null;i=(i+a.length)%a.length;return{productIndex:i,variantId:first(a[i])?.id||"",uid:Math.random().toString(36).slice(2)}}
function prod(c,s){return state[c].items[s.productIndex]} function vari(c,s){let p=prod(c,s);return p?.variants.find(v=>v.id===s.variantId)||first(p)}
function ensure(){["headwear","tops","bottoms"].forEach(c=>{if(state[c].items.length&&!state[c].selections.length)state[c].selections=[make(c)]})}
function change(c,d){let s=state[c].selections[0],a=state[c].items;if(!s||!a.length)return;s.productIndex=(s.productIndex+d+a.length)%a.length;s.variantId=first(prod(c,s))?.id||"";render(c);summary()}
function peek(c,index,cls,d){let a=state[c].items;if(!a.length)return"";let i=(index+d+a.length)%a.length,p=a[i];return `<button class="uniform-peek ${cls}" data-change="${c}" data-dir="${d}" aria-label="${d<0?"Previous":"Next"} ${c}"><img src="${esc(p.image)}" alt=""></button>`}
function mainCarousel(c){let s=state[c].selections[0],p=prod(c,s);if(!p)return"";return `<div class="uniform-track">${peek(c,s.productIndex,"prev",-1)}<div class="uniform-current"><img src="${esc(p.image)}" alt="${esc(p.title)}"><span class="uniform-current-name">${esc(p.title)}</span></div>${peek(c,s.productIndex,"next",1)}</div>`}
function layers(c){return `<div class="uniform-layer-grid">${state[c].selections.map((s,i)=>{let p=prod(c,s);return `<div class="uniform-layer-card"><img src="${esc(p.image)}" alt="${esc(p.title)}"><span>${esc(p.title)}</span>${i?`<button class="uniform-layer-remove" data-remove="${c}" data-index="${i}">REMOVE</button>`:""}</div>`}).join("")}</div>`}
function render(c){
 let w=document.getElementById(`uniform-${c}-list`);if(!w)return;
 if(c==="headwear"){
   const slot=w.closest(".uniform-look-slot"),canvas=w.closest(".uniform-canvas");
   if(slot)slot.classList.toggle("is-none",state.headwear.none);
   if(canvas)canvas.classList.toggle("headwear-off",state.headwear.none);
 }
 if(c==="headwear"&&state.headwear.none){
   w.innerHTML=`<div class="uniform-none-state"><div><strong>NO HEADWEAR</strong><small>Top + bottom look</small></div></div>`;
 }else{
   w.innerHTML=mainCarousel(c);
 }
 w.querySelectorAll("[data-change]").forEach(b=>b.onclick=()=>change(b.dataset.change,+b.dataset.dir));
}
function picks(){let r=[];["headwear","tops","bottoms"].forEach(c=>{if(c==="headwear"&&state.headwear.none)return;state[c].selections.forEach(s=>{let p=prod(c,s),v=vari(c,s);if(p&&v)r.push({c,s,p,v})})});return r}
function summary(){let p=picks(),t=`${p.length} item${p.length===1?"":"s"} selected`;document.getElementById("uniform-item-count").textContent=t;document.getElementById("uniform-mobile-count").textContent=t;let dis=!p.length;document.getElementById("uniform-add-all").disabled=dis;document.getElementById("uniform-mobile-add").disabled=dis}
function none(){state.headwear.none=!state.headwear.none;let b=document.getElementById("uniform-headwear-none");b.classList.toggle("is-active",state.headwear.none);b.setAttribute("aria-pressed",state.headwear.none);render("headwear");summary()}
function random(){["headwear","tops","bottoms"].forEach(c=>{if(c==="headwear"&&state.headwear.none)return;let a=state[c].items;if(a.length)state[c].selections=[make(c,Math.floor(Math.random()*a.length))]});["headwear","tops","bottoms"].forEach(render);summary()}
function openSizes(){let body=document.getElementById("uniform-size-sheet-body"),ps=picks();body.innerHTML=ps.map((x,i)=>`<article class="uniform-size-item"><img src="${esc(x.p.image)}" alt="${esc(x.p.title)}"><div><h3>${esc(x.p.title)}</h3><div class="uniform-sheet-sizes">${x.p.variants.map(v=>`<button class="uniform-sheet-size ${v.id===x.s.variantId?"is-selected":""}" data-pick="${i}" data-variant="${esc(v.id)}" ${v.availableForSale?"":"disabled"}>${esc(label(v))}</button>`).join("")}</div></div></article>`).join("");document.getElementById("uniform-size-count").textContent=`${ps.length} ITEM${ps.length===1?"":"S"}`;body.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{let x=ps[+b.dataset.pick];x.s.variantId=b.dataset.variant;openSizes()});document.getElementById("uniform-size-overlay").classList.add("is-open");document.getElementById("uniform-size-sheet").classList.add("is-open");document.getElementById("uniform-size-overlay").setAttribute("aria-hidden","false");document.getElementById("uniform-size-sheet").setAttribute("aria-hidden","false")}
function closeSizes(){document.getElementById("uniform-size-overlay").classList.remove("is-open");document.getElementById("uniform-size-sheet").classList.remove("is-open");document.getElementById("uniform-size-overlay").setAttribute("aria-hidden","true");document.getElementById("uniform-size-sheet").setAttribute("aria-hidden","true")}
function lines(){let m=new Map;picks().forEach(x=>m.set(x.v.id,(m.get(x.v.id)||0)+1));return [...m].map(([merchandiseId,quantity])=>({merchandiseId,quantity}))}
async function buy(){let btn=document.getElementById("uniform-confirm-cart");btn.disabled=true;try{let cart=await ensureShopifyCart(),res=await apiPostJson("/api/shopify-cart-lines-add",{cartId:cart.id,lines:lines()}),u=res?.cart;if(u?.id)setShopifyCartId(u.id);updateCartCountUI(u?.totalQuantity||0);renderCartPanel(u);closeSizes();openPanel("cart-panel")}catch(e){console.error(e);document.getElementById("uniform-cart-message").textContent="Unable to add look. Please try again."}finally{btn.disabled=false}}
function swipe(){
 document.querySelectorAll(".uniform-carousel").forEach(w=>{
   let x=0,y=0;
   w.ontouchstart=e=>{x=e.touches[0].clientX;y=e.touches[0].clientY};
   w.ontouchend=e=>{
     const d=e.changedTouches[0].clientX-x;
     const dy=e.changedTouches[0].clientY-y;
     if(Math.abs(d)>30&&Math.abs(d)>Math.abs(dy)){
       const c=w.id.replace("uniform-","").replace("-list","");
       change(c,d<0?1:-1);
     }
   };
 });
}
function bind(){document.getElementById("uniform-headwear-none").onclick=none;document.getElementById("uniform-pick-for-me").onclick=random;document.getElementById("uniform-add-all").onclick=openSizes;document.getElementById("uniform-mobile-add").onclick=openSizes;document.getElementById("uniform-size-close").onclick=closeSizes;document.getElementById("uniform-size-overlay").onclick=closeSizes;document.getElementById("uniform-confirm-cart").onclick=buy}
async function boot(){bind();try{let r=await fetch("/api/shopify-products?collection=shop-all"),d=await r.json();(d.products||d||[]).map(norm).forEach(p=>{let c=cat(p);if(c)state[c].items.push(p)});ensure();["headwear","tops","bottoms"].forEach(render);summary();swipe()}catch(e){console.error(e)}}
document.addEventListener("DOMContentLoaded",boot);
})();