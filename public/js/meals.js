/* IIFE: klasické <script> tagy zdieľajú jeden globálny rozsah, takže bez neho
 * by sa deklarácie z common.js a tohto súboru navzájom prekryli a skript by
 * skončil na "Identifier has already been declared". */
(function () {
  "use strict";

const { escapeHtml, apiFetch, initHeader } = window.appCommon;

const mealsList = document.getElementById("meals-list");
const trackerRows = document.getElementById("tracker-rows");
const message = document.getElementById("meals-message");
const noPlan = document.getElementById("no-plan");

const MEAL_TYPE_LABELS = {
  ranajky: "Raňajky",
  obed: "Obed",
  vecera: "Večera"
};

const MACROS = [
  { key: "calories", label: "Kalórie", unit: "kcal", color: "#14b8a6" },
  { key: "protein", label: "Bielkoviny", unit: "g", color: "#38bdf8" },
  { key: "carbs", label: "Sacharidy", unit: "g", color: "#a78bfa" },
  { key: "fat", label: "Tuky", unit: "g", color: "#fbbf24" },
  { key: "fiber", label: "Vláknina", unit: "g", color: "#4ade80" }
];

let chart = null;
let favoriteNames = new Set();

function setMessage(text, isError = false) {
  message.textContent = text;
  message.className = `text-sm mt-2 ${isError ? "text-red-300" : "text-emerald-300"}`;
}

function round(value) {
  return Math.round(Number(value) * 10) / 10;
}

/** Vykreslí tri chody, každý s dvomi variantmi na výber. */
function renderMeals(meals, checks) {
  if (meals.length === 0) {
    noPlan.classList.remove("hidden");
    mealsList.innerHTML = "";
    return;
  }
  noPlan.classList.add("hidden");

  // Ku každému chodu si nájdeme, ktoré jedlo je dnes odfajknuté.
  const checkedByPlan = new Map(checks.map((check) => [check.mealPlanId, check.mealId]));

  mealsList.innerHTML = meals
    .map((meal, index) => {
      const checkedMealId = checkedByPlan.get(meal.id);
      const variants = [1, 2]
        .map((variantIndex) => {
          const mealId = meal[`variant${variantIndex}_meal_id`];
          const name = meal[`variant${variantIndex}`];
          const calories = meal[`variant${variantIndex}_calories`];

          if (!mealId) {
            return `<div class="meal-choice is-static">
              <span>${escapeHtml(name)}</span>
              <span class="text-xs text-slate-500">Detail nie je uložený</span>
            </div>`;
          }

          const isChecked = Number(checkedMealId) === Number(mealId);
          const macros = calories === null || calories === undefined
            ? ""
            : `<span class="meal-choice-macros">${Math.round(Number(calories))} kcal ·
                 P ${round(meal[`variant${variantIndex}_protein`])} ·
                 C ${round(meal[`variant${variantIndex}_carbs`])} ·
                 F ${round(meal[`variant${variantIndex}_fat`])}</span>`;

          const isFavorite = favoriteNames.has(name);

          return `
            <div class="meal-choice-row">
              <button
                class="meal-choice ${isChecked ? "is-checked" : ""}"
                data-plan-id="${meal.id}"
                data-meal-id="${mealId}"
                data-checked="${isChecked ? "1" : "0"}"
              >
                <span class="meal-check-mark" aria-hidden="true">✓</span>
                <span class="meal-choice-body">
                  <span class="meal-choice-name">${escapeHtml(name)}</span>
                  ${macros}
                </span>
              </button>
              <button
                class="favorite-star ${isFavorite ? "is-favorite" : ""}"
                data-meal-id="${mealId}"
                data-meal-name="${escapeHtml(name)}"
                title="${isFavorite ? "Odobrať z obľúbených" : "Pridať medzi obľúbené"}"
                aria-label="Obľúbené"
              >★</button>
            </div>`;
        })
        .join("");

      return `
        <article class="meal-card animate-fade-in" style="--row-index: ${index}">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h3 class="font-semibold uppercase text-teal-300">${escapeHtml(MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type)}</h3>
            ${checkedMealId ? '<span class="status-badge status-active">Zjedol som</span>' : ""}
          </div>
          <div class="meal-choice-grid mt-3">${variants}</div>
        </article>`;
    })
    .join("");

  mealsList.querySelectorAll("button.meal-choice").forEach((button) => {
    button.addEventListener("click", () => toggleCheck(button));
  });

  mealsList.querySelectorAll("button.favorite-star").forEach((button) => {
    button.addEventListener("click", () => toggleFavorite(button));
  });
}

/** Rozdelí makrá na zjedené a zostávajúce; percento je orezané na 0-100. */
function renderTracker(consumed, target, remaining) {
  if (!target) {
    trackerRows.innerHTML =
      '<div class="empty-note">Najskôr si vypočítaj makrá v kalkulačke, inak nie je s čím porovnávať.</div>';
    return;
  }

  trackerRows.innerHTML = MACROS.map((macro) => {
    const eaten = consumed[macro.key];
    const left = remaining[macro.key];
    const percent = Math.max(0, Math.min(100, (eaten / target[macro.key]) * 100));
    const over = left < 0;

    return `
      <div>
        <div class="macro-row">
          <span>${escapeHtml(macro.label)}</span>
          <span class="text-sm">
            <strong class="text-slate-100">${round(eaten)}</strong>
            <span class="text-slate-400"> / ${round(target[macro.key])} ${escapeHtml(macro.unit)}</span>
            <span class="${over ? "text-amber-300" : "text-emerald-300"} ml-2">
              ${over ? `+${round(Math.abs(left))} navyše` : `zostáva ${round(left)}`}
            </span>
          </span>
        </div>
        <div class="progress-wrap">
          <div class="progress-fill ${over ? "is-over" : ""}" style="width: ${percent}%; background: ${macro.color}"></div>
        </div>
      </div>`;
  }).join("");
}

/**
 * Graf zjedol/zostáva. Pri aktualizácii sa nevytvára nanovo - iba sa vymenia
 * dáta a zavolá update(), aby prechod ostal plynulý.
 */
function renderChart(consumed, target) {
  const canvas = document.getElementById("macro-chart");
  const labels = MACROS.map((macro) => macro.label);
  const eaten = MACROS.map((macro) => round(consumed[macro.key]));
  const left = MACROS.map((macro) => (target ? Math.max(0, round(target[macro.key] - consumed[macro.key])) : 0));

  if (chart) {
    chart.data.datasets[0].data = eaten;
    chart.data.datasets[1].data = left;
    chart.update();
    return;
  }

  // eslint-disable-next-line no-undef
  chart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Zjedol",
          data: eaten,
          backgroundColor: MACROS.map((macro) => macro.color),
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: "Zostáva",
          data: left,
          backgroundColor: "rgba(100, 116, 139, 0.35)",
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { color: "#cbd5e1", usePointStyle: true } },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(100, 116, 139, 0.5)",
          borderWidth: 1
        }
      },
      scales: {
        x: { stacked: true, ticks: { color: "#94a3b8" }, grid: { color: "rgba(100, 116, 139, 0.2)" } },
        y: { stacked: true, ticks: { color: "#cbd5e1" }, grid: { display: false } }
      }
    }
  });
}

function applyState(data) {
  document.getElementById("today-name").textContent = data.day;
  renderMeals(data.meals || [], data.checks || []);
  renderTracker(data.consumed, data.target, data.remaining);
  renderChart(data.consumed, data.target);
}

async function toggleCheck(button) {
  const isChecked = button.dataset.checked === "1";
  const planId = Number(button.dataset.planId);
  const mealId = Number(button.dataset.mealId);

  // Zelený highlight nabehne hneď, aby klik pôsobil okamžite.
  if (!isChecked) button.classList.add("is-checked");

  const endpoint = isChecked ? "/api/meal-checks/uncheck" : "/api/meal-checks";
  const body = isChecked ? { mealPlanId: planId } : { mealPlanId: planId, mealId };

  const response = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    setMessage(data.message || "Akcia sa nepodarila.", true);
    await load();
    return;
  }

  setMessage(isChecked ? "Odfajknutie zrušené." : "Zapísané ako zjedené.");
  applyState(data);
}

/** Hviezdička prepína obľúbené. Stav sa mení hneď, aby klik pôsobil okamžite. */
async function toggleFavorite(button) {
  const name = button.dataset.mealName;
  const isFavorite = favoriteNames.has(name);
  button.classList.toggle("is-favorite", !isFavorite);

  const endpoint = isFavorite ? "/api/favorites/remove" : "/api/favorites";
  const body = isFavorite ? { mealName: name } : { mealId: Number(button.dataset.mealId) };

  const response = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    button.classList.toggle("is-favorite", isFavorite);
    setMessage(data.message || "Akcia sa nepodarila.", true);
    return;
  }

  if (isFavorite) favoriteNames.delete(name);
  else favoriteNames.add(name);
  setMessage(data.message);
}

async function loadFavorites() {
  const response = await apiFetch("/api/favorites");
  if (!response.ok) return;
  const data = await response.json();
  favoriteNames = new Set((data.favorites || []).map((item) => item.meal_name));
}

async function load() {
  const response = await apiFetch("/api/meal-checks/today");
  if (!response.ok) return;
  applyState(await response.json());
}

async function init() {
  const user = await initHeader();
  if (!user) return;
  await loadFavorites();
  await load();
}

init();
})();
