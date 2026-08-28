/*
  LONGEVITY ADMIN — SMART SELECT ALL / DESELECT ALL
  Scope is always the products CURRENTLY rendered in the Products list.
  That means Live, Draft, Archived, All, and search results are respected.
*/
(() => {
  function visibleCheckboxes() {
    return Array.from(
      document.querySelectorAll("#admin-product-list .admin-product-row .admin-bulk-select-input")
    ).filter(input => !input.disabled);
  }

  function setCheckbox(input, checked) {
    if (!input || input.checked === checked) return;
    input.checked = checked;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function selectVisible() {
    visibleCheckboxes().forEach(input => setCheckbox(input, true));
    updateControlState();
  }

  function deselectVisible() {
    visibleCheckboxes().forEach(input => setCheckbox(input, false));
    updateControlState();
  }

  function filterLabel() {
    const status = document.getElementById("product-status-filter");
    if (!status) return "Visible";
    const option = status.options[status.selectedIndex];
    return option?.textContent?.trim() || "Visible";
  }

  function updateControlState() {
    const boxes = visibleCheckboxes();
    const checked = boxes.filter(input => input.checked).length;
    const select = document.getElementById("admin-select-all-visible");
    const deselect = document.getElementById("admin-deselect-all-visible");
    const note = document.getElementById("admin-visible-selection-note");

    if (select) select.disabled = boxes.length === 0 || checked === boxes.length;
    if (deselect) deselect.disabled = boxes.length === 0 || checked === 0;
    if (note) {
      note.textContent = `${checked}/${boxes.length} ${filterLabel().toLowerCase()} shown selected`;
    }
  }

  function installControls() {
    const toolbar = document.querySelector("#view-products .admin-toolbar");
    if (!toolbar || document.getElementById("admin-visible-selection-tools")) return false;

    const controls = document.createElement("div");
    controls.id = "admin-visible-selection-tools";
    controls.className = "admin-visible-selection-tools";
    controls.innerHTML = `
      <button class="admin-text-btn" id="admin-select-all-visible" type="button">Select All</button>
      <button class="admin-text-btn" id="admin-deselect-all-visible" type="button">Deselect All</button>
      <span id="admin-visible-selection-note" class="admin-visible-selection-note"></span>
    `;
    toolbar.appendChild(controls);

    document.getElementById("admin-select-all-visible")
      ?.addEventListener("click", selectVisible);
    document.getElementById("admin-deselect-all-visible")
      ?.addEventListener("click", deselectVisible);

    updateControlState();
    return true;
  }

  /*
    Important safety behavior:
    Before a status/search filter replaces the product rows, clear selections
    from the OLD visible result set. This prevents a Live product selected in
    one filter from remaining silently selected after switching to Draft or
    Archived, so bulk actions always apply to what the user can currently see.
  */
  function clearBeforeFilterChanges() {
    const status = document.getElementById("product-status-filter");
    const search = document.getElementById("product-search");

    status?.addEventListener("change", () => {
      deselectVisible();
    }, true);

    search?.addEventListener("input", () => {
      deselectVisible();
    }, true);
  }

  function observeProductList() {
    const list = document.getElementById("admin-product-list");
    if (!list) return false;

    new MutationObserver(() => {
      installControls();
      requestAnimationFrame(updateControlState);
    }).observe(list, { childList: true, subtree: true });

    list.addEventListener("change", event => {
      if (event.target?.classList?.contains("admin-bulk-select-input")) {
        requestAnimationFrame(updateControlState);
      }
    });

    return true;
  }

  function addStyles() {
    if (document.getElementById("admin-visible-selection-styles")) return;
    const style = document.createElement("style");
    style.id = "admin-visible-selection-styles";
    style.textContent = `
      .admin-visible-selection-tools{
        display:flex;
        align-items:center;
        gap:.55rem;
        margin-left:auto;
        white-space:nowrap;
      }
      .admin-visible-selection-tools .admin-text-btn{
        min-height:34px;
      }
      .admin-visible-selection-note{
        font-size:.62rem;
        opacity:.5;
        text-transform:uppercase;
        letter-spacing:.04em;
      }
      @media(max-width:800px){
        #view-products .admin-toolbar{
          align-items:stretch;
        }
        .admin-visible-selection-tools{
          width:100%;
          margin-left:0;
          flex-wrap:wrap;
          padding-top:.25rem;
        }
        .admin-visible-selection-note{
          width:100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    addStyles();
    installControls();
    clearBeforeFilterChanges();

    if (!observeProductList()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        installControls();
        if (observeProductList() || tries > 60) clearInterval(timer);
      }, 100);
    }

    // admin-bulk-edit.js enhances rows after async product load.
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      installControls();
      updateControlState();
      if (document.querySelector("#admin-product-list .admin-bulk-select-input") || tries > 80) {
        clearInterval(timer);
      }
    }, 125);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
