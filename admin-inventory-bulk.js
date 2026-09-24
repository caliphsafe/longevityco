(() => {
  const STATE = {
    selected: new Set(),
    initial: new Map(),
    draft: new Map(),
    meta: new Map(),
    search: "",
    filter: "ALL",
    category: "ALL",
    sort: "title-asc",
    installed: false,
    saving: false,
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function qty(value) {
    return Math.max(0, Math.floor(Number(value || 0)));
  }

  function stockTotal(product) {
    return (product?.variants?.nodes || [])
      .reduce((sum, variant) => sum + qty(currentQty(variant)), 0);
  }

  function currentQty(variant) {
    const key = variant?.inventoryItem?.id;
    if (key && STATE.draft.has(key)) return STATE.draft.get(key);
    return qty(variant?.inventoryQuantity);
  }

  function categoryValues() {
    return [...new Set(
      (typeof ADMIN_PRODUCTS !== "undefined" ? ADMIN_PRODUCTS : [])
        .filter((product) => product.status !== "ARCHIVED")
        .map((product) => String(product.productType || "Product").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }

  function buildWorkspace() {
    const view = $("view-inventory");
    if (!view) return false;

    if (!$("inventory-bulk-workspace")) {
      const head = view.querySelector(".admin-page-head");
      head?.insertAdjacentHTML("afterend", `
        <section class="inventory-bulk-workspace" id="inventory-bulk-workspace">
          <div class="inventory-bulk-toolbar">
            <input id="inventory-bulk-search" type="search" placeholder="Search product, category, or size" />
            <select id="inventory-bulk-category">
              <option value="ALL">All categories</option>
            </select>
            <select id="inventory-bulk-filter">
              <option value="ALL">All stock</option>
              <option value="IN">In stock</option>
              <option value="LOW">Low stock (1–5)</option>
              <option value="OUT">Out of stock</option>
            </select>
            <select id="inventory-bulk-sort">
              <option value="title-asc">Product A–Z</option>
              <option value="title-desc">Product Z–A</option>
              <option value="stock-asc">Lowest total stock</option>
              <option value="stock-desc">Highest total stock</option>
              <option value="changed">Changed first</option>
            </select>
          </div>

          <div class="inventory-bulk-summary">
            <span><strong id="inventory-visible-count">0</strong> visible variants</span>
            <span><strong id="inventory-selected-count">0</strong> selected</span>
            <span><strong id="inventory-changed-count">0</strong> changed</span>
          </div>

          <div class="inventory-bulk-actions">
            <button type="button" id="inventory-select-visible">Select Visible</button>
            <button type="button" id="inventory-clear-selection">Clear Selection</button>

            <label class="inventory-bulk-set">
              <span>Set selected to</span>
              <input id="inventory-bulk-quantity" type="number" min="0" step="1" value="0" />
              <button type="button" id="inventory-apply-quantity">Apply</button>
            </label>

            <div class="inventory-bulk-adjust">
              <button type="button" id="inventory-minus-one">−1 Selected</button>
              <button type="button" id="inventory-plus-one">+1 Selected</button>
            </div>

            <div class="inventory-bulk-save-actions">
              <button type="button" id="inventory-save-selected">Save Selected</button>
              <button type="button" id="inventory-save-changed" class="is-primary">Save All Changes</button>
            </div>
          </div>

          <p class="inventory-bulk-message" id="inventory-bulk-message" aria-live="polite"></p>
        </section>
      `);
    }

    refreshCategoryOptions();
    bindWorkspace();
    return true;
  }

  function refreshCategoryOptions() {
    const select = $("inventory-bulk-category");
    if (!select) return;
    const current = select.value || "ALL";
    const options = categoryValues();
    select.innerHTML = `<option value="ALL">All categories</option>` +
      options.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join("");
    select.value = options.includes(current) ? current : "ALL";
  }

  function bindWorkspace() {
    const bindOnce = (id, event, handler) => {
      const el = $(id);
      if (!el || el.dataset.inventoryBound) return;
      el.dataset.inventoryBound = "true";
      el.addEventListener(event, handler);
    };

    bindOnce("inventory-bulk-search", "input", (event) => {
      STATE.search = event.target.value || "";
      renderInventoryBulk();
    });
    bindOnce("inventory-bulk-category", "change", (event) => {
      STATE.category = event.target.value || "ALL";
      renderInventoryBulk();
    });
    bindOnce("inventory-bulk-filter", "change", (event) => {
      STATE.filter = event.target.value || "ALL";
      renderInventoryBulk();
    });
    bindOnce("inventory-bulk-sort", "change", (event) => {
      STATE.sort = event.target.value || "title-asc";
      renderInventoryBulk();
    });
    bindOnce("inventory-select-visible", "click", selectVisible);
    bindOnce("inventory-clear-selection", "click", () => {
      STATE.selected.clear();
      renderInventoryBulk();
    });
    bindOnce("inventory-apply-quantity", "click", () => {
      applyToSelected(qty($("inventory-bulk-quantity")?.value));
    });
    bindOnce("inventory-minus-one", "click", () => adjustSelected(-1));
    bindOnce("inventory-plus-one", "click", () => adjustSelected(1));
    bindOnce("inventory-save-selected", "click", saveSelected);
    bindOnce("inventory-save-changed", "click", saveChanged);
  }

  function hydrateState() {
    const valid = new Set();

    for (const product of (typeof ADMIN_PRODUCTS !== "undefined" ? ADMIN_PRODUCTS : [])) {
      if (product.status === "ARCHIVED") continue;

      for (const variant of (product.variants?.nodes || [])) {
        const key = variant.inventoryItem?.id;
        if (!key) continue;

        valid.add(key);
        STATE.meta.set(key, { product, variant });

        if (!STATE.initial.has(key)) {
          STATE.initial.set(key, qty(variant.inventoryQuantity));
        }

        if (!STATE.draft.has(key)) {
          STATE.draft.set(key, qty(variant.inventoryQuantity));
        }
      }
    }

    for (const key of [...STATE.selected]) {
      if (!valid.has(key)) STATE.selected.delete(key);
    }
    for (const key of [...STATE.initial.keys()]) {
      if (!valid.has(key)) {
        STATE.initial.delete(key);
        STATE.draft.delete(key);
        STATE.meta.delete(key);
      }
    }
  }

  function isChanged(key) {
    return STATE.draft.has(key) &&
      STATE.initial.has(key) &&
      qty(STATE.draft.get(key)) !== qty(STATE.initial.get(key));
  }

  function matchesStock(value) {
    const n = qty(value);
    if (STATE.filter === "OUT") return n === 0;
    if (STATE.filter === "LOW") return n >= 1 && n <= 5;
    if (STATE.filter === "IN") return n > 0;
    return true;
  }

  function visibleProducts() {
    hydrateState();

    const q = STATE.search.trim().toLowerCase();

    let rows = (typeof ADMIN_PRODUCTS !== "undefined" ? ADMIN_PRODUCTS : [])
      .filter((product) => product.status !== "ARCHIVED")
      .filter((product) =>
        STATE.category === "ALL" ||
        String(product.productType || "Product") === STATE.category
      )
      .map((product) => {
        const productHaystack = [
          product.title,
          product.handle,
          product.productType,
        ].join(" ").toLowerCase();

        const productMatches = !q || productHaystack.includes(q);

        const variants = (product.variants?.nodes || []).filter((variant) => {
          const key = variant.inventoryItem?.id;
          if (!key) return false;

          const size = String(
            typeof getVariantSize === "function"
              ? getVariantSize(variant)
              : variant.title || "Default"
          );

          const searchMatches = productMatches || size.toLowerCase().includes(q);
          return searchMatches && matchesStock(currentQty(variant));
        });

        return { product, variants };
      })
      .filter((row) => row.variants.length);

    rows.sort((a, b) => {
      if (STATE.sort === "title-desc") {
        return String(b.product.title || "").localeCompare(String(a.product.title || ""), undefined, { numeric: true, sensitivity: "base" });
      }
      if (STATE.sort === "stock-asc") return stockTotal(a.product) - stockTotal(b.product);
      if (STATE.sort === "stock-desc") return stockTotal(b.product) - stockTotal(a.product);
      if (STATE.sort === "changed") {
        const ac = a.variants.some((variant) => isChanged(variant.inventoryItem?.id)) ? 1 : 0;
        const bc = b.variants.some((variant) => isChanged(variant.inventoryItem?.id)) ? 1 : 0;
        if (ac !== bc) return bc - ac;
      }
      return String(a.product.title || "").localeCompare(String(b.product.title || ""), undefined, { numeric: true, sensitivity: "base" });
    });

    return rows;
  }

  function renderInventoryBulk() {
    if (!buildWorkspace()) return;

    const wrap = $("admin-inventory-list");
    if (!wrap) return;

    const rows = visibleProducts();
    wrap.innerHTML = "";

    const visibleKeys = [];

    rows.forEach(({ product, variants }) => {
      const image = product.featuredImage?.url || "";
      const total = variants.reduce((sum, variant) => sum + currentQty(variant), 0);
      const allSelected = variants.every((variant) => STATE.selected.has(variant.inventoryItem?.id));

      const row = document.createElement("article");
      row.className = "admin-inventory-row inventory-bulk-product-row";
      row.dataset.inventoryProduct = product.id;

      row.innerHTML = `
        <label class="inventory-product-select">
          <input type="checkbox" ${allSelected ? "checked" : ""} />
          <span></span>
        </label>

        <div class="inventory-product-image">
          ${image ? `<img src="${esc(image)}" alt="${esc(product.title)}" />` : ""}
        </div>

        <div class="inventory-product-info">
          <strong>${esc(product.title)}</strong>
          <div class="admin-kicker">${esc(product.productType || "Product")}</div>
          <small>${variants.length} size${variants.length === 1 ? "" : "s"} shown · ${total} units shown</small>
        </div>

        <div class="admin-inventory-variants"></div>
      `;

      const productCheckbox = row.querySelector(".inventory-product-select input");
      productCheckbox.addEventListener("change", () => {
        variants.forEach((variant) => {
          const key = variant.inventoryItem?.id;
          if (!key) return;
          if (productCheckbox.checked) STATE.selected.add(key);
          else STATE.selected.delete(key);
        });
        renderInventoryBulk();
      });

      const variantsWrap = row.querySelector(".admin-inventory-variants");

      variants.forEach((variant) => {
        const key = variant.inventoryItem?.id;
        if (!key) return;
        visibleKeys.push(key);

        const size = typeof getVariantSize === "function"
          ? getVariantSize(variant)
          : (variant.title || "Default");

        const value = currentQty(variant);
        const changed = isChanged(key);

        const editor = document.createElement("div");
        editor.className = `admin-stock-editor inventory-bulk-variant ${changed ? "is-changed" : ""} ${STATE.selected.has(key) ? "is-selected" : ""}`;
        editor.dataset.inventoryItemId = key;

        editor.innerHTML = `
          <label class="inventory-variant-check">
            <input type="checkbox" ${STATE.selected.has(key) ? "checked" : ""} />
            <span>${esc(size)}</span>
          </label>
          <input
            class="inventory-qty-input"
            type="number"
            min="0"
            step="1"
            value="${value}"
            aria-label="${esc(product.title)} ${esc(size)} inventory"
          />
          <div class="inventory-variant-footer">
            <span class="inventory-change-state">${changed ? "Changed" : `${qty(STATE.initial.get(key))} saved`}</span>
            <button type="button" class="inventory-save-one">${changed ? "Save" : "Saved"}</button>
          </div>
        `;

        const checkbox = editor.querySelector(".inventory-variant-check input");
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) STATE.selected.add(key);
          else STATE.selected.delete(key);
          editor.classList.toggle("is-selected", checkbox.checked);
          syncSummary(visibleKeys);
          syncProductCheckbox(row, variants);
        });

        const input = editor.querySelector(".inventory-qty-input");
        input.addEventListener("input", () => {
          const next = qty(input.value);
          input.value = String(next);
          STATE.draft.set(key, next);
          const dirty = isChanged(key);
          editor.classList.toggle("is-changed", dirty);
          editor.querySelector(".inventory-change-state").textContent =
            dirty ? "Changed" : `${qty(STATE.initial.get(key))} saved`;
          editor.querySelector(".inventory-save-one").textContent = dirty ? "Save" : "Saved";
          syncSummary(visibleKeys);
        });

        editor.querySelector(".inventory-save-one").addEventListener("click", async () => {
          if (!isChanged(key)) return;
          await saveKeys([key], editor.querySelector(".inventory-save-one"));
        });

        variantsWrap.appendChild(editor);
      });

      wrap.appendChild(row);
    });

    if (!rows.length) {
      wrap.innerHTML = `<div class="admin-empty">No inventory matches these filters.</div>`;
    }

    STATE.visibleKeys = visibleKeys;
    syncSummary(visibleKeys);
  }

  function syncProductCheckbox(row, variants) {
    const checkbox = row.querySelector(".inventory-product-select input");
    if (!checkbox) return;
    const keys = variants.map((variant) => variant.inventoryItem?.id).filter(Boolean);
    const selected = keys.filter((key) => STATE.selected.has(key)).length;
    checkbox.checked = !!keys.length && selected === keys.length;
    checkbox.indeterminate = selected > 0 && selected < keys.length;
  }

  function syncSummary(visibleKeys = STATE.visibleKeys || []) {
    const changed = [...STATE.draft.keys()].filter(isChanged).length;
    if ($("inventory-visible-count")) $("inventory-visible-count").textContent = String(visibleKeys.length);
    if ($("inventory-selected-count")) $("inventory-selected-count").textContent = String(STATE.selected.size);
    if ($("inventory-changed-count")) $("inventory-changed-count").textContent = String(changed);

    const saveSelected = $("inventory-save-selected");
    const saveChanged = $("inventory-save-changed");

    if (saveSelected) {
      const selectedDirty = [...STATE.selected].filter(isChanged).length;
      saveSelected.disabled = STATE.saving || selectedDirty === 0;
      saveSelected.textContent = selectedDirty ? `Save Selected (${selectedDirty})` : "Save Selected";
    }

    if (saveChanged) {
      saveChanged.disabled = STATE.saving || changed === 0;
      saveChanged.textContent = changed ? `Save All Changes (${changed})` : "Save All Changes";
    }
  }

  function selectVisible() {
    (STATE.visibleKeys || []).forEach((key) => STATE.selected.add(key));
    renderInventoryBulk();
  }

  function applyToSelected(value) {
    if (!STATE.selected.size) {
      setMessage("Select at least one size first.", true);
      return;
    }

    for (const key of STATE.selected) {
      if (STATE.draft.has(key)) STATE.draft.set(key, qty(value));
    }

    renderInventoryBulk();
    setMessage(`Set ${STATE.selected.size} selected size${STATE.selected.size === 1 ? "" : "s"} to ${qty(value)}. Review, then save.`);
  }

  function adjustSelected(delta) {
    if (!STATE.selected.size) {
      setMessage("Select at least one size first.", true);
      return;
    }

    for (const key of STATE.selected) {
      if (!STATE.draft.has(key)) continue;
      STATE.draft.set(key, Math.max(0, qty(STATE.draft.get(key)) + delta));
    }

    renderInventoryBulk();
    setMessage(`${delta > 0 ? "Added" : "Removed"} 1 unit across ${STATE.selected.size} selected size${STATE.selected.size === 1 ? "" : "s"}.`);
  }

  function setMessage(message = "", isError = false) {
    const el = $("inventory-bulk-message");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("is-error", !!isError);
  }

  function updatesFor(keys) {
    const locationId = (typeof ADMIN_LOCATIONS !== "undefined" ? ADMIN_LOCATIONS?.[0]?.id : null);
    if (!locationId) throw new Error("No Shopify inventory location found.");

    return keys
      .filter((key) => isChanged(key))
      .map((key) => ({
        inventoryItemId: key,
        locationId,
        quantity: qty(STATE.draft.get(key)),
      }));
  }

  async function saveKeys(keys, button = null) {
    if (STATE.saving) return;

    let updates;
    try {
      updates = updatesFor(keys);
    } catch (error) {
      setMessage(error.message, true);
      return;
    }

    if (!updates.length) {
      setMessage("No inventory changes to save.");
      return;
    }

    STATE.saving = true;
    syncSummary();

    const original = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = "...";
    }

    setMessage(`Saving ${updates.length} inventory change${updates.length === 1 ? "" : "s"} to Shopify...`);

    try {
      const result = await apiJson("/api/admin-inventory-update", {
        method: "POST",
        body: JSON.stringify({ updates }),
      });

      for (const update of updates) {
        STATE.initial.set(update.inventoryItemId, update.quantity);
        STATE.draft.set(update.inventoryItemId, update.quantity);

        const meta = STATE.meta.get(update.inventoryItemId);
        if (meta?.variant) meta.variant.inventoryQuantity = update.quantity;
      }

      setMessage(`Saved ${result.updated ?? updates.length} inventory change${updates.length === 1 ? "" : "s"} to Shopify.`);
      renderInventoryBulk();
    } catch (error) {
      setMessage(error.message || "Unable to save inventory.", true);
      if (button) button.textContent = original || "Save";
    } finally {
      STATE.saving = false;
      syncSummary();
      if (button) button.disabled = false;
    }
  }

  async function saveSelected() {
    await saveKeys([...STATE.selected]);
  }

  async function saveChanged() {
    await saveKeys([...STATE.draft.keys()].filter(isChanged));
  }

  function install() {
    if (STATE.installed) return true;
    if (!buildWorkspace()) return false;
    if (typeof renderInventory !== "function") return false;

    renderInventory = renderInventoryBulk;

    // Keep the Inventory workspace synced whenever the main admin data reloads.
    if (typeof loadAdminData === "function" && !loadAdminData.__inventoryBulkWrapped) {
      const originalLoadAdminData = loadAdminData;
      loadAdminData = async function(...args) {
        const result = await originalLoadAdminData.apply(this, args);
        refreshCategoryOptions();
        renderInventoryBulk();
        return result;
      };
      loadAdminData.__inventoryBulkWrapped = true;
    }

    STATE.installed = true;
    refreshCategoryOptions();
    renderInventoryBulk();
    return true;
  }

  function boot() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries > 120) clearInterval(timer);
    }, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
