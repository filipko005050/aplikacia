/* Spoločné pomôcky pre všetky stránky: escapovanie výstupu, CSRF a ban handling.
 *
 * Celý súbor je v IIFE. Klasické <script> tagy zdieľajú jeden globálny rozsah,
 * takže bez neho by `function apiFetch` kolidovalo s `const { apiFetch }`
 * v stránkových skriptoch a tie by sa vôbec nenaparsovali.
 * Von ide výhradne window.appCommon. */
(function () {
  "use strict";

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/**
 * Escapuje text pred vložením do innerHTML.
 * Toto je skutočná ochrana pred XSS - všetko, čo pochádza od používateľa
 * (email, meno v profile, user agent), musí prejsť cez toto.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function showBannedAndRedirect(message) {
  window.location.href = "/?banned=1&reason=" + encodeURIComponent(message || "Tvoj účet bol zablokovaný.");
}

/**
 * Obálka nad fetch, ktorá k zapisujúcim požiadavkám pridá CSRF token
 * a zabanovaného používateľa okamžite odhlási.
 */
async function apiFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };

  if (method !== "GET" && method !== "HEAD") {
    const csrfToken = readCookie("csrfToken");
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });

  if (response.status === 403) {
    // Odpoveď sa číta z klonu, aby volajúci mohol telo prečítať znova.
    const data = await response.clone().json().catch(() => ({}));
    if (data.banned) {
      showBannedAndRedirect(data.message);
      return response;
    }
  }

  return response;
}

  /** Zvýrazní v hlavičke položku, ktorá zodpovedá aktuálnej adrese. */
  function markCurrentNavLink() {
    const path = window.location.pathname;
    document.querySelectorAll(".site-nav .nav-link").forEach((link) => {
      const href = link.getAttribute("href");
      if (href && href === path) link.classList.add("is-current");
    });
  }

  function formatDate(value) {
    return new Date(value).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
  }

  function formatDateTime(value) {
    return new Date(value).toLocaleString("sk-SK");
  }

  /** Odhlásenie je na každej stránke rovnaké - stačí tlačidlo s id logout-btn. */
  function wireLogoutButton() {
    const button = document.getElementById("logout-btn");
    if (!button) return;
    button.addEventListener("click", async () => {
      await apiFetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });
  }

  /** Odkaz na admin panel sa ukáže len adminovi. Vracia prihláseného používateľa. */
  async function initHeader() {
    markCurrentNavLink();
    wireLogoutButton();

    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!response.ok) {
      window.location.href = "/";
      return null;
    }

    const { user } = await response.json();
    if (user.role === "admin") {
      document.querySelectorAll("[data-admin-only]").forEach((el) => el.classList.remove("hidden"));
    }
    return user;
  }

  window.appCommon = { escapeHtml, apiFetch, readCookie, initHeader, formatDate, formatDateTime };
})();
