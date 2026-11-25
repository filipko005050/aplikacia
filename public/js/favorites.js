/* IIFE: klasické <script> tagy zdieľajú jeden globálny rozsah, takže bez neho
 * by sa deklarácie z common.js a tohto súboru navzájom prekryli a skript by
 * skončil na "Identifier has already been declared". */
(function () {
  "use strict";

const { escapeHtml, apiFetch, initHeader, formatDate } = window.appCommon;

const list = document.getElementById("favorites-list");
const message = document.getElementById("favorites-message");

function setMessage(text, isError = false) {
  message.textContent = text;
  message.className = `text-sm mt-2 ${isError ? "text-red-300" : "text-emerald-300"}`;
}

function macroLine(item) {
  if (item.calories === null || item.calories === undefined) {
    // Jedlo z minulého jedálnička - makrá sa už nedajú dohľadať.
    return '<span class="meal-choice-macros">Makrá sa doplnia po ďalšom generovaní</span>';
  }
  const round = (v) => Math.round(Number(v) * 10) / 10;
  return `<span class="meal-choice-macros">${Math.round(Number(item.calories))} kcal ·
    P ${round(item.protein)} · C ${round(item.carbs)} · F ${round(item.fat)}</span>`;
}

function render(favorites) {
  if (favorites.length === 0) {
    list.innerHTML =
      '<div class="empty-note">Zatiaľ nemáš obľúbené jedlá. Označ ich hviezdičkou v sekcii <strong>Jedlá</strong>.</div>';
    return;
  }

  list.innerHTML = favorites
    .map(
      (item, index) => `
      <article class="meal-card animate-fade-in" style="--row-index: ${index}">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p class="meal-choice-name">⭐ ${escapeHtml(item.meal_name)}</p>
            ${macroLine(item)}
            <p class="weight-delta mt-1">Pridané ${escapeHtml(formatDate(item.timestamp))}</p>
          </div>
          <button class="btn-secondary text-sm" data-name="${escapeHtml(item.meal_name)}">Odobrať</button>
        </div>
      </article>`
    )
    .join("");

  list.querySelectorAll("button[data-name]").forEach((button) => {
    button.addEventListener("click", () => removeFavorite(button.dataset.name));
  });
}

async function removeFavorite(name) {
  const response = await apiFetch("/api/favorites/remove", {
    method: "POST",
    body: JSON.stringify({ mealName: name })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    setMessage(data.message || "Nepodarilo sa odobrať.", true);
    return;
  }

  setMessage(data.message);
  await load();
}

async function load() {
  const response = await apiFetch("/api/favorites");
  if (!response.ok) return;
  const data = await response.json();
  render(data.favorites || []);
}

async function init() {
  const user = await initHeader();
  if (!user) return;
  await load();
}

init();
})();
