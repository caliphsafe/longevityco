(() => {
  const UNLOCK_AT = Date.parse("2026-10-08T19:00:00-04:00");
  const pad = (value) => String(Math.max(0, value)).padStart(2, "0");

  function safeNext() {
    const raw = new URLSearchParams(window.location.search).get("next") || "/";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  }

  function openSite() {
    window.location.replace(safeNext());
  }

  function updateCountdown() {
    const remaining = UNLOCK_AT - Date.now();

    if (remaining <= 0) {
      document.getElementById("count-days").textContent = "00";
      document.getElementById("count-hours").textContent = "00";
      document.getElementById("count-minutes").textContent = "00";
      document.getElementById("count-seconds").textContent = "00";
      const message = document.getElementById("gate-message");
      if (message) message.textContent = "SITE OPENING…";
      setTimeout(openSite, 250);
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    document.getElementById("count-days").textContent = pad(Math.floor(totalSeconds / 86400));
    document.getElementById("count-hours").textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
    document.getElementById("count-minutes").textContent = pad(Math.floor((totalSeconds % 3600) / 60));
    document.getElementById("count-seconds").textContent = pad(totalSeconds % 60);
  }

  async function submitPassword(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const input = document.getElementById("gate-password");
    const button = form.querySelector("button[type='submit']");
    const message = document.getElementById("gate-message");

    button.disabled = true;
    button.textContent = "…";
    message.classList.remove("is-error");
    message.textContent = "CHECKING ACCESS";

    try {
      const response = await fetch("/api/site-gate-login", {
        method: "POST",
        credentials: "same-origin",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({password: input.value}),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "Unable to verify password.");

      message.textContent = "ACCESS GRANTED";
      setTimeout(openSite, 180);
    } catch (error) {
      message.classList.add("is-error");
      message.textContent = error.message || "Incorrect password.";
      input.select();
      button.disabled = false;
      button.textContent = "ENTER";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    document.getElementById("gate-form")?.addEventListener("submit", submitPassword);
    document.getElementById("gate-password")?.focus();
  });
})();
