(() => {
const state={headwear:{items:[],index:0},tops:{items:[],index:0},bottoms:{items:[],index:0}};
const money=(n,c="USD")=>new Intl.NumberFormat("en-US",{style:"currency",currency:c}).format(Number(n||0));
function cat(p){const x=String(p.productType||"").toLowerCase(),t=String(p.title||"").toLowerCase();
 if(/headwear|hat|cap|beanie/.test(x+" "+t))return"headwear";
 if(/hoodie|sweatshirt|t-shirt|t shirt|tee|shirt|top/.test(x+" "+t))return"tops";
 if(/pants|pant|shorts|short|jogger|trouser|bottom/.test(x+" "+t))return"bottoms";return"";}
function normalize(p){const imgs=p.images?.nodes||[],v=p.variants?.nodes||[],price=p.priceRange?.minVariantPrice||{};
 return{id:p.id,handle:p.handle,title:p.title,image:p.featuredImage?.url||imgs[0]?.url||"",price:Number(price.amount||0),currency:price.currencyCode||"USD",variants:v,productType:p.productType};}
function selected(key){const s=state[key];return s.items[s.index]||null;}
function availableVariant(p){return p?.variants?.find(v=>v.availableForSale)||p?.variants?.[0]||null;}
function renderSlot(key){const s=state[key],el=document.querySelector(`[data-slot="${key}"]`);if(!el)return;
 const p=selected(key),img=el.querySelector("img"),name=el.querySelector(".uniform-piece-info strong"),price=el.querySelector(".uniform-piece-info span");
 if(!p){el.classList.add("is-empty");img.removeAttribute("src");name.textContent="No products available";price.textContent="";return;}
 el.classList.remove("is-empty");img.src=p.image;img.alt=p.title;name.textContent=p.title;price.textContent=money(p.price,p.currency);
 el.querySelector(".uniform-dots").innerHTML=s.items.map((_,i)=>`<button type="button" class="${i===s.index?"active":""}" data-dot="${i}" aria-label="Select item ${i+1}"></button>`).join("");
 el.querySelectorAll("[data-dot]").forEach(b=>b.onclick=()=>{s.index=Number(b.dataset.dot);renderSlot(key);renderSummary();});}
function renderSummary(){const picks=["headwear","tops","bottoms"].map(selected).filter(Boolean),total=picks.reduce((n,p)=>n+p.price,0);
 document.getElementById("uniform-total").textContent=money(total,picks[0]?.currency||"USD");
 document.getElementById("uniform-selected-list").innerHTML=picks.map(p=>`<div><span>${p.title}</span><span>${money(p.price,p.currency)}</span></div>`).join("");}
function move(key,d){const s=state[key];if(!s.items.length)return;s.index=(s.index+d+s.items.length)%s.items.length;renderSlot(key);renderSummary();}
async function addAll(){const picks=["headwear","tops","bottoms"].map(selected).filter(Boolean);if(!picks.length)return;
 const button=document.getElementById("uniform-add-all");button.disabled=true;button.textContent="Adding...";
 try{
   for(const p of picks){const v=availableVariant(p);if(!v)continue;
     if(typeof addCartItem==="function") addCartItem({handle:p.handle,name:p.title,price:money(Number(v.price?.amount||p.price),v.price?.currencyCode||p.currency),image:p.image,size:v.selectedOptions?.find(o=>o.name.toLowerCase()==="size")?.value||v.title,variantId:v.id,quantity:1});
   }
   if(typeof updateCartCount==="function")updateCartCount();
   if(typeof renderCartPanel==="function")renderCartPanel();
   button.textContent="Uniform Added";
   setTimeout(()=>button.textContent="Add Uniform to Cart",1400);
 }finally{button.disabled=false;}}
async function boot(){
 try{const r=await fetch("/api/shopify-products?collection=shop-all");const d=await r.json();const products=(d.products||[]).map(normalize);
   products.forEach(p=>{const k=cat(p);if(k)state[k].items.push(p);});
   Object.keys(state).forEach(k=>{renderSlot(k);const el=document.querySelector(`[data-slot="${k}"]`);el.querySelector(".prev").onclick=()=>move(k,-1);el.querySelector(".next").onclick=()=>move(k,1);});
   renderSummary();document.getElementById("uniform-add-all").onclick=addAll;
 }catch(e){document.getElementById("uniform-builder").innerHTML=`<p class="uniform-error">Unable to load the outfit builder.</p>`;}}
document.addEventListener("DOMContentLoaded",boot);
})();