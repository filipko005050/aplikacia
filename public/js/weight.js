/* IIFE: klasické <script> tagy zdieľajú jeden globálny rozsah, takže bez neho
 * by sa deklarácie z common.js a tohto súboru navzájom prekryli a skript by
 * skončil na "Identifier has already been declared". */
(function () {
  "use strict";

const { escapeHtml, apiFetch, initHeader, formatDate, formatDateTime } = window.appCommon;

const form = document.getElementById("weight-form");
const input = document.getElementById("weight-input");
const submitBtn = document.getElementById("weight-submit");
const message = document.getElementById("weight-message");
const history = document.getElementById("weight-history");

let chart = null;

function setMessage(text, isError = false) {
  message.textContent = text;
  message.className = `mt-3 text-sm ${isError ? "text-red-300" : "text-emerald-300"}`;
}

/**
 * Trendová línia metódou najmenších štvorcov - ukazuje, kam váha smeruje,
 * bez toho, aby ju rozhadzovali denné výkyvy.
 */
function trendLine(values) {
  const n = values.length;
  if (n < 2) return values.slice();

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  values.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) return values.slice();

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return values.map((_, x) => Math.round((slope * x + intercept) * 100) / 100);
}

function renderChart(entries) {
  const emptyNote = document.getElementById("chart-empty");
  const box = document.getElementById("chart-box");

  if (entries.length === 0) {
    emptyNote.classList.remove("hidden");
    box.classList.add("hidden");
    return;
  }

  emptyNote.classList.add("hidden");
  box.classList.remove("hidden");

  const canvas = document.getElementById("weight-chart");
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "rgba(20, 184, 166, 0.4)");
  gradient.addColorStop(1, "rgba(20, 184, 166, 0)");

  const values = entries.map((entry) => entry.weight);

  // Pri opakovanom zápise sa graf prekresľuje - starý sa musí zlikvidovať.
  if (chart) chart.destroy();

  // eslint-disable-next-line no-undef
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: entries.map((entry) => formatDate(entry.timestamp)),
      datasets: [
        {
          label: "Váha",
          data: values,
          borderColor: "#2dd4bf",
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: "#2dd4bf"
        },
        {
          label: "Trend",
          data: trendLine(values),
          borderColor: "#38bdf8",
          borderWidth: 2,
          borderDash: [6, 5],
          fill: false,
          tension: 0,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: { duration: 800, easing: "easeOutQuart" },
      plugins: {
        legend: { labels: { color: "#cbd5e1", usePointStyle: true } },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "rgba(100, 116, 139, 0.5)",
          borderWidth: 1,
          callbacks: { label: (item) => `${item.dataset.label}: ${item.formattedValue} kg` }
        }
      },
      scales: {
        x: { ticks: { color: "#94a3b8", maxTicksLimit: 10 }, grid: { display: false } },
        y: {
          ticks: { color: "#94a3b8", callback: (value) => `${value} kg` },
          grid: { color: "rgba(100, 116, 139, 0.2)" }
        }
      }
    }
  });
}

function renderHistory(entries) {
  const latestFirst = entries.slice(-10).reverse();

  if (latestFirst.length === 0) {
    history.innerHTML = '<div class="empty-note">Zatiaľ žiadne zápisy.</div>';
    return;
  }

  history.innerHTML = latestFirst
    .map((entry, index) => {
      // Rozdiel voči predchádzajúcemu (staršiemu) zápisu.
      const previous = latestFirst[index + 1];
      let delta = "";
      if (previous) {
        const diff = Math.round((entry.weight - previous.weight) * 100) / 100;
        const sign = diff > 0 ? "+" : "";
        delta = diff === 0 ? "bez zmeny" : `${sign}${diff} kg`;
      }

      return `
        <div class="weight-row" style="--row-index: ${index}">
          <div>
            <p class="text-sm text-slate-200">${escapeHtml(formatDateTime(entry.timestamp))}</p>
            <p class="weight-delta">${escapeHtml(delta)}</p>
          </div>
          <p class="weight-value">${escapeHtml(entry.weight)} kg</p>
        </div>`;
    })
    .join("");
}

async function loadWeights() {
  const response = await apiFetch("/api/weight?limit=180");
  if (!response.ok) return;

  const data = await response.json();
  const entries = data.entries || [];
  renderChart(entries);
  renderHistory(entries);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitBtn.disabled = true;
  submitBtn.textContent = "Zapisujem...";

  try {
    const response = await apiFetch("/api/weight", {
      method: "POST",
      body: JSON.stringify({ weight: input.value })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.message || "Váhu sa nepodarilo zapísať.", true);
      return;
    }

    setMessage(data.message);
    input.value = "";
    await loadWeights();
  } catch (error) {
    setMessage("Server neodpovedá. Skús to o chvíľu znova.", true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Zapísať";
  }
});

async function init() {
  const user = await initHeader();
  if (!user) return;
  await loadWeights();
}

init();
})();
