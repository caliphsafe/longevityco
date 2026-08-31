(() => {
const LIMITS={headwear:1,tops:1,bottoms:1},state={headwear:{items:[],selections:[],none:false},tops:{items:[],selections:[]},bottoms:{items:[],selections:[]}};
const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function cat(p){let r=`${p.productType||""} ${p.title||""}`.toLowerCase();if(/headwear|hat|cap|beanie/.test(r))return"headwear";if(/hoodie|sweatshirt|crewneck|t-shirt|t shirt|tee|shirt|top|sweater|longsleeve|long sleeve/.test(r))return"tops";if(/pants|pant|shorts|short|jogger|trouser|bottom/.test(r))return"bottoms";return""}
function norm(p){let imgs=p.images?.nodes||[],vs=(p.variants?.nodes||[]).map(v=>({id:v.id,title:v.title||"Default",availableForSale:v.availableForSale!==false,selectedOptions:v.selectedOptions||[],price:v.price||p.priceRange?.minVariantPrice||{amount:"0",currencyCode:"USD"}}));return{id:p.id,title:p.title,image:p.featuredImage?.url||imgs[0]?.url||"",productType:p.productType||"",variants:vs}}
function label(v){let s=(v?.selectedOptions||[]).find(o=>String(o.name).toLowerCase()==="size");return s?.value||(v?.title&&v.title!=="Default Title"?v.title:"One Size")}
function isOneSizeLabel(v){
 let s=String(label(v)||"").trim().toLowerCase().replace(/\s+/g," ");
 return !s||s==="default"||s==="default title"||s==="one size"||s==="one size fits all"||s==="one-size"||s==="os"||s==="osfa";
}
function sizeChoices(c,p){
 if(c==="headwear"||!p?.variants?.length)return[];
 let available=p.variants.filter(v=>v.availableForSale);
 if(!available.length||available.every(isOneSizeLabel))return[];
 let seen=new Set();
 return available.filter(v=>{
   let k=String(label(v)||"").trim().toLowerCase();
   if(!k||seen.has(k))return false;
   seen.add(k);return true;
 });
}
function sizeRow(c,s,p){
 let vs=sizeChoices(c,p);
 if(!vs.length)return"";
 return `<div class="uniform-inline-sizes" aria-label="Available sizes">${vs.map(v=>`<button type="button" class="uniform-inline-size ${v.id===s.variantId?"is-selected":""}" data-size-category="${c}" data-size-variant="${esc(v.id)}" aria-pressed="${v.id===s.variantId?"true":"false"}">${esc(label(v))}</button>`).join("")}</div>`;
}
function money(v){let p=v?.price||{},n=Number(p.amount||0);try{return new Intl.NumberFormat("en-US",{style:"currency",currency:p.currencyCode||"USD"}).format(n)}catch(e){return `$${n.toFixed(2)}`}}
function first(p){return p?.variants?.find(v=>v.availableForSale)||p?.variants?.[0]||null}
const SIZE_ORDER=["xxxs","xxs","xs","s","m","l","xl","xxl","2xl","xxxl","3xl","4xl","5xl","6xl"];
function sizeKey(v){
 return String(label(v)||"").trim().toLowerCase().replace(/\s+/g,"").replace(/-/g,"");
}
function smartVariant(p,preferredLabel=""){
 if(!p?.variants?.length)return null;
 let available=p.variants.filter(v=>v.availableForSale);
 if(!available.length)return p.variants[0]||null;
 if(!preferredLabel)return available[0];
 let wanted=String(preferredLabel).trim().toLowerCase().replace(/\s+/g,"").replace(/-/g,"");
 let exact=available.find(v=>sizeKey(v)===wanted);
 if(exact)return exact;
 let target=SIZE_ORDER.indexOf(wanted);
 if(target>=0){
   let ranked=available.map(v=>({v,i:SIZE_ORDER.indexOf(sizeKey(v))})).filter(x=>x.i>=0);
   let smaller=ranked.filter(x=>x.i<target).sort((a,b)=>b.i-a.i)[0];
   if(smaller)return smaller.v;
   let larger=ranked.filter(x=>x.i>target).sort((a,b)=>a.i-b.i)[0];
   if(larger)return larger.v;
 }
 return available[0];
}
function make(c,i=0){let a=state[c].items;if(!a.length)return null;i=(i+a.length)%a.length;return{productIndex:i,variantId:first(a[i])?.id||"",uid:Math.random().toString(36).slice(2)}}
function prod(c,s){return state[c].items[s.productIndex]} function vari(c,s){let p=prod(c,s);return p?.variants.find(v=>v.id===s.variantId)||first(p)}
function ensure(){["headwear","tops","bottoms"].forEach(c=>{if(state[c].items.length&&!state[c].selections.length)state[c].selections=[make(c)]})}
function change(c,d){
 let s=state[c].selections[0],a=state[c].items;
 if(!s||!a.length)return;
 let previous=vari(c,s),preferred=label(previous);
 s.productIndex=(s.productIndex+d+a.length)%a.length;
 let next=prod(c,s),picked=smartVariant(next,preferred);
 s.variantId=picked?.id||"";
 render(c);summary();
}
function peek(c,index,cls,d){let a=state[c].items;if(!a.length)return"";let i=(index+d+a.length)%a.length,p=a[i];return `<button class="uniform-peek ${cls}" data-change="${c}" data-dir="${d}" aria-label="${d<0?"Previous":"Next"} ${c}"><img src="${esc(p.image)}" alt=""></button>`}
function mainCarousel(c){let s=state[c].selections[0],p=prod(c,s);if(!p)return"";return `<div class="uniform-track">${peek(c,s.productIndex,"prev",-1)}<div class="uniform-current"><div class="uniform-current-visual"><img src="${esc(p.image)}" alt="${esc(p.title)}"></div>${sizeRow(c,s,p)}</div>${peek(c,s.productIndex,"next",1)}</div>`}
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
 w.querySelectorAll("[data-size-variant]").forEach(b=>b.onclick=()=>{
   let s=state[b.dataset.sizeCategory]?.selections?.[0];
   if(!s)return;
   s.variantId=b.dataset.sizeVariant;
   render(b.dataset.sizeCategory);
   summary();
 });
}
function picks(){let r=[];["headwear","tops","bottoms"].forEach(c=>{if(c==="headwear"&&state.headwear.none)return;state[c].selections.forEach(s=>{let p=prod(c,s),v=vari(c,s);if(p&&v)r.push({c,s,p,v})})});return r}
function summary(){let p=picks(),t=`${p.length} item${p.length===1?"":"s"} selected`;document.getElementById("uniform-item-count").textContent=t;document.getElementById("uniform-mobile-count").textContent=t;let dis=!p.length;document.getElementById("uniform-add-all").disabled=dis;document.getElementById("uniform-mobile-add").disabled=dis}
function none(){state.headwear.none=!state.headwear.none;let b=document.getElementById("uniform-headwear-none");b.classList.toggle("is-active",state.headwear.none);b.setAttribute("aria-pressed",state.headwear.none);render("headwear");summary()}
function random(){
 ["headwear","tops","bottoms"].forEach(c=>{
   if(c==="headwear"&&state.headwear.none)return;
   let a=state[c].items;if(!a.length)return;
   let old=state[c].selections[0],preferred=old?label(vari(c,old)):"";
   let next=make(c,Math.floor(Math.random()*a.length));
   let picked=smartVariant(prod(c,next),preferred);
   next.variantId=picked?.id||"";
   state[c].selections=[next];
 });
 ["headwear","tops","bottoms"].forEach(render);summary();
}
function lines(){let m=new Map;picks().forEach(x=>m.set(x.v.id,(m.get(x.v.id)||0)+1));return [...m].map(([merchandiseId,quantity])=>({merchandiseId,quantity}))}
async function buy(){
 const buttons=[document.getElementById("uniform-add-all"),document.getElementById("uniform-mobile-add")].filter(Boolean);
 buttons.forEach(b=>b.disabled=true);
 try{
   let cart=await ensureShopifyCart();
   let res=await apiPostJson("/api/shopify-cart-lines-add",{cartId:cart.id,lines:lines()});
   let u=res?.cart;
   if(u?.id)setShopifyCartId(u.id);
   updateCartCountUI(u?.totalQuantity||0);
   renderCartPanel(u);
   openPanel("cart-panel");
 }catch(e){
   console.error(e);
   let msg=document.getElementById("uniform-cart-message");
   if(msg)msg.textContent="Unable to add look. Please try again.";
 }finally{
   buttons.forEach(b=>b.disabled=false);
   summary();
 }
}
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
function bind(){
 document.getElementById("uniform-headwear-none").onclick=none;
 document.getElementById("uniform-pick-for-me").onclick=random;
 document.getElementById("uniform-view-cart").onclick=async()=>{
   try{
     let cart=await fetchCurrentShopifyCart();
     if(cart)renderCartPanel(cart);
     openPanel("cart-panel");
   }catch(e){console.error(e);openPanel("cart-panel")}
 };
 document.getElementById("uniform-add-all").onclick=buy;
 document.getElementById("uniform-mobile-add").onclick=buy;
}
async function boot(){bind();try{let r=await fetch("/api/shopify-products?collection=shop-all"),d=await r.json();(d.products||d||[]).map(norm).forEach(p=>{let c=cat(p);if(c)state[c].items.push(p)});ensure();["headwear","tops","bottoms"].forEach(render);summary();swipe()}catch(e){console.error(e)}}
document.addEventListener("DOMContentLoaded",boot);
})();