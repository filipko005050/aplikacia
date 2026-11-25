/**
 * Body, levely a odznaky.
 *
 * Body sú v tabuľke user_points ako účtovná kniha - jeden riadok = jedno
 * ocenenie. Unikátny index (user_id, reason, awarded_date) zabezpečí, že sa
 * to isté nedá získať dvakrát: keď si používateľ prepne variant raňajok,
 * body za raňajky mu už druhýkrát nepribudnú.
 */
const POINT_RULES = {
  "meal:ranajky": { points: 10, label: "Splnené raňajky" },
  "meal:obed": { points: 10, label: "Splnený obed" },
  "meal:vecera": { points: 10, label: "Splnená večera" },
  "day:complete": { points: 20, label: "Splnený celý deň" },
  weight: { points: 5, label: "Zapísaná váha" }
};

const LEVELS = [
  { level: 1, min: 0, max: 499, label: "Začiatočník" },
  { level: 2, min: 500, max: 999, label: "Pokročilý" },
  { level: 3, min: 1000, max: 1999, label: "Skúsený" },
  { level: 4, min: 2000, max: Infinity, label: "Majster" }
];

const BADGES = [
  {
    key: "consistency",
    name: "Consistency Badge",
    description: "Splnených 7 dní po sebe (všetky tri jedlá).",
    requirement: 7
  },
  {
    key: "protein_master",
    name: "Protein Master",
    description: "Splnené bielkoviny 5 dní po sebe.",
    requirement: 5
  },
  {
    key: "weight_tracker",
    name: "Weight Tracker",
    description: "Zapísaná váha 10 dní po sebe.",
    requirement: 10
  }
];

function pointsForReason(reason) {
  return POINT_RULES[reason] ? POINT_RULES[reason].points : 0;
}

/** Level podľa celkových bodov + koľko chýba do ďalšieho. */
function levelForPoints(total) {
  const current = LEVELS.find((entry) => total >= entry.min && total <= entry.max) || LEVELS[0];
  const next = LEVELS.find((entry) => entry.level === current.level + 1) || null;

  return {
    level: current.level,
    label: current.label,
    min: current.min,
    // Do akej hodnoty siaha aktuálny level (pri poslednom leveli nie je strop).
    max: Number.isFinite(current.max) ? current.max : null,
    nextAt: next ? next.min : null,
    toNext: next ? Math.max(0, next.min - total) : 0,
    // Postup v rámci aktuálneho levelu, 0-100.
    progress: next ? Math.round(((total - current.min) / (next.min - current.min)) * 100) : 100
  };
}

/**
 * Najdlhšia séria dní končiaca dnes alebo včera.
 *
 * Včerajšok sa uznáva zámerne - keby sa počítalo len po dnešok, séria by sa
 * ránom tvárila ako prerušená, kým používateľ nezapíše prvé jedlo.
 */
function currentStreak(dates, today) {
  if (dates.length === 0) return 0;

  const unique = [...new Set(dates)].sort().reverse();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayMs = Date.parse(`${today}T00:00:00Z`);

  const gapFromToday = Math.round((todayMs - Date.parse(`${unique[0]}T00:00:00Z`)) / dayMs);
  if (gapFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const diff = Math.round(
      (Date.parse(`${unique[i - 1]}T00:00:00Z`) - Date.parse(`${unique[i]}T00:00:00Z`)) / dayMs
    );
    if (diff !== 1) break;
    streak += 1;
  }
  return streak;
}

/** Odznaky aj s tým, ako ďaleko k nim používateľ je. */
function evaluateBadges({ completeDays, proteinDays, weightDays }, today) {
  const streaks = {
    consistency: currentStreak(completeDays, today),
    protein_master: currentStreak(proteinDays, today),
    weight_tracker: currentStreak(weightDays, today)
  };

  return BADGES.map((badge) => {
    const streak = streaks[badge.key];
    return {
      ...badge,
      streak,
      earned: streak >= badge.requirement,
      progress: Math.min(100, Math.round((streak / badge.requirement) * 100))
    };
  });
}

module.exports = {
  POINT_RULES,
  LEVELS,
  BADGES,
  pointsForReason,
  levelForPoints,
  currentStreak,
  evaluateBadges
};
