/* IIFE: klasické <script> tagy zdieľajú jeden globálny rozsah, takže bez neho
 * by sa deklarácie z common.js a tohto súboru navzájom prekryli a skript by
 * skončil na "Identifier has already been declared". */
(function () {
  "use strict";

const { apiFetch, initHeader, formatDate } = window.appCommon;

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

/** Prázdna hodnota sa ukáže ako pomlčka, nie ako "null". */
function show(value, unit) {
  return value === null || value === undefined ? "—" : `${value} ${unit}`;
}

function lineChart(canvasId, labels, datasets) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  // eslint-disable-next-line no-undef
  return new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: { duration: 700, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { color: "#cbd5e1", usePointStyle: true } },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(100, 116, 139, 0.5)",
          borderWidth: 1
        }
      },
      scales: {
        x: { ticks: { color: "#94a3b8", maxTicksLimit: 7 }, grid: { display: false } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(100, 116, 139, 0.2)" } }
      }
    }
  });
}

function toggleChart(boxId, emptyId, hasData) {
  document.getElementById(boxId).classList.toggle("hidden", !hasData);
  document.getElementById(emptyId).classList.toggle("hidden", hasData);
  return hasData;
}

function render(data) {
  const a = data.averages;
  setText("avg-weight", show(a.weight, "kg"));
  setText("avg-calories", show(a.calories, "kcal"));
  setText("avg-protein", show(a.protein, "g"));
  setText("avg-carbs", show(a.carbs, "g"));
  setText("avg-fat", show(a.fat, "g"));
  setText("done-meals", String(data.completedMeals));
  setText("done-days", `${data.completedDays} / ${data.days}`);

  if (data.target) {
    setText("avg-calories-hint", `cieľ ${Math.round(data.target.calories)} kcal`);
  }

  if (toggleChart("weight-box", "weight-empty", data.weights.length > 0)) {
    lineChart(
      "report-weight-chart",
      data.weights.map((entry) => formatDate(entry.day)),
      [
        {
          label: "Váha",
          data: data.weights.map((entry) => entry.weight),
          borderColor: "#2dd4bf",
          backgroundColor: "rgba(45, 212, 191, 0.15)",
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 3
        }
      ]
    );
  }

  if (toggleChart("macro-box", "macro-empty", data.intake.length > 0)) {
    const labels = data.intake.map((day) => formatDate(day.day));
    lineChart("report-macro-chart", labels, [
      { label: "Bielkoviny", data: data.intake.map((d) => d.protein), borderColor: "#38bdf8", borderWidth: 2, tension: 0.3, pointRadius: 3 },
      { label: "Sacharidy", data: data.intake.map((d) => d.carbs), borderColor: "#a78bfa", borderWidth: 2, tension: 0.3, pointRadius: 3 },
      { label: "Tuky", data: data.intake.map((d) => d.fat), borderColor: "#fbbf24", borderWidth: 2, tension: 0.3, pointRadius: 3 }
    ]);
  }
}

async function init() {
  const user = await initHeader();
  if (!user) return;

  const response = await apiFetch("/api/insights/weekly-report");
  if (!response.ok) return;
  render(await response.json());
}

init();
})();
