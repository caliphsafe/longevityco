(() => {
  const STATE = { models: [], loaded: false, loading: false, editingId: null };
  const $ = (id) => document.getElementById(id);
  const esc = (v = "") => String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const STATUSES = ["Applicant", "Roster", "Hold", "Archived"];
  let installed = false;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries > 120) clearInterval(timer);
    }, 60);
  });

  function install() {
    if (installed) return true;
    const main = document.querySelector(".admin-main");
    if (!main || typeof apiJson !== "function") return false;

    ensureView(main);
    bindControls();
    installed = true;
    return true;
  }

  function ensureView(main) {
    if ($("view-models")) return;

    main.insertAdjacentHTML("beforeend", `
      <section class="admin-view models-admin-view" id="view-models" data-view-panel="models">
        <div class="admin-page-head models-page-head">
          <div><p class="admin-kicker">Casting Roster</p><h1>Models</h1></div>
          <div class="models-head-actions">
            <button class="admin-text-btn" id="models-refresh-btn" type="button">Refresh</button>
            <button class="admin-primary-link" id="models-add-btn" type="button">+ Add Model</button>
          </div>
        </div>

        <div class="models-metrics" id="models-metrics">
          <article><span>Total</span><strong>—</strong></article>
          <article><span>Roster</span><strong>—</strong></article>
          <article><span>Applicants</span><strong>—</strong></article>
          <article><span>Archived</span><strong>—</strong></article>
        </div>

        <div class="models-toolbar">
          <input id="models-search" type="search" placeholder="Search name, email, Instagram" />
          <select id="models-status-filter">
            <option value="ALL">All status</option>
            ${STATUSES.map(status => `<option value="${status.toUpperCase()}">${status}</option>`).join("")}
          </select>
          <select id="models-sort">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A–Z</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div class="models-sync-state" id="models-sync-state">Open Models to load the connected Google Sheet.</div>
        <div class="models-list" id="models-list"></div>
        <div class="admin-empty" id="models-empty" hidden>No models found.</div>

        <div class="models-drawer-backdrop" id="models-drawer-backdrop" hidden></div>
        <aside class="models-drawer" id="models-drawer" aria-hidden="true">
          <div class="models-drawer-head">
            <div><p class="admin-kicker" id="models-editor-kicker">Model Profile</p><h2 id="models-editor-title">Edit Model</h2></div>
            <button class="models-close" id="models-close-btn" type="button" aria-label="Close model editor">×</button>
          </div>

          <form id="models-form">
            <input type="hidden" id="models-model-id" />

            <div class="models-form-grid">
              <label class="models-field models-field-full">Name<input id="models-name" type="text" required /></label>
              <label class="models-field">Email<input id="models-email" type="email" /></label>
              <label class="models-field">Status<select id="models-status">${STATUSES.map(status => `<option value="${status}">${status}</option>`).join("")}</select></label>
              <label class="models-field">Height<input id="models-height" type="text" placeholder="5'10 or 178 cm" /></label>
              <label class="models-field">Instagram Handle<input id="models-instagram" type="text" placeholder="handle" /></label>
              <label class="models-field">Pants Size<input id="models-pants" type="text" /></label>
              <label class="models-field">Shirt Size<input id="models-shirt" type="text" /></label>
              <label class="models-field">Shoe Size<input id="models-shoes" type="text" /></label>
              <label class="models-field models-field-full">Notes<textarea id="models-notes" rows="6" placeholder="Casting notes, availability, fit notes, shoot history..."></textarea></label>
            </div>

            <div class="models-profile-meta" id="models-profile-meta"></div>
            <p class="admin-message" id="models-message"></p>

            <div class="models-form-actions">
              <button class="admin-primary-btn" id="models-save-btn" type="submit">Save Changes</button>
              <button class="admin-text-btn models-archive-btn" id="models-archive-btn" type="button">Archive</button>
            </div>
          </form>
        </aside>
      </section>
    `);
  }

  function bindControls() {
    $("models-search")?.addEventListener("input", renderModels);
    $("models-status-filter")?.addEventListener("change", renderModels);
    $("models-sort")?.addEventListener("change", renderModels);
    $("models-refresh-btn")?.addEventListener("click", () => loadModelsAdmin(true));
    $("models-add-btn")?.addEventListener("click", () => openEditor(null));
    $("models-close-btn")?.addEventListener("click", closeEditor);
    $("models-drawer-backdrop")?.addEventListener("click", closeEditor);
    $("models-form")?.addEventListener("submit", saveModel);
    $("models-archive-btn")?.addEventListener("click", archiveModel);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && $("models-drawer")?.classList.contains("is-open")) closeEditor();
    });

    // This delegated hook keeps the page functional even if the admin nav is rebuilt dynamically.
    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.('.admin-sidebar [data-view="models"]');
      if (link) setTimeout(() => loadModelsAdmin(false), 0);
    });
  }

  async function loadModelsAdmin(force = false) {
    if (!installed && !install()) return;
    if (STATE.loading) return;
    if (STATE.loaded && !force) {
      renderModels();
      return;
    }

    STATE.loading = true;
    setSyncState("Loading models from Google Sheet…", true);

    try {
      const data = await apiJson("/api/admin-models");
      STATE.models = Array.isArray(data.models) ? data.models : [];
      STATE.loaded = true;
      setSyncState(`Google Sheet connected · ${STATE.models.length} model${STATE.models.length === 1 ? "" : "s"} loaded.`);
      renderModels();
    } catch (error) {
      setSyncState(error.message || "Unable to load the model sheet.", false, true);
    } finally {
      STATE.loading = false;
    }
  }

  window.loadModelsAdmin = loadModelsAdmin;

  function setSyncState(message, loading = false, error = false) {
    const el = $("models-sync-state");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("is-loading", loading);
    el.classList.toggle("is-error", error);
  }

  function normalizedStatus(model) {
    return String(model?.status || "Applicant").trim() || "Applicant";
  }

  function filteredModels() {
    const query = ($("models-search")?.value || "").trim().toLowerCase();
    const status = ($("models-status-filter")?.value || "ALL").toUpperCase();
    const sort = $("models-sort")?.value || "newest";

    let rows = STATE.models.filter(model => {
      const haystack = `${model.name || ""} ${model.email || ""} ${model.igHandle || ""} ${model.height || ""} ${model.notes || ""}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesStatus = status === "ALL" || normalizedStatus(model).toUpperCase() === status;
      return matchesSearch && matchesStatus;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "name") return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
      if (sort === "status") return normalizedStatus(a).localeCompare(normalizedStatus(b));
      const at = new Date(a.timestamp || 0).getTime() || 0;
      const bt = new Date(b.timestamp || 0).getTime() || 0;
      return sort === "oldest" ? at - bt : bt - at;
    });

    return rows;
  }

  function renderMetrics() {
    const metrics = $("models-metrics");
    if (!metrics) return;
    const count = (status) => STATE.models.filter(m => normalizedStatus(m).toUpperCase() === status).length;
    const values = [STATE.models.length, count("ROSTER"), count("APPLICANT"), count("ARCHIVED")];
    metrics.querySelectorAll("strong").forEach((el, index) => { el.textContent = values[index] ?? 0; });
  }

  function renderModels() {
    renderMetrics();
    const wrap = $("models-list");
    const empty = $("models-empty");
    if (!wrap || !empty) return;

    const rows = filteredModels();
    empty.hidden = rows.length > 0;

    wrap.innerHTML = rows.map(model => {
      const instagram = model.instagramUrl || (model.igHandle ? `https://instagram.com/${String(model.igHandle).replace(/^@/, "")}` : "");
      return `
        <article class="models-row" data-model-row="${esc(model.modelId)}">
          <button class="models-row-main" type="button" data-edit-model="${esc(model.modelId)}">
            <span class="models-avatar">${esc(initials(model.name))}</span>
            <span class="models-identity">
              <strong>${esc(model.name || "Unnamed Model")}</strong>
              <small>${esc(model.email || "No email")}</small>
            </span>
          </button>
          <span class="models-status models-status-${esc(normalizedStatus(model).toLowerCase())}">${esc(normalizedStatus(model))}</span>
          <span class="models-measurements">${esc([model.height, model.shirt ? `Top ${model.shirt}` : "", model.pants ? `Bottom ${model.pants}` : "", model.shoes ? `Shoe ${model.shoes}` : ""].filter(Boolean).join(" · ") || "No sizing")}</span>
          <span class="models-social">${instagram ? `<a href="${esc(instagram)}" target="_blank" rel="noopener">@${esc(String(model.igHandle || "instagram").replace(/^@/, ""))}</a>` : "—"}</span>
          <button class="models-edit-btn" type="button" data-edit-model="${esc(model.modelId)}">Edit</button>
        </article>
      `;
    }).join("");

    wrap.querySelectorAll("[data-edit-model]").forEach(button => {
      button.addEventListener("click", () => openEditor(button.dataset.editModel));
    });
  }

  function initials(name = "") {
    const bits = String(name).trim().split(/\s+/).filter(Boolean);
    return (bits.slice(0, 2).map(bit => bit[0]).join("") || "LC").toUpperCase();
  }

  function findModel(id) {
    return STATE.models.find(model => String(model.modelId) === String(id));
  }

  function openEditor(id) {
    const model = id ? findModel(id) : null;
    STATE.editingId = model?.modelId || null;

    $("models-model-id").value = model?.modelId || "";
    $("models-name").value = model?.name || "";
    $("models-email").value = model?.email || "";
    $("models-height").value = model?.height || "";
    $("models-pants").value = model?.pants || "";
    $("models-shirt").value = model?.shirt || "";
    $("models-shoes").value = model?.shoes || "";
    $("models-instagram").value = String(model?.igHandle || "").replace(/^@/, "");
    $("models-notes").value = model?.notes || "";

    const currentStatus = normalizedStatus(model || { status: "Roster" });
    const statusSelect = $("models-status");
    if (![...statusSelect.options].some(option => option.value === currentStatus)) {
      const option = document.createElement("option");
      option.value = currentStatus;
      option.textContent = currentStatus;
      statusSelect.appendChild(option);
    }
    statusSelect.value = currentStatus;

    $("models-editor-kicker").textContent = model ? "Model Profile" : "New Model";
    $("models-editor-title").textContent = model?.name || "Add Model";
    $("models-message").textContent = "";
    $("models-save-btn").textContent = model ? "Save Changes" : "Add Model";
    $("models-archive-btn").hidden = !model;
    $("models-archive-btn").textContent = currentStatus.toUpperCase() === "ARCHIVED" ? "Already Archived" : "Archive";
    $("models-archive-btn").disabled = currentStatus.toUpperCase() === "ARCHIVED";

    const meta = $("models-profile-meta");
    meta.innerHTML = model ? `
      <span>Model ID <b>${esc(model.modelId || "—")}</b></span>
      <span>Applied <b>${esc(formatDate(model.timestamp))}</b></span>
      <span>Updated <b>${esc(formatDate(model.lastUpdated))}</b></span>
    ` : `<span>New models added here are written directly to the connected Google Sheet.</span>`;

    $("models-drawer-backdrop").hidden = false;
    $("models-drawer").classList.add("is-open");
    $("models-drawer").setAttribute("aria-hidden", "false");
    document.body.classList.add("models-drawer-open");
    setTimeout(() => $("models-name")?.focus(), 50);
  }

  function closeEditor() {
    $("models-drawer")?.classList.remove("is-open");
    $("models-drawer")?.setAttribute("aria-hidden", "true");
    if ($("models-drawer-backdrop")) $("models-drawer-backdrop").hidden = true;
    document.body.classList.remove("models-drawer-open");
    STATE.editingId = null;
  }

  function editorPayload() {
    const igHandle = ($("models-instagram")?.value || "").trim().replace(/^@/, "");
    return {
      modelId: $("models-model-id")?.value || null,
      name: ($("models-name")?.value || "").trim(),
      email: ($("models-email")?.value || "").trim(),
      height: ($("models-height")?.value || "").trim(),
      pants: ($("models-pants")?.value || "").trim(),
      shirt: ($("models-shirt")?.value || "").trim(),
      shoes: ($("models-shoes")?.value || "").trim(),
      igHandle,
      instagramUrl: igHandle ? `https://instagram.com/${igHandle}` : "",
      status: $("models-status")?.value || "Applicant",
      notes: ($("models-notes")?.value || "").trim(),
    };
  }

  async function saveModel(event) {
    event.preventDefault();
    const payload = editorPayload();
    const message = $("models-message");
    const button = $("models-save-btn");

    if (!payload.name) {
      message.textContent = "Name is required.";
      return;
    }

    button.disabled = true;
    button.textContent = payload.modelId ? "Saving…" : "Adding…";
    message.textContent = "";

    try {
      await apiJson("/api/admin-models", {
        method: "POST",
        body: JSON.stringify({ action: payload.modelId ? "update" : "add", model: payload }),
      });
      await loadModelsAdmin(true);
      closeEditor();
    } catch (error) {
      message.textContent = error.message || "Unable to save model.";
    } finally {
      button.disabled = false;
      button.textContent = payload.modelId ? "Save Changes" : "Add Model";
    }
  }

  async function archiveModel() {
    const modelId = $("models-model-id")?.value;
    if (!modelId) return;
    const model = findModel(modelId);
    if (!window.confirm(`Archive ${model?.name || "this model"}? They will remain in the Google Sheet.`)) return;

    const button = $("models-archive-btn");
    const message = $("models-message");
    button.disabled = true;
    button.textContent = "Archiving…";

    try {
      await apiJson("/api/admin-models", {
        method: "POST",
        body: JSON.stringify({ action: "archive", modelId }),
      });
      await loadModelsAdmin(true);
      closeEditor();
    } catch (error) {
      message.textContent = error.message || "Unable to archive model.";
      button.disabled = false;
      button.textContent = "Archive";
    }
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }
})();
