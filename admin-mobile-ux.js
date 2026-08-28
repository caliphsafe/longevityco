/*
  LONGEVITY ADMIN — MOBILE UX
  Adds a true mobile navigation drawer and mobile-friendly behavior without
  changing desktop navigation or API behavior.
*/
(() => {
  const MOBILE_BREAKPOINT = 900;
  let installed = false;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function closeMenu() {
    document.body.classList.remove("admin-mobile-menu-open");
    document.getElementById("admin-mobile-nav-toggle")?.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    if (!isMobile()) return;
    document.body.classList.add("admin-mobile-menu-open");
    document.getElementById("admin-mobile-nav-toggle")?.setAttribute("aria-expanded", "true");
  }

  function toggleMenu() {
    document.body.classList.contains("admin-mobile-menu-open") ? closeMenu() : openMenu();
  }

  function currentViewLabel() {
    const active = document.querySelector(".admin-sidebar .admin-nav-link.is-active");
    return active?.textContent?.trim() || "Menu";
  }

  function updateCurrentViewLabel() {
    const label = document.getElementById("admin-mobile-current-view");
    if (label) label.textContent = currentViewLabel();
  }

  function installMobileNav() {
    if (installed) return;

    const header = document.querySelector(".admin-header");
    const sidebar = document.querySelector(".admin-sidebar");
    if (!header || !sidebar) return;

    const controls = document.createElement("div");
    controls.className = "admin-mobile-nav-controls";
    controls.innerHTML = `
      <button id="admin-mobile-nav-toggle" class="admin-mobile-nav-toggle" type="button"
        aria-label="Open admin navigation" aria-expanded="false">
        <span></span><span></span>
      </button>
      <span id="admin-mobile-current-view" class="admin-mobile-current-view">${currentViewLabel()}</span>
    `;
    header.insertBefore(controls, header.querySelector(".admin-header-meta"));

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.id = "admin-mobile-nav-backdrop";
    backdrop.className = "admin-mobile-nav-backdrop";
    backdrop.setAttribute("aria-label", "Close admin navigation");
    document.body.appendChild(backdrop);

    controls.querySelector("#admin-mobile-nav-toggle")?.addEventListener("click", toggleMenu);
    backdrop.addEventListener("click", closeMenu);

    sidebar.querySelectorAll(".admin-nav-link").forEach(button => {
      button.addEventListener("click", () => {
        updateCurrentViewLabel();
        closeMenu();
        if (isMobile()) window.scrollTo({ top: 0, behavior: "auto" });
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (!isMobile()) closeMenu();
    });

    // Dynamically injected Shop Editor nav item.
    const nav = sidebar.querySelector("nav");
    if (nav) {
      new MutationObserver(() => {
        nav.querySelectorAll(".admin-nav-link").forEach(button => {
          if (button.dataset.mobileBound) return;
          button.dataset.mobileBound = "1";
          button.addEventListener("click", () => {
            updateCurrentViewLabel();
            closeMenu();
            if (isMobile()) window.scrollTo({ top: 0, behavior: "auto" });
          });
        });
        updateCurrentViewLabel();
      }).observe(nav, { childList: true });
    }

    // Keep the mobile header label synchronized when views change elsewhere.
    const main = document.querySelector(".admin-main");
    if (main) {
      new MutationObserver(updateCurrentViewLabel)
        .observe(main, { attributes: true, subtree: true, attributeFilter: ["class"] });
    }

    installed = true;
    updateCurrentViewLabel();
  }

  function boot() {
    installMobileNav();
    if (!installed) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        installMobileNav();
        if (installed || tries > 80) clearInterval(timer);
      }, 100);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
