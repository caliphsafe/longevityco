let ADMIN_PRODUCTS = [];
let ADMIN_COLLECTIONS = [];
let ADMIN_LOCATIONS = [];
let EDITING_PRODUCT = null;
let PENDING_IMAGES = [];

document.addEventListener("DOMContentLoaded", async () => {
  bindLogin();
  bindNavigation();
  bindEditor();
  bindFilters();
  await checkSession();
});

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (response.status === 401) {
    showLogin();
    throw new Error("Admin session expired.");
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }

  return data;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

function stripHtml(html = "") {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent || "";
}

function textToHtml(text = "") {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function showLogin() {
  document.getElementById("admin-login-screen").hidden = false;
  document.getElementById("admin-app").hidden = true;
}

function showApp(username = "CODY") {
  document.getElementById("admin-login-screen").hidden = true;
  document.getElementById("admin-app").hidden = false;
  document.getElementById("admin-user-label").textContent = String(username).toUpperCase();
}

async function checkSession() {
  try {
    const session = await apiJson("/api/admin-session");
    showApp(session.username);
    await loadAdminData();
  } catch {
    showLogin();
  }
}

function bindLogin() {
  const form = document.getElementById("admin-login-form");
  const message = document.getElementById("login-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "CHECKING ACCESS...";

    try {
      const data = await apiJson("/api/admin-login", {
        method: "POST",
        body: JSON.stringify({
          username: document.getElementById("login-username").value.trim(),
          password: document.getElementById("login-password").value,
        }),
      });
      form.reset();
      showApp(data.username);
      await loadAdminData();
      message.textContent = "";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.getElementById("admin-logout-btn").addEventListener("click", async () => {
    try {
      await apiJson("/api/admin-logout", { method: "POST", body: "{}" });
    } finally {
      showLogin();
    }
  });
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (view === "editor" && !EDITING_PRODUCT) resetEditor();
      switchView(view);
    });
  });

  document.getElementById("admin-home-btn").addEventListener("click", () => switchView("products"));
  document.getElementById("add-product-btn").addEventListener("click", () => {
    resetEditor();
    switchView("editor");
  });
  document.getElementById("cancel-editor-btn").addEventListener("click", () => {
    resetEditor();
    switchView("products");
  });
}

function switchView(view) {
  document.querySelectorAll(".admin-view").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === view);
  });

  document.querySelectorAll(".admin-nav-link").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });

  if (view === "inventory") renderInventory();
  if (view === "archive") renderArchive();
}

async function loadAdminData() {
  const [productsData, collectionsData, locationsData] = await Promise.all([
    apiJson("/api/admin-products"),
    apiJson("/api/admin-collections"),
    apiJson("/api/admin-locations"),
  ]);

  ADMIN_PRODUCTS = productsData.products || [];
  ADMIN_COLLECTIONS = collectionsData.collections || [];
  ADMIN_LOCATIONS = locationsData.locations || [];

  renderProductList();
  renderCollections();
  renderArchive();
  renderInventory();
}

function bindFilters() {
  document.getElementById("product-search").addEventListener("input", renderProductList);
  document.getElementById("product-status-filter").addEventListener("change", renderProductList);
  document.getElementById("refresh-inventory-btn").addEventListener("click", async () => {
    await loadAdminData();
  });
}

function renderProductList() {
  const wrap = document.getElementById("admin-product-list");
  const empty = document.getElementById("products-empty");
  const q = document.getElementById("product-search").value.trim().toLowerCase();
  const status = document.getElementById("product-status-filter").value;

  const products = ADMIN_PRODUCTS.filter((product) => {
    const matchesSearch =
      !q ||
      String(product.title || "").toLowerCase().includes(q) ||
      String(product.handle || "").toLowerCase().includes(q) ||
      String(product.productType || "").toLowerCase().includes(q);

    const matchesStatus = status === "ALL" || product.status === status;
    return matchesSearch && matchesStatus;
  });

  wrap.innerHTML = "";
  empty.hidden = products.length > 0;

  products.forEach((product) => {
    wrap.appendChild(buildProductRow(product));
  });
}

function buildProductRow(product) {
  const row = document.createElement("article");
  row.className = "admin-product-row";

  const image = product.featuredImage?.url || product.media?.nodes?.[0]?.preview?.image?.url || "";
  const variants = product.variants?.nodes || [];
  const stockText = variants
    .slice(0, 6)
    .map((variant) => {
      const size = getVariantSize(variant);
      return `${size} ${variant.inventoryQuantity ?? 0}`;
    })
    .join(" · ");

  const collections = (product.collections?.nodes || []).map((c) => c.title).join(" / ");

  row.innerHTML = `
    <div class="admin-product-image">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" />` : ""}
    </div>

    <div class="admin-product-info">
      <h3>${escapeHtml(product.title)}</h3>
      <p>${escapeHtml(product.productType || "Product")} · ${escapeHtml(getProductPrice(product))}</p>
    </div>

    <div class="admin-product-stock">${escapeHtml(stockText || "No variants")}</div>
    <div class="admin-product-collections">${escapeHtml(collections || "No collection")}</div>

    <div>
      <div class="admin-product-status">${escapeHtml(product.status)}</div>
      <div class="admin-product-actions">
        <button type="button" data-edit-product="${escapeHtml(product.id)}">Edit</button>
        ${
          product.status === "ARCHIVED"
            ? `<button type="button" data-restore-product="${escapeHtml(product.id)}">Restore</button>`
            : `<button type="button" data-archive-product="${escapeHtml(product.id)}">Archive</button>`
        }
      </div>
    </div>
  `;

  row.querySelector("[data-edit-product]")?.addEventListener("click", () => openEditor(product.id));
  row.querySelector("[data-archive-product]")?.addEventListener("click", () => setProductStatus(product.id, "ARCHIVED"));
  row.querySelector("[data-restore-product]")?.addEventListener("click", () => setProductStatus(product.id, "ACTIVE"));

  return row;
}

function getVariantSize(variant) {
  const selected = (variant.selectedOptions || []).find((option) =>
    ["size", "title"].includes(String(option.name || "").toLowerCase())
  );
  return selected?.value || variant.title || "Default";
}

function getProductPrice(product) {
  const amount = product.variants?.nodes?.[0]?.price || 0;
  return money(amount);
}

async function setProductStatus(productId, status) {
  if (status === "ARCHIVED" && !window.confirm("Archive this product?")) return;

  try {
    await apiJson("/api/admin-product-status", {
      method: "POST",
      body: JSON.stringify({ productId, status }),
    });
    await loadAdminData();
  } catch (error) {
    alert(error.message);
  }
}

function renderArchive() {
  const wrap = document.getElementById("admin-archive-list");
  const empty = document.getElementById("archive-empty");
  const archived = ADMIN_PRODUCTS.filter((p) => p.status === "ARCHIVED");

  wrap.innerHTML = "";
  empty.hidden = archived.length > 0;
  archived.forEach((product) => wrap.appendChild(buildProductRow(product)));
}

function bindEditor() {
  document.querySelectorAll("[data-size-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setVariantRows(btn.dataset.sizePreset.split(",").map((name) => ({ name, quantity: 0 })));
    });
  });

  document.getElementById("add-custom-size-btn").addEventListener("click", () => {
    const current = collectVariantRows();
    current.push({ name: "", quantity: 0 });
    setVariantRows(current);
  });

  document.getElementById("apply-all-inventory").addEventListener("click", () => {
    const quantity = Math.max(0, Number(document.getElementById("set-all-inventory").value || 0));
    document.querySelectorAll(".variant-quantity").forEach((input) => {
      input.value = quantity;
    });
    updateReview();
  });

  document.getElementById("product-images").addEventListener("change", (event) => {
    addPendingFiles(Array.from(event.target.files || []));
    event.target.value = "";
  });

  const zone = document.getElementById("admin-upload-zone");
  zone.addEventListener("dragover", (event) => event.preventDefault());
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    addPendingFiles(Array.from(event.dataTransfer.files || []).filter((f) => f.type.startsWith("image/")));
  });

  ["product-title", "product-price", "product-type", "product-status", "product-vendor", "product-description"]
    .forEach((id) => document.getElementById(id).addEventListener("input", updateReview));

  document.getElementById("save-draft-btn").addEventListener("click", async () => {
    document.getElementById("product-status").value = "DRAFT";
    await submitProduct();
  });

  document.getElementById("product-editor-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitProduct();
  });
}

function setVariantRows(items) {
  const wrap = document.getElementById("variant-rows");
  wrap.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-variant-row";
    row.innerHTML = `
      <input class="variant-name" type="text" value="${escapeHtml(item.name || "")}" placeholder="Size" />
      <input class="variant-quantity" type="number" min="0" step="1" value="${Number(item.quantity || 0)}" />
      <button type="button" aria-label="Remove size">×</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      row.remove();
      updateReview();
    });
    row.querySelectorAll("input").forEach((input) => input.addEventListener("input", updateReview));
    wrap.appendChild(row);
  });

  updateReview();
}

function collectVariantRows() {
  return Array.from(document.querySelectorAll(".admin-variant-row"))
    .map((row) => ({
      name: row.querySelector(".variant-name").value.trim(),
      quantity: Math.max(0, Number(row.querySelector(".variant-quantity").value || 0)),
      variantId: row.dataset.variantId || "",
    }))
    .filter((item) => item.name);
}

function renderCollections(selectedIds = null) {
  const wrap = document.getElementById("collection-grid");
  if (!wrap) return;

  const selected = new Set(
    selectedIds ||
      ADMIN_COLLECTIONS.filter((collection) => collection.handle === "shop-all").map((collection) => collection.id)
  );

  wrap.innerHTML = ADMIN_COLLECTIONS.map((collection) => `
    <label class="admin-collection-option">
      <input type="checkbox" value="${escapeHtml(collection.id)}" ${selected.has(collection.id) ? "checked" : ""} />
      <span>${escapeHtml(collection.title)}</span>
    </label>
  `).join("");

  wrap.querySelectorAll("input").forEach((input) => input.addEventListener("change", updateReview));
}

function getSelectedCollectionIds() {
  return Array.from(document.querySelectorAll("#collection-grid input:checked")).map((input) => input.value);
}

function resetEditor() {
  EDITING_PRODUCT = null;
  PENDING_IMAGES = [];

  document.getElementById("editor-product-id").value = "";
  document.getElementById("editor-kicker").textContent = "New Product";
  document.getElementById("editor-title").textContent = "Add Product";
  document.getElementById("product-title").value = "";
  document.getElementById("product-price").value = "";
  document.getElementById("product-type").value = "Tops";
  document.getElementById("product-status").value = "DRAFT";
  document.getElementById("product-vendor").value = "Longevity Co.";
  document.getElementById("product-description").value = "";
  document.getElementById("editor-message").textContent = "";

  setVariantRows([
    { name: "S", quantity: 0 },
    { name: "M", quantity: 0 },
    { name: "L", quantity: 0 },
    { name: "XL", quantity: 0 },
  ]);
  renderCollections();
  renderImagePreviews();
  updateReview();
}

async function openEditor(productId) {
  switchView("editor");
  const message = document.getElementById("editor-message");
  message.textContent = "LOADING PRODUCT...";

  try {
    const data = await apiJson(`/api/admin-product?id=${encodeURIComponent(productId)}`);
    const product = data.product;
    EDITING_PRODUCT = product;

    document.getElementById("editor-product-id").value = product.id;
    document.getElementById("editor-kicker").textContent = "Edit Product";
    document.getElementById("editor-title").textContent = product.title;
    document.getElementById("product-title").value = product.title || "";
    document.getElementById("product-price").value = product.variants?.nodes?.[0]?.price || "";
    document.getElementById("product-type").value =
      Array.from(document.getElementById("product-type").options).some((o) => o.value === product.productType)
        ? product.productType
        : "Product";
    document.getElementById("product-status").value = product.status === "ARCHIVED" ? "DRAFT" : product.status;
    document.getElementById("product-vendor").value = product.vendor || "Longevity Co.";
    document.getElementById("product-description").value = stripHtml(product.descriptionHtml || "");

    const variants = (product.variants?.nodes || []).map((variant) => ({
      name: getVariantSize(variant),
      quantity: variant.inventoryQuantity || 0,
      variantId: variant.id,
    }));

    setVariantRows(variants.length ? variants : [{ name: "Default", quantity: 0 }]);
    document.querySelectorAll(".admin-variant-row").forEach((row, index) => {
      row.dataset.variantId = variants[index]?.variantId || "";
    });

    renderCollections((product.collections?.nodes || []).map((c) => c.id));

    PENDING_IMAGES = (product.media?.nodes || [])
      .map((media, index) => ({
        id: `existing-${index}`,
        existing: true,
        fileId: media.id,
        url: media.preview?.image?.url || media.image?.url || "",
        alt: media.alt || product.title,
        name: `existing-${index}.jpg`,
      }))
      .filter((item) => item.url);

    renderImagePreviews();
    updateReview();
    message.textContent = "";
  } catch (error) {
    message.textContent = error.message;
  }
}

function addPendingFiles(files) {
  files.forEach((file) => {
    PENDING_IMAGES.push({
      id: `new-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
      existing: false,
      file,
      url: URL.createObjectURL(file),
      alt: document.getElementById("product-title").value || file.name,
      name: file.name,
    });
  });
  renderImagePreviews();
  updateReview();
}

function renderImagePreviews() {
  const wrap = document.getElementById("image-preview-grid");
  wrap.innerHTML = "";

  PENDING_IMAGES.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "admin-image-preview";
    card.draggable = true;
    card.dataset.id = item.id;

    card.innerHTML = `
      <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || "")}" />
      <span class="image-order">${index === 0 ? "1 COVER" : index === 1 ? "2 HOVER" : `${index + 1}`}</span>
      <button type="button" aria-label="Remove image">×</button>
    `;

    card.querySelector("button").addEventListener("click", () => {
      PENDING_IMAGES = PENDING_IMAGES.filter((image) => image.id !== item.id);
      renderImagePreviews();
      updateReview();
    });

    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.id);
    });

    card.addEventListener("dragover", (event) => event.preventDefault());
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      const sourceId = event.dataTransfer.getData("text/plain");
      const from = PENDING_IMAGES.findIndex((image) => image.id === sourceId);
      const to = PENDING_IMAGES.findIndex((image) => image.id === item.id);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = PENDING_IMAGES.splice(from, 1);
      PENDING_IMAGES.splice(to, 0, moved);
      renderImagePreviews();
      updateReview();
    });

    wrap.appendChild(card);
  });
}

function updateReview() {
  const title = document.getElementById("product-title").value.trim() || "UNTITLED PRODUCT";
  const price = money(document.getElementById("product-price").value || 0);
  const variants = collectVariantRows();
  const selectedCollections = ADMIN_COLLECTIONS.filter((c) => getSelectedCollectionIds().includes(c.id));

  document.getElementById("admin-review-card").innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(price)}</span>
    <span>${escapeHtml(variants.map((v) => `${v.name} ${v.quantity}`).join(" · ") || "NO SIZES")}</span>
    <span>${escapeHtml(selectedCollections.map((c) => c.title).join(" / ") || "NO COLLECTION")}</span>
    <span>${PENDING_IMAGES.length} IMAGE${PENDING_IMAGES.length === 1 ? "" : "S"}</span>
  `;
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadPendingImages(title) {
  const result = [];

  for (let i = 0; i < PENDING_IMAGES.length; i += 1) {
    const item = PENDING_IMAGES[i];

    if (item.existing) {
      result.push({
        id: item.fileId,
        alt: item.alt || title,
      });
      continue;
    }

    const dataUrl = await fileToDataUrl(item.file);
    const uploaded = await apiJson("/api/admin-upload", {
      method: "POST",
      body: JSON.stringify({
        filename: item.file.name,
        mimeType: item.file.type || "image/jpeg",
        dataUrl,
      }),
    });

    result.push({
      originalSource: uploaded.resourceUrl,
      filename: item.file.name,
      contentType: "IMAGE",
      alt: title,
    });
  }

  return result;
}

async function submitProduct() {
  const message = document.getElementById("editor-message");
  const title = document.getElementById("product-title").value.trim();
  const price = Number(document.getElementById("product-price").value || 0);
  const variants = collectVariantRows();

  if (!title) {
    message.textContent = "PRODUCT NAME IS REQUIRED.";
    return;
  }

  if (!variants.length) {
    message.textContent = "ADD AT LEAST ONE SIZE.";
    return;
  }

  message.textContent = "UPLOADING / SAVING TO SHOPIFY...";

  try {
    const files = await uploadPendingImages(title);

    const payload = {
      productId: document.getElementById("editor-product-id").value || null,
      title,
      descriptionHtml: textToHtml(document.getElementById("product-description").value),
      productType: document.getElementById("product-type").value,
      status: document.getElementById("product-status").value,
      vendor: document.getElementById("product-vendor").value.trim() || "Longevity Co.",
      price,
      locationId: ADMIN_LOCATIONS[0]?.id || null,
      collectionIds: getSelectedCollectionIds(),
      sizes: variants,
      files,
    };

    const saved = await apiJson("/api/admin-product-save", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    message.textContent = `SAVED: ${saved.product?.title || title}`;
    await loadAdminData();
    setTimeout(() => {
      resetEditor();
      switchView("products");
    }, 800);
  } catch (error) {
    message.textContent = error.message;
  }
}

function renderInventory() {
  const wrap = document.getElementById("admin-inventory-list");
  wrap.innerHTML = "";

  ADMIN_PRODUCTS
    .filter((product) => product.status !== "ARCHIVED")
    .forEach((product) => {
      const row = document.createElement("article");
      row.className = "admin-inventory-row";
      const image = product.featuredImage?.url || "";
      const variants = product.variants?.nodes || [];

      row.innerHTML = `
        <div>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" />` : ""}</div>
        <div>
          <strong>${escapeHtml(product.title)}</strong>
          <div class="admin-kicker">${escapeHtml(product.productType || "Product")}</div>
        </div>
        <div class="admin-inventory-variants"></div>
      `;

      const variantsWrap = row.querySelector(".admin-inventory-variants");

      variants.forEach((variant) => {
        const editor = document.createElement("div");
        editor.className = "admin-stock-editor";
        editor.innerHTML = `
          <span>${escapeHtml(getVariantSize(variant))}</span>
          <input type="number" min="0" step="1" value="${Number(variant.inventoryQuantity || 0)}" />
          <button type="button">Save</button>
        `;

        editor.querySelector("button").addEventListener("click", async () => {
          const locationId = ADMIN_LOCATIONS[0]?.id;
          if (!locationId) return alert("No Shopify inventory location found.");

          try {
            editor.querySelector("button").textContent = "...";
            await apiJson("/api/admin-inventory-update", {
              method: "POST",
              body: JSON.stringify({
                inventoryItemId: variant.inventoryItem?.id,
                locationId,
                quantity: Math.max(0, Number(editor.querySelector("input").value || 0)),
              }),
            });
            editor.querySelector("button").textContent = "Saved";
            setTimeout(() => (editor.querySelector("button").textContent = "Save"), 800);
          } catch (error) {
            alert(error.message);
            editor.querySelector("button").textContent = "Save";
          }
        });

        variantsWrap.appendChild(editor);
      });

      wrap.appendChild(row);
    });
}
