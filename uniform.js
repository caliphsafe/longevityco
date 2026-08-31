(() => {
const STORAGE_KEY="longevity_uniform_v10";
const SIZE_MEMORY_KEY="longevity_uniform_size_memory_v10";
const state={headwear:{items:[],selections:[],none:false},tops:{items:[],selections:[]},bottoms:{items:[],selections:[]}};
let CART=null, lastLookSignature="", pendingDuplicateDecision=null, sizeAdjusted={};
const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function cat(p){let r=`${p.productType||""} ${p.title||""}`.toLowerCase();if(/headwear|hat|cap|beanie/.test(r))return"headwear";if(/hoodie|sweatshirt|crewneck|t-shirt|t shirt|tee|shirt|top|sweater|longsleeve|long sleeve/.test(r))return"tops";if(/pants|pant|shorts|short|jogger|trouser|bottom/.test(r))return"bottoms";return""}
function norm(p){let imgs=p.images?.nodes||[],primary=p.featuredImage?.url||imgs[0]?.url||"",secondary=imgs.find(img=>img?.url&&img.url!==primary)?.url||"";let vs=(p.variants?.nodes||[]).map(v=>({id:v.id,title:v.title||"Default",availableForSale:v.availableForSale!==false,selectedOptions:v.selectedOptions||[],price:v.price||p.priceRange?.minVariantPrice||{amount:"0",currencyCode:"USD"}}));return{id:p.id,handle:p.handle||"",title:p.title,image:primary,hoverImage:secondary,productType:p.productType||"",variants:vs}}
function label(v){let s=(v?.selectedOptions||[]).find(o=>String(o.name).toLowerCase()==="size");return s?.value||(v?.title&&v.title!=="Default Title"?v.title:"One Size")}
function isOneSizeLabel(v){let s=String(label(v)||"").trim().toLowerCase().replace(/\s+/g," ");return !s||["default","default title","one size","one size fits all","one-size","os","osfa"].includes(s)}
function sizeChoices(c,p){if(c==="headwear"||!p?.variants?.length)return[];let available=p.variants.filter(v=>v.availableForSale);if(!available.length||available.every(isOneSizeLabel))return[];let seen=new Set();return available.filter(v=>{let k=canonicalSize(label(v));if(!k||seen.has(k))return false;seen.add(k);return true})}
function sizeRow(c,s,p){let vs=sizeChoices(c,p);if(!vs.length)return"";let note=sizeAdjusted[c]?`<small class="uniform-size-adjusted">${esc(sizeAdjusted[c])}</small>`:"";return `<div class="uniform-inline-sizes" aria-label="Available sizes">${vs.map(v=>`<button type="button" class="uniform-inline-size ${v.id===s.variantId?"is-selected":""}" data-size-category="${c}" data-size-variant="${esc(v.id)}" aria-pressed="${v.id===s.variantId?"true":"false"}">${esc(label(v))}</button>`).join("")}</div>${note}`}
function first(p){return p?.variants?.find(v=>v.availableForSale)||p?.variants?.[0]||null}
const SIZE_ORDER=["xxxs","xxs","xs","s","m","l","xl","2xl","3xl","4xl","5xl","6xl"];
function canonicalSize(v){let s=String(v||"").trim().toLowerCase().replace(/\s+/g,"").replace(/-/g,"");const aliases={xxl:"2xl",xxxl:"3xl",xxxxl:"4xl",xxxxxl:"5xl",xxxxxxl:"6xl",extraextra:"2xl"};return aliases[s]||s}
function smartVariant(p,preferredLabel=""){
 if(!p?.variants?.length)return null;
 let available=p.variants.filter(v=>v.availableForSale);if(!available.length)return null;
 if(!preferredLabel)return available[0];
 let wanted=canonicalSize(preferredLabel),exact=available.find(v=>canonicalSize(label(v))===wanted);if(exact)return exact;
 if(/^\d+(\.\d+)?$/.test(wanted)){let target=Number(wanted),nums=available.map(v=>({v,n:Number(canonicalSize(label(v)))})).filter(x=>Number.isFinite(x.n));let smaller=nums.filter(x=>x.n<target).sort((a,b)=>b.n-a.n)[0];if(smaller)return smaller.v;let larger=nums.filter(x=>x.n>target).sort((a,b)=>a.n-b.n)[0];if(larger)return larger.v}
 let target=SIZE_ORDER.indexOf(wanted);if(target>=0){let ranked=available.map(v=>({v,i:SIZE_ORDER.indexOf(canonicalSize(label(v)))})).filter(x=>x.i>=0);let smaller=ranked.filter(x=>x.i<target).sort((a,b)=>b.i-a.i)[0];if(smaller)return smaller.v;let larger=ranked.filter(x=>x.i>target).sort((a,b)=>a.i-b.i)[0];if(larger)return larger.v}
 return available[0]
}
function getSizeMemory(){try{return JSON.parse(localStorage.getItem(SIZE_MEMORY_KEY)||"{}")}catch{return{}}}
function rememberSize(c,v){if(!v||isOneSizeLabel(v))return;let m=getSizeMemory();m[c]=label(v);localStorage.setItem(SIZE_MEMORY_KEY,JSON.stringify(m))}
function preferredSize(c,currentVariant){return currentVariant&&!isOneSizeLabel(currentVariant)?label(currentVariant):(getSizeMemory()[c]||"")}
function make(c,i=0,preferred=""){let a=state[c].items;if(!a.length)return null;i=(i+a.length)%a.length;let v=smartVariant(a[i],preferred)||first(a[i]);return{productIndex:i,variantId:v?.id||"",uid:Math.random().toString(36).slice(2)}}
function prod(c,s){return state[c].items[s.productIndex]} function vari(c,s){let p=prod(c,s);return p?.variants.find(v=>v.id===s.variantId)||first(p)}
function ensure(){["headwear","tops","bottoms"].forEach(c=>{if(state[c].items.length&&!state[c].selections.length)state[c].selections=[make(c,0,getSizeMemory()[c]||"")]})}
function saveLook(){try{let data={none:state.headwear.none,categories:{}};["headwear","tops","bottoms"].forEach(c=>{let s=state[c].selections[0],p=s&&prod(c,s),v=s&&vari(c,s);data.categories[c]=p?{productId:p.id,handle:p.handle,variantId:v?.id||"",size:v?label(v):""}:null});localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}}
function restoreLook(){try{let d=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(!d)return;state.headwear.none=!!d.none;["headwear","tops","bottoms"].forEach(c=>{let saved=d.categories?.[c];if(!saved)return;let i=state[c].items.findIndex(p=>p.id===saved.productId||(saved.handle&&p.handle===saved.handle));if(i<0)return;let p=state[c].items[i],v=p.variants.find(v=>v.id===saved.variantId&&v.availableForSale)||smartVariant(p,saved.size||getSizeMemory()[c]||"");if(v)state[c].selections=[{productIndex:i,variantId:v.id,uid:Math.random().toString(36).slice(2)}]})}catch{}}
function cartLines(cart=CART){return cart?.lines?.nodes||cart?.lines?.edges?.map(e=>e.node)||[]}
function cartQty(variantId){return cartLines().filter(l=>(l.merchandise?.id||l.merchandiseId)===variantId).reduce((n,l)=>n+Number(l.quantity||0),0)}
function inCart(variantId){return cartQty(variantId)>0}
async function syncCart(){try{CART=await fetchCurrentShopifyCart();return CART}catch(e){console.warn("Uniform cart sync:",e);CART=null;return null}}
function change(c,d){
 let s=state[c].selections[0],a=state[c].items;if(!s||!a.length)return;
 let previous=vari(c,s),preferred=preferredSize(c,previous),oldLabel=previous?label(previous):"";
 let start=s.productIndex,tries=0,nextIndex=start,nextProduct=null,picked=null;
 do{nextIndex=(nextIndex+d+a.length)%a.length;nextProduct=a[nextIndex];picked=smartVariant(nextProduct,preferred);tries++}while(tries<a.length&&!picked);
 if(!picked)return;
 s.productIndex=nextIndex;s.variantId=picked.id;
 sizeAdjusted[c]=preferred&&canonicalSize(label(picked))!==canonicalSize(preferred)?`${preferred} unavailable — ${label(picked)} selected`:"";
 rememberSize(c,picked);saveLook();render(c);summary()
}
function peek(c,index,cls,d){let a=state[c].items;if(!a.length)return"";let i=(index+d+a.length)%a.length,p=a[i];return `<button class="uniform-peek ${cls}" data-change="${c}" data-dir="${d}" aria-label="${d<0?"Previous":"Next"} ${c}"><img src="${esc(p.image)}" alt=""></button>`}
function mainCarousel(c){let s=state[c].selections[0],p=prod(c,s),v=vari(c,s);if(!p||!v)return"";let badge=inCart(v.id)?`<span class="uniform-in-cart-badge">IN CART${cartQty(v.id)>1?` ×${cartQty(v.id)}`:""}</span>`:"";let hover=p.hoverImage?`<img class="uniform-product-image uniform-product-image-hover" src="${esc(p.hoverImage)}" alt="${esc(p.title)} alternate view">`:"";let tap=p.hoverImage?` role="button" tabindex="0" aria-label="Toggle alternate product image" data-toggle-hover-image`:"";return `<div class="uniform-track">${peek(c,s.productIndex,"prev",-1)}<div class="uniform-current"><div class="uniform-current-visual ${p.hoverImage?"has-hover-image":""}"${tap}><img class="uniform-product-image uniform-product-image-primary" src="${esc(p.image)}" alt="${esc(p.title)}">${hover}${badge}</div>${sizeRow(c,s,p)}</div>${peek(c,s.productIndex,"next",1)}</div>`}
function render(c){let w=document.getElementById(`uniform-${c}-list`);if(!w)return;if(c==="headwear"){const slot=w.closest(".uniform-look-slot"),canvas=w.closest(".uniform-canvas");slot?.classList.toggle("is-none",state.headwear.none);canvas?.classList.toggle("headwear-off",state.headwear.none)}if(c==="headwear"&&state.headwear.none)w.innerHTML=`<div class="uniform-none-state"><div><strong>NO HEADWEAR</strong><small>Top + bottom look</small></div></div>`;else w.innerHTML=mainCarousel(c);w.querySelectorAll("[data-change]").forEach(b=>b.onclick=()=>change(b.dataset.change,+b.dataset.dir));w.querySelectorAll("[data-size-variant]").forEach(b=>b.onclick=()=>{let c=b.dataset.sizeCategory,s=state[c]?.selections?.[0],p=s&&prod(c,s),v=p?.variants.find(v=>v.id===b.dataset.sizeVariant);if(!s||!v||!v.availableForSale)return;s.variantId=v.id;sizeAdjusted[c]="";rememberSize(c,v);saveLook();render(c);summary()});
 w.querySelectorAll("[data-toggle-hover-image]").forEach(el=>{
   const toggle=()=>{if(window.matchMedia("(max-width:700px)").matches)el.classList.toggle("show-hover-image")};
   el.onclick=e=>{if(window.matchMedia("(max-width:700px)").matches){e.stopPropagation();toggle()}};
   el.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&window.matchMedia("(max-width:700px)").matches){e.preventDefault();toggle()}};
 })}
function picks(){let r=[];["headwear","tops","bottoms"].forEach(c=>{if(c==="headwear"&&state.headwear.none)return;state[c].selections.forEach(s=>{let p=prod(c,s),v=vari(c,s);if(p&&v&&v.availableForSale)r.push({c,s,p,v})})});return r}
function summary(){let p=picks(),t=`${p.length} item${p.length===1?"":"s"} selected`;document.getElementById("uniform-item-count").textContent=t;document.getElementById("uniform-mobile-count").textContent=t;let dis=!p.length;document.getElementById("uniform-add-all").disabled=dis;document.getElementById("uniform-mobile-add").disabled=dis}
function none(){state.headwear.none=!state.headwear.none;let b=document.getElementById("uniform-headwear-none");b.classList.toggle("is-active",state.headwear.none);b.setAttribute("aria-pressed",state.headwear.none);saveLook();render("headwear");summary()}
function lookSignature(){return ["headwear","tops","bottoms"].map(c=>c==="headwear"&&state.headwear.none?"NONE":prod(c,state[c].selections[0])?.id||"").join("|")}
function random(){
 let before=lookSignature(),attempts=0;
 do{
  ["headwear","tops","bottoms"].forEach(c=>{if(c==="headwear"&&state.headwear.none)return;let a=state[c].items.filter(p=>p.variants.some(v=>v.availableForSale));if(!a.length)return;let current=state[c].selections[0],preferred=preferredSize(c,current?vari(c,current):null),p=a[Math.floor(Math.random()*a.length)],idx=state[c].items.indexOf(p),next=make(c,idx,preferred);if(next)state[c].selections=[next]});
  attempts++;
 }while(lookSignature()===before&&attempts<12);
 lastLookSignature=lookSignature();sizeAdjusted={};saveLook();["headwear","tops","bottoms"].forEach(render);summary()
}
function newLines(includeDuplicates=true){let m=new Map;picks().forEach(x=>{if(!includeDuplicates&&inCart(x.v.id))return;m.set(x.v.id,(m.get(x.v.id)||0)+1)});return [...m].map(([merchandiseId,quantity])=>({merchandiseId,quantity}))}
function duplicates(){return picks().filter(x=>inCart(x.v.id))}
function openDuplicateConfirm(ds){let box=document.getElementById("uniform-confirm-items");box.innerHTML=ds.map(x=>`<div class="uniform-confirm-item"><img src="${esc(x.p.image)}" alt=""><div><strong>${esc(x.p.title)}</strong><small>${esc(label(x.v))}</small></div><span>IN CART ×${cartQty(x.v.id)}</span></div>`).join("");document.getElementById("uniform-confirm-overlay").classList.add("is-open");document.getElementById("uniform-confirm").classList.add("is-open");document.getElementById("uniform-confirm-overlay").setAttribute("aria-hidden","false");document.getElementById("uniform-confirm").setAttribute("aria-hidden","false")}
function closeDuplicateConfirm(){document.getElementById("uniform-confirm-overlay")?.classList.remove("is-open");document.getElementById("uniform-confirm")?.classList.remove("is-open");document.getElementById("uniform-confirm-overlay")?.setAttribute("aria-hidden","true");document.getElementById("uniform-confirm")?.setAttribute("aria-hidden","true")}
async function addLines(lines){if(!lines.length){openPanel("cart-panel");return}let cart=await ensureShopifyCart(),res=await apiPostJson("/api/shopify-cart-lines-add",{cartId:cart.id,lines}),u=res?.cart;if(u?.id)setShopifyCartId(u.id);CART=u||await fetchCurrentShopifyCart();updateCartCountUI(CART?.totalQuantity||0);renderCartPanel(CART);["headwear","tops","bottoms"].forEach(render);openPanel("cart-panel")}
async function buy(){
 const buttons=[document.getElementById("uniform-add-all"),document.getElementById("uniform-mobile-add")].filter(Boolean);buttons.forEach(b=>b.disabled=true);
 try{await syncCart();let ds=duplicates();if(ds.length){openDuplicateConfirm(ds);return}await addLines(newLines(true))}
 catch(e){console.error(e);let msg=document.getElementById("uniform-cart-message");if(msg)msg.textContent="Unable to add look. Please try again."}
 finally{buttons.forEach(b=>b.disabled=false);summary()}
}
function swipe(){
 document.querySelectorAll(".uniform-carousel").forEach(w=>{
   let x=0,y=0,dx=0,dragging=false,locked=false;
   const track=()=>w.querySelector(".uniform-track");
   const resetDrag=()=>{
     const t=track();
     if(t){t.style.transform="";t.style.opacity=""}
     w.classList.remove("is-dragging");
     dragging=false;locked=false;dx=0;
   };
   const animateCommit=(dir,c)=>{
     w.classList.remove("is-dragging");
     w.classList.add(dir>0?"is-swipe-out-left":"is-swipe-out-right");
     setTimeout(()=>{
       change(c,dir);
       w.classList.remove("is-swipe-out-left","is-swipe-out-right");
       w.classList.add(dir>0?"is-swipe-enter-left":"is-swipe-enter-right");
       setTimeout(()=>w.classList.remove("is-swipe-enter-left","is-swipe-enter-right"),300);
     },170);
   };
   w.ontouchstart=e=>{
     if(e.touches.length!==1)return;
     x=e.touches[0].clientX;y=e.touches[0].clientY;dx=0;dragging=true;locked=false;
     w.classList.add("is-dragging");
   };
   w.ontouchmove=e=>{
     if(!dragging||e.touches.length!==1)return;
     const mx=e.touches[0].clientX-x,my=e.touches[0].clientY-y;
     if(!locked){
       if(Math.abs(mx)<5&&Math.abs(my)<5)return;
       if(Math.abs(my)>Math.abs(mx)){resetDrag();return}
       locked=true;
     }
     dx=mx;
     const t=track();
     if(t){
       const limited=Math.max(-110,Math.min(110,dx));
       t.style.transform=`translateX(${limited}px)`;
       t.style.opacity=String(Math.max(.55,1-Math.abs(limited)/260));
     }
     if(e.cancelable)e.preventDefault();
   };
   w.ontouchcancel=resetDrag;
   w.ontouchend=e=>{
     if(!dragging)return;
     const endX=e.changedTouches?.[0]?.clientX ?? x;
     const endY=e.changedTouches?.[0]?.clientY ?? y;
     const d=endX-x,dy=endY-y;
     const c=w.id.replace("uniform-","").replace("-list","");
     if(Math.abs(d)>42&&Math.abs(d)>Math.abs(dy)){
       const dir=d<0?1:-1;
       const t=track();
       if(t){t.style.transform="";t.style.opacity=""}
       animateCommit(dir,c);
     }else{
       const t=track();
       if(t){t.style.transform="translateX(0)";t.style.opacity="1"}
       setTimeout(resetDrag,220);
     }
   };
 })
}
function bind(){
 document.getElementById("uniform-headwear-none").onclick=none;document.getElementById("uniform-pick-for-me").onclick=random;
 document.getElementById("uniform-view-cart").onclick=async()=>{try{await syncCart();if(CART)renderCartPanel(CART);["headwear","tops","bottoms"].forEach(render);openPanel("cart-panel")}catch(e){console.error(e);openPanel("cart-panel")}};
 document.getElementById("uniform-add-all").onclick=buy;document.getElementById("uniform-mobile-add").onclick=buy;
 document.getElementById("uniform-confirm-close").onclick=closeDuplicateConfirm;document.getElementById("uniform-confirm-overlay").onclick=closeDuplicateConfirm;
 document.getElementById("uniform-add-new-only").onclick=async()=>{closeDuplicateConfirm();try{await addLines(newLines(false))}catch(e){console.error(e)}};
 document.getElementById("uniform-add-duplicates").onclick=async()=>{closeDuplicateConfirm();try{await addLines(newLines(true))}catch(e){console.error(e)}};
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDuplicateConfirm()})
}
async function boot(){
 bind();
 try{
  let [r]=await Promise.all([fetch("/api/shopify-products?collection=shop-all"),syncCart()]);
  let d=await r.json();(d.products||d||[]).map(norm).forEach(p=>{let c=cat(p);if(c&&p.variants.some(v=>v.availableForSale))state[c].items.push(p)});
  ensure();restoreLook();let b=document.getElementById("uniform-headwear-none");b.classList.toggle("is-active",state.headwear.none);b.setAttribute("aria-pressed",state.headwear.none);
  ["headwear","tops","bottoms"].forEach(render);summary();swipe()
 }catch(e){console.error(e)}
}
document.addEventListener("DOMContentLoaded",boot);
})();