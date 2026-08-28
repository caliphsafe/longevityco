
(() => {
  const V2 = {
    dashboardDays: 1,
    orders: [],
    customers: [],
    discounts: [],
    drafts: [],
    abandoned: [],
    loaded: {},
  };

  const $ = (id) => document.getElementById(id);
  const fmtDate = (value) => value ? new Intl.DateTimeFormat("en-US", { month:"short", day:"numeric", year:"numeric" }).format(new Date(value)) : "—";
  const fmtDateTime = (value) => value ? new Intl.DateTimeFormat("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }).format(new Date(value)) : "—";
  const safeMoney = (moneySet) => money(moneySet?.shopMoney?.amount ?? moneySet?.amount ?? 0);
  const text = (v) => escapeHtml(v ?? "");

  document.addEventListener("DOMContentLoaded", () => {
    bindV2();
    setTimeout(() => loadDashboard(), 400);
  });

  function bindV2() {
    document.querySelectorAll("[data-go-view]").forEach(btn => {
      btn.addEventListener("click", () => switchView(btn.dataset.goView));
    });

    document.querySelectorAll('.admin-nav-link[data-view]').forEach(btn => {
      btn.addEventListener("click", () => loadView(btn.dataset.view));
    });

    $("dashboard-refresh-btn")?.addEventListener("click", () => loadDashboard(true));
    $("orders-refresh-btn")?.addEventListener("click", () => loadOrders(true));
    $("customers-refresh-btn")?.addEventListener("click", () => loadCustomers(true));
    $("abandoned-refresh-btn")?.addEventListener("click", () => loadAbandoned(true));

    document.querySelectorAll("#dashboard-period-tabs [data-days]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#dashboard-period-tabs [data-days]").forEach(b => b.classList.toggle("is-active", b === btn));
        V2.dashboardDays = Number(btn.dataset.days);
        loadDashboard(true);
      });
    });

    $("orders-search")?.addEventListener("input", renderOrders);
    $("orders-status-filter")?.addEventListener("change", renderOrders);
    $("customers-search")?.addEventListener("input", renderCustomers);
    $("customers-filter")?.addEventListener("change", renderCustomers);

    $("new-discount-btn")?.addEventListener("click", () => $("discount-create-panel").hidden = false);
    $("cancel-discount-btn")?.addEventListener("click", () => $("discount-create-panel").hidden = true);
    $("create-discount-btn")?.addEventListener("click", createDiscount);

    $("new-draft-btn")?.addEventListener("click", () => {
      $("draft-create-panel").hidden = false;
      if (!$("draft-item-rows").children.length) addDraftItemRow();
    });
    $("cancel-draft-btn")?.addEventListener("click", () => $("draft-create-panel").hidden = true);
    $("add-draft-item-btn")?.addEventListener("click", addDraftItemRow);
    $("create-draft-btn")?.addEventListener("click", createDraftOrder);

    $("v2-drawer-close")?.addEventListener("click", closeDrawer);
    $("v2-drawer-backdrop")?.addEventListener("click", closeDrawer);
  }

  function loadView(view) {
    if (view === "dashboard") loadDashboard();
    if (view === "orders") loadOrders();
    if (view === "customers") loadCustomers();
    if (view === "discounts") loadDiscounts();
    if (view === "draft-orders") loadDraftOrders();
    if (view === "abandoned") loadAbandoned();
  }

  async function loadDashboard(force = false) {
    if (V2.loaded.dashboard && !force && V2.loaded.dashboard === V2.dashboardDays) return;
    setLoading($("dashboard-metrics"), "Loading store data...");
    try {
      const data = await apiJson(`/api/admin-dashboard?days=${V2.dashboardDays}`);
      V2.loaded.dashboard = V2.dashboardDays;
      renderDashboard(data);
    } catch (error) {
      $("dashboard-metrics").innerHTML = `<div class="v2-empty-mini">${text(error.message)}</div>`;
    }
  }

  function renderDashboard(data) {
    const m = data.metrics || {};
    $("dashboard-metrics").innerHTML = [
      ["Revenue", money(m.revenue || 0)],
      ["Orders", m.orders || 0],
      ["Average Order", money(m.averageOrder || 0)],
      ["Units Sold", m.unitsSold || 0],
      ["Needs Shipping", m.needsShipping || 0],
      ["Low Stock", m.lowStock || 0],
      ["Sold Out", m.soldOut || 0],
      ["Abandoned", m.abandoned || 0],
    ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");

    renderMiniList("dashboard-shipping-list", data.needsShipping || [], item => `
      <div><strong>${text(item.name)}</strong><span>${text(item.customer || "Guest")} · ${fmtDateTime(item.createdAt)}</span></div>
      <strong>${safeMoney(item.totalPriceSet)}</strong>
    `);
    renderMiniList("dashboard-stock-list", data.lowStockItems || [], item => `
      <div><strong>${text(item.product)}</strong><span>${text(item.variant)} · ${Number(item.quantity || 0)} left</span></div>
      <small>${Number(item.quantity || 0) === 0 ? "SOLD OUT" : "LOW"}</small>
    `);
    renderMiniList("dashboard-top-products", data.topProducts || [], item => `
      <div><strong>${text(item.title)}</strong><span>${Number(item.units || 0)} units</span></div>
      <strong>${money(item.revenue || 0)}</strong>
    `);
    renderMiniList("dashboard-abandoned-list", data.abandonedCheckouts || [], item => `
      <div><strong>${text(item.customer || item.email || "Unknown Customer")}</strong><span>${fmtDateTime(item.createdAt)} · ${Number(item.itemCount || 0)} items</span></div>
      <strong>${safeMoney(item.totalPriceSet)}</strong>
    `);
  }

  function renderMiniList(id, items, template) {
    const el = $(id);
    el.innerHTML = items.length
      ? items.slice(0, 6).map(item => `<div class="v2-list-row">${template(item)}</div>`).join("")
      : `<div class="v2-empty-mini">Nothing needs attention here.</div>`;
  }

  async function loadOrders(force = false) {
    if (V2.loaded.orders && !force) return renderOrders();
    setLoading($("orders-list"));
    try {
      const data = await apiJson("/api/admin-orders");
      V2.orders = data.orders || [];
      V2.loaded.orders = true;
      renderOrders();
    } catch (error) { showListError("orders-list", error); }
  }

  function renderOrders() {
    const q = ($("orders-search")?.value || "").toLowerCase().trim();
    const filter = $("orders-status-filter")?.value || "ALL";
    const orders = V2.orders.filter(order => {
      const hay = [order.name, order.email, order.customer?.firstName, order.customer?.lastName].join(" ").toLowerCase();
      return (!q || hay.includes(q)) && (filter === "ALL" || order.displayFulfillmentStatus === filter);
    });

    const revenue = orders.reduce((sum, o) => sum + Number(o.totalPriceSet?.shopMoney?.amount || 0), 0);
    $("orders-summary").textContent = `${orders.length} ORDERS · ${money(revenue)} TOTAL`;
    $("orders-empty").hidden = !!orders.length;
    $("orders-list").innerHTML = orders.map(order => `
      <article class="v2-table-row is-clickable" data-order-id="${text(order.id)}">
        <div class="v2-main"><strong>${text(order.name)}</strong><small>${text(customerName(order.customer, order.email))} · ${fmtDateTime(order.createdAt)}</small></div>
        <span>${text(order.displayFinancialStatus || "—")}</span>
        <span class="v2-status ${statusClass(order.displayFulfillmentStatus)}">${text(order.displayFulfillmentStatus || "—")}</span>
        <span>${Number(order.lineItems?.nodes?.reduce((s,i)=>s+Number(i.quantity||0),0) || 0)} items</span>
        <span>${text(order.shippingAddress?.city || "")} ${text(order.shippingAddress?.provinceCode || "")}</span>
        <strong class="v2-money">${safeMoney(order.totalPriceSet)}</strong>
      </article>
    `).join("");

    document.querySelectorAll("[data-order-id]").forEach(row => {
      row.addEventListener("click", () => openOrder(V2.orders.find(o => o.id === row.dataset.orderId)));
    });
  }

  function openOrder(order) {
    if (!order) return;
    openDrawer("Order", order.name, `
      <section class="v2-detail-section">
        <div class="v2-detail-grid">
          <div><span>Customer</span><strong>${text(customerName(order.customer, order.email))}</strong></div>
          <div><span>Total</span><strong>${safeMoney(order.totalPriceSet)}</strong></div>
          <div><span>Payment</span><strong>${text(order.displayFinancialStatus || "—")}</strong></div>
          <div><span>Fulfillment</span><strong>${text(order.displayFulfillmentStatus || "—")}</strong></div>
          <div><span>Ordered</span><strong>${fmtDateTime(order.createdAt)}</strong></div>
          <div><span>Email</span><strong>${text(order.email || order.customer?.defaultEmailAddress?.emailAddress || "—")}</strong></div>
        </div>
      </section>
      <section class="v2-detail-section">
        <h3>Items</h3>
        ${(order.lineItems?.nodes || []).map(item => `
          <div class="v2-line-item">
            <div><strong>${text(item.name)}</strong><small>${text(item.variantTitle || "")} · Qty ${Number(item.quantity || 0)}</small></div>
            <strong>${safeMoney(item.discountedTotalSet || item.originalTotalSet)}</strong>
          </div>
        `).join("")}
      </section>
      <section class="v2-detail-section">
        <h3>Shipping</h3>
        <p>${addressHtml(order.shippingAddress)}</p>
      </section>
    `);
  }

  async function loadCustomers(force = false) {
    if (V2.loaded.customers && !force) return renderCustomers();
    setLoading($("customers-list"));
    try {
      const data = await apiJson("/api/admin-customers");
      V2.customers = data.customers || [];
      V2.loaded.customers = true;
      renderCustomers();
    } catch (error) { showListError("customers-list", error); }
  }

  function renderCustomers() {
    const q = ($("customers-search")?.value || "").toLowerCase().trim();
    const filter = $("customers-filter")?.value || "ALL";
    const customers = V2.customers.filter(c => {
      const spend = Number(c.amountSpent?.amount || 0);
      const orders = Number(c.numberOfOrders || 0);
      const hay = [c.firstName,c.lastName,c.defaultEmailAddress?.emailAddress,c.defaultPhoneNumber?.phoneNumber].join(" ").toLowerCase();
      const filterMatch = filter === "ALL" || (filter === "REPEAT" && orders > 1) || (filter === "VIP" && spend >= 500);
      return (!q || hay.includes(q)) && filterMatch;
    });

    $("customers-empty").hidden = !!customers.length;
    $("customers-list").innerHTML = customers.map(c => `
      <article class="v2-table-row is-clickable" data-customer-id="${text(c.id)}">
        <div class="v2-main"><strong>${text([c.firstName,c.lastName].filter(Boolean).join(" ") || "Unnamed Customer")}</strong><small>${text(c.defaultEmailAddress?.emailAddress || "No email")}</small></div>
        <span>${text(c.defaultPhoneNumber?.phoneNumber || "—")}</span>
        <span>${Number(c.numberOfOrders || 0)} orders</span>
        <span>${fmtDate(c.createdAt)}</span>
        <span>${(c.tags || []).slice(0,2).map(text).join(" · ") || "—"}</span>
        <strong class="v2-money">${money(c.amountSpent?.amount || 0)}</strong>
      </article>
    `).join("");
    document.querySelectorAll("[data-customer-id]").forEach(row => {
      row.addEventListener("click", () => openCustomer(V2.customers.find(c => c.id === row.dataset.customerId)));
    });
  }

  function openCustomer(c) {
    openDrawer("Customer", [c.firstName,c.lastName].filter(Boolean).join(" ") || "Customer", `
      <section class="v2-detail-section">
        <div class="v2-detail-grid">
          <div><span>Total Spend</span><strong>${money(c.amountSpent?.amount || 0)}</strong></div>
          <div><span>Orders</span><strong>${Number(c.numberOfOrders || 0)}</strong></div>
          <div><span>Email</span><strong>${text(c.defaultEmailAddress?.emailAddress || "—")}</strong></div>
          <div><span>Phone</span><strong>${text(c.defaultPhoneNumber?.phoneNumber || "—")}</strong></div>
          <div><span>Customer Since</span><strong>${fmtDate(c.createdAt)}</strong></div>
          <div><span>Tags</span><strong>${(c.tags || []).map(text).join(", ") || "—"}</strong></div>
        </div>
      </section>
      <section class="v2-detail-section"><h3>Default Address</h3><p>${addressHtml(c.defaultAddress)}</p></section>
    `);
  }

  async function loadDiscounts(force = false) {
    if (V2.loaded.discounts && !force) return renderDiscounts();
    setLoading($("discounts-list"));
    try {
      const data = await apiJson("/api/admin-discounts");
      V2.discounts = data.discounts || [];
      V2.loaded.discounts = true;
      renderDiscounts();
    } catch (error) { showListError("discounts-list", error); }
  }

  function renderDiscounts() {
    $("discounts-empty").hidden = !!V2.discounts.length;
    $("discounts-list").innerHTML = V2.discounts.map(d => `
      <article class="v2-table-row">
        <div class="v2-main"><strong>${text(d.title || "Discount")}</strong><small>${text(d.code || d.type || "")}</small></div>
        <span class="v2-status ${d.status === "ACTIVE" ? "is-live" : ""}">${text(d.status || "—")}</span>
        <span>${text(d.summary || "")}</span>
        <span>${d.startsAt ? fmtDate(d.startsAt) : "—"}</span>
        <span>${d.endsAt ? `Ends ${fmtDate(d.endsAt)}` : "No end"}</span>
        <span></span>
      </article>
    `).join("");
  }

  async function createDiscount() {
    const message = $("discount-message");
    const code = ($("discount-code").value || "").trim().toUpperCase();
    const percent = Number($("discount-percent").value || 0);
    if (!code || percent <= 0 || percent > 100) {
      message.textContent = "ENTER A CODE AND PERCENT BETWEEN 1–100.";
      return;
    }
    message.textContent = "CREATING...";
    try {
      await apiJson("/api/admin-discounts", {
        method:"POST",
        body:JSON.stringify({
          code,
          percent,
          usageLimit: $("discount-limit").value ? Number($("discount-limit").value) : null,
          endsAt: $("discount-end").value ? new Date($("discount-end").value).toISOString() : null,
          appliesOncePerCustomer: $("discount-once").checked,
        }),
      });
      $("discount-create-panel").hidden = true;
      $("discount-code").value = "";
      $("discount-percent").value = "";
      $("discount-limit").value = "";
      $("discount-end").value = "";
      $("discount-once").checked = false;
      message.textContent = "";
      V2.loaded.discounts = false;
      await loadDiscounts(true);
    } catch(error) { message.textContent = error.message; }
  }

  async function loadDraftOrders(force = false) {
    if (V2.loaded.drafts && !force) return renderDraftOrders();
    setLoading($("draft-orders-list"));
    try {
      const data = await apiJson("/api/admin-draft-orders");
      V2.drafts = data.draftOrders || [];
      V2.loaded.drafts = true;
      renderDraftOrders();
    } catch(error) { showListError("draft-orders-list", error); }
  }

  function renderDraftOrders() {
    $("draft-orders-empty").hidden = !!V2.drafts.length;
    $("draft-orders-list").innerHTML = V2.drafts.map(d => `
      <article class="v2-table-row">
        <div class="v2-main"><strong>${text(d.name)}</strong><small>${text(d.customer ? customerName(d.customer,d.email) : d.email || "No customer")} · ${fmtDateTime(d.createdAt)}</small></div>
        <span class="v2-status">${text(d.status)}</span>
        <span>${Number(d.totalQuantityOfLineItems || 0)} items</span>
        <span>${d.invoiceSentAt ? "Invoice sent" : "Not sent"}</span>
        <span></span>
        <strong class="v2-money">${safeMoney(d.totalPriceSet)}</strong>
      </article>
    `).join("");
  }

  function productVariantOptions() {
    const options = [];
    (window.ADMIN_PRODUCTS || []).filter(p => p.status !== "ARCHIVED").forEach(product => {
      (product.variants?.nodes || []).forEach(variant => {
        options.push(`<option value="${text(variant.id)}">${text(product.title)} — ${text(getVariantSize(variant))} — ${money(variant.price || 0)}</option>`);
      });
    });
    return options.join("");
  }

  function addDraftItemRow() {
    const row = document.createElement("div");
    row.className = "v2-draft-item-row";
    row.innerHTML = `
      <select class="draft-variant-select"><option value="">Choose product / size</option>${productVariantOptions()}</select>
      <input class="draft-item-qty" type="number" min="1" value="1" />
      <button type="button" aria-label="Remove item">×</button>
    `;
    row.querySelector("button").addEventListener("click", () => row.remove());
    $("draft-item-rows").appendChild(row);
  }

  async function createDraftOrder() {
    const message = $("draft-message");
    const items = [...document.querySelectorAll(".v2-draft-item-row")].map(row => ({
      variantId: row.querySelector(".draft-variant-select").value,
      quantity: Math.max(1, Number(row.querySelector(".draft-item-qty").value || 1)),
    })).filter(i => i.variantId);

    if (!items.length) { message.textContent = "ADD AT LEAST ONE PRODUCT."; return; }
    message.textContent = "CREATING...";
    try {
      const data = await apiJson("/api/admin-draft-orders", {
        method:"POST",
        body:JSON.stringify({
          email: $("draft-email").value.trim(),
          note: $("draft-note").value.trim(),
          lineItems: items,
        }),
      });
      $("draft-create-panel").hidden = true;
      $("draft-email").value = "";
      $("draft-note").value = "";
      $("draft-item-rows").innerHTML = "";
      message.textContent = "";
      V2.loaded.drafts = false;
      await loadDraftOrders(true);
      if (data.draftOrder?.invoiceUrl) {
        openDrawer("Draft Created", data.draftOrder.name || "Draft Order", `
          <section class="v2-detail-section">
            <p>The draft order was created successfully.</p>
            <p><a href="${text(data.draftOrder.invoiceUrl)}" target="_blank" rel="noopener">OPEN CUSTOMER CHECKOUT LINK</a></p>
          </section>
        `);
      }
    } catch(error) { message.textContent = error.message; }
  }

  async function loadAbandoned(force = false) {
    if (V2.loaded.abandoned && !force) return renderAbandoned();
    setLoading($("abandoned-list"));
    try {
      const data = await apiJson("/api/admin-abandoned");
      V2.abandoned = data.checkouts || [];
      V2.loaded.abandoned = true;
      renderAbandoned();
    } catch(error) { showListError("abandoned-list", error); }
  }

  function renderAbandoned() {
    $("abandoned-empty").hidden = !!V2.abandoned.length;
    $("abandoned-list").innerHTML = V2.abandoned.map(c => `
      <article class="v2-table-row">
        <div class="v2-main"><strong>${text(c.customer ? customerName(c.customer,c.email) : c.email || "Unknown Customer")}</strong><small>${text(c.email || "")} · ${fmtDateTime(c.createdAt)}</small></div>
        <span>${Number(c.lineItems?.nodes?.reduce((s,i)=>s+Number(i.quantity||0),0) || 0)} items</span>
        <span>${text((c.lineItems?.nodes || []).slice(0,2).map(i=>i.title).join(" / "))}</span>
        <span>${c.completedAt ? "Recovered" : "Abandoned"}</span>
        <span></span>
        <div class="v2-recovery-actions">
          <strong class="v2-money">${safeMoney(c.totalPriceSet)}</strong>
          ${c.recoveryUrl ? `<button type="button" data-copy-recovery="${text(c.recoveryUrl)}">Copy Link</button>` : ""}
        </div>
      </article>
    `).join("");
    document.querySelectorAll("[data-copy-recovery]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(btn.dataset.copyRecovery);
        const old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => btn.textContent = old, 1200);
      });
    });
  }

  function customerName(customer, fallback = "") {
    return [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || fallback || "Guest";
  }
  function statusClass(status = "") {
    const s = String(status).toLowerCase();
    return ["fulfilled","paid","active"].some(x => s.includes(x)) ? `is-${s.includes("fulfill") ? "fulfilled" : s.includes("paid") ? "paid" : "live"}` : "";
  }
  function addressHtml(a) {
    if (!a) return "No address available.";
    return [a.name, a.address1, a.address2, [a.city,a.provinceCode,a.zip].filter(Boolean).join(" "), a.country].filter(Boolean).map(text).join("<br>");
  }
  function setLoading(el, label = "Loading...") { if (el) el.innerHTML = `<div class="v2-empty-mini">${text(label)}</div>`; }
  function showListError(id, error) { const el=$(id); if(el) el.innerHTML=`<div class="v2-empty-mini">${text(error.message)}</div>`; }

  function openDrawer(kicker, title, body) {
    $("v2-drawer-kicker").textContent = kicker;
    $("v2-drawer-title").textContent = title;
    $("v2-drawer-body").innerHTML = body;
    $("v2-drawer-backdrop").hidden = false;
    $("v2-drawer").classList.add("is-open");
    $("v2-drawer").setAttribute("aria-hidden","false");
  }
  function closeDrawer() {
    $("v2-drawer").classList.remove("is-open");
    $("v2-drawer").setAttribute("aria-hidden","true");
    setTimeout(() => $("v2-drawer-backdrop").hidden = true, 200);
  }
})();
