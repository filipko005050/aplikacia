/* IIFE: klasické <script> tagy zdieľajú jeden globálny rozsah, takže bez neho
 * by sa deklarácie z common.js a tohto súboru navzájom prekryli a skript by
 * skončil na "Identifier has already been declared". */
(function () {
  "use strict";

const { escapeHtml, apiFetch, initHeader, formatDate } = window.appCommon;

function render(data) {
  document.getElementById("total-points").textContent = data.points;
  document.getElementById("level-value").textContent = `Level ${data.level.level}`;
  document.getElementById("level-label").textContent = data.level.label;
  document.getElementById("level-bar").style.width = `${data.level.progress}%`;
  document.getElementById("level-next").textContent =
    data.level.nextAt === null
      ? "Najvyšší level je dosiahnutý."
      : `Do ďalšieho levelu ti chýba ${data.level.toNext} bodov (${data.level.nextAt}).`;

  document.getElementById("badge-list").innerHTML = data.badges
    .map(
      (badge, index) => `
      <article class="dash-card ${badge.earned ? "badge-earned" : ""}" style="--card-index: ${index}">
        <p class="badge-icon">${badge.earned ? "🏅" : "🔒"}</p>
        <p class="dash-label">${escapeHtml(badge.name)}</p>
        <p class="text-sm text-slate-300 mt-1">${escapeHtml(badge.description)}</p>
        <div class="progress-wrap mt-3">
          <div class="progress-fill" style="width: ${badge.progress}%"></div>
        </div>
        <p class="dash-hint mt-2">
          ${badge.earned ? "Získaný" : `séria ${badge.streak} / ${badge.requirement} dní`}
        </p>
      </article>`
    )
    .join("");

  document.getElementById("rules-list").innerHTML = data.rules
    .map(
      (rule) => `
      <div class="weight-row">
        <span class="text-sm text-slate-200">${escapeHtml(rule.label)}</span>
        <span class="weight-value">+${escapeHtml(rule.points)}</span>
      </div>`
    )
    .join("");

  const history = document.getElementById("points-history");
  history.innerHTML =
    data.history.length === 0
      ? '<div class="empty-note">Zatiaľ žiadne body. Odfajkni si jedlo alebo zapíš váhu.</div>'
      : data.history
          .map(
            (entry, index) => `
            <div class="weight-row" style="--row-index: ${index}">
              <div>
                <p class="text-sm text-slate-200">${escapeHtml(entry.label)}</p>
                <p class="weight-delta">${escapeHtml(formatDate(entry.date))}</p>
              </div>
              <span class="weight-value">+${escapeHtml(entry.points)}</span>
            </div>`
          )
          .join("");
}

async function init() {
  const user = await initHeader();
  if (!user) return;

  const response = await apiFetch("/api/insights/achievements");
  if (!response.ok) return;
  render(await response.json());
}

init();
})();
