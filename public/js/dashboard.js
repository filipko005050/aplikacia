/* IIFE: klasické <script> tagy zdieľajú jeden globálny rozsah, takže bez neho
 * by sa deklarácie z common.js a tohto súboru navzájom prekryli a skript by
 * skončil na "Identifier has already been declared". */
(function () {
  "use strict";

const { apiFetch, initHeader, formatDate } = window.appCommon;

const message = document.getElementById("dash-message");

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function bmiHint(bmi) {
  if (bmi < 18.5) return "Podváha";
  if (bmi < 25) return "Normálna hmotnosť";
  if (bmi < 30) return "Nadváha";
  return "Obezita";
}

function renderCalculations(calculations) {
  if (!calculations) {
    message.textContent = "Zatiaľ nemáš vyplnený profil. Otvor kalkulačku a vypočítaj si makrá.";
    return;
  }

  setText("dash-bmi", calculations.bmi);
  setText("dash-bmi-hint", bmiHint(Number(calculations.bmi)));
  setText("dash-ideal", `${calculations.idealWeight} kg`);
  setText("dash-calories", `${Math.round(calculations.calories)} kcal`);
  setText("dash-protein", `${calculations.protein} g`);
  setText("dash-carbs", `${calculations.carbs} g`);
  setText("dash-fat", `${calculations.fat} g`);
  setText("dash-fiber", `${calculations.fiber} g`);
  message.textContent = "Tvoje aktuálne hodnoty podľa uloženého profilu.";
}

/** Mini graf posledných 7 dní. Chart.js sa načítava lokálne z /static. */
function renderMiniChart(entries) {
  const emptyNote = document.getElementById("dash-chart-empty");
  const box = document.getElementById("dash-chart-box");

  if (entries.length === 0) {
    emptyNote.classList.remove("hidden");
    box.classList.add("hidden");
    return;
  }

  emptyNote.classList.add("hidden");
  box.classList.remove("hidden");

  const canvas = document.getElementById("dash-weight-chart");
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 180);
  gradient.addColorStop(0, "rgba(20, 184, 166, 0.35)");
  gradient.addColorStop(1, "rgba(20, 184, 166, 0)");

  // eslint-disable-next-line no-undef
  new Chart(ctx, {
    type: "line",
    data: {
      labels: entries.map((entry) => formatDate(entry.timestamp)),
      datasets: [
        {
          data: entries.map((entry) => entry.weight),
          borderColor: "#2dd4bf",
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: "#2dd4bf"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: "easeOutQuart" },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#94a3b8", maxTicksLimit: 7 }, grid: { display: false } },
        y: {
          ticks: { color: "#94a3b8", callback: (value) => `${value} kg` },
          grid: { color: "rgba(100, 116, 139, 0.2)" }
        }
      }
    }
  });
}

/** Z histórie ostanú len zápisy za posledných 7 dní. */
function lastSevenDays(entries) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = entries.filter((entry) => new Date(entry.timestamp).getTime() >= cutoff);
  // Keď v poslednom týždni nič nie je, ukáže sa aspoň posledných pár zápisov.
  return recent.length > 0 ? recent : entries.slice(-7);
}

async function init() {
  const user = await initHeader();
  if (!user) return;

  const profileResponse = await apiFetch("/api/profile");
  if (profileResponse.ok) {
    const data = await profileResponse.json();
    renderCalculations(data.calculations);
  }

  const weightResponse = await apiFetch("/api/weight?limit=60");
  if (weightResponse.ok) {
    const data = await weightResponse.json();
    const entries = data.entries || [];

    if (data.latest) {
      setText("dash-weight", `${data.latest.weight} kg`);
      setText("dash-weight-date", formatDate(data.latest.timestamp));
    } else {
      setText("dash-weight-date", "zatiaľ bez zápisu");
    }

    renderMiniChart(lastSevenDays(entries));
  }
}

init();
})();
