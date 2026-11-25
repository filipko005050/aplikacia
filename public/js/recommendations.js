/* IIFE: klasické <script> tagy zdieľajú jeden globálny rozsah, takže bez neho
 * by sa deklarácie z common.js a tohto súboru navzájom prekryli a skript by
 * skončil na "Identifier has already been declared". */
(function () {
  "use strict";

const { escapeHtml, apiFetch, initHeader } = window.appCommon;

const list = document.getElementById("tips-list");

const TONE_CLASS = { good: "tip-good", warn: "tip-warn", info: "tip-info" };

function render(tips) {
  if (tips.length === 0) {
    list.innerHTML = '<div class="empty-note">Zatiaľ nemáme dosť dát na odporúčania.</div>';
    return;
  }

  list.innerHTML = tips
    .map(
      (tip, index) => `
      <article class="tip-card ${TONE_CLASS[tip.tone] || "tip-info"}" style="--row-index: ${index}">
        <h3 class="tip-title">${escapeHtml(tip.title)}</h3>
        <p class="tip-text">${escapeHtml(tip.text)}</p>
      </article>`
    )
    .join("");
}

async function init() {
  const user = await initHeader();
  if (!user) return;

  const response = await apiFetch("/api/insights/recommendations");
  if (!response.ok) return;
  const data = await response.json();
  render(data.recommendations || []);
}

init();
})();
