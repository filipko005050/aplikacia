const express = require("express");
const { query } = require("../db");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { calculateHealthMetrics } = require("../utils/calculator");
const { APP_TIMEZONE, localDate, startOfDaysAgoSql, localDateSql } = require("../utils/appTime");
const { levelForPoints, evaluateBadges, POINT_RULES } = require("../utils/gamification");
const { totalPoints } = require("../utils/points");

const router = express.Router();

const MEAL_TYPES_COUNT = 3;
const WEEK_DAYS = 7;

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Denné ciele podľa profilu. Bez profilu sa nedá porovnávať. */
async function profileTarget(userId) {
  const result = await query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
  const profile = result.rows[0];
  if (!profile) return null;

  return {
    profile,
    target: calculateHealthMetrics({
      height: Number(profile.height),
      weight: Number(profile.weight),
      activityLevel: profile.activity_level,
      goal: profile.goal,
      age: Number(profile.age),
      gender: profile.gender,
      pace: profile.pace
    })
  };
}

/** Odfajknuté jedlá zoskupené po dňoch (v pásme používateľa). */
async function dailyIntake(userId, days) {
  const result = await query(
    `SELECT ${localDateSql("c.timestamp", 2)} AS day,
            COUNT(*)::int AS meals,
            SUM(c.calories)::float AS calories,
            SUM(c.protein)::float AS protein,
            SUM(c.carbs)::float AS carbs,
            SUM(c.fat)::float AS fat,
            SUM(c.fiber)::float AS fiber
     FROM meal_checks c
     WHERE c.user_id = $1 AND c.timestamp >= ${startOfDaysAgoSql(2, 3)}
     GROUP BY 1
     ORDER BY 1 ASC`,
    [userId, APP_TIMEZONE, days - 1]
  );

  return result.rows.map((row) => ({
    day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10),
    meals: row.meals,
    calories: round(row.calories),
    protein: round(row.protein),
    carbs: round(row.carbs),
    fat: round(row.fat),
    fiber: round(row.fiber)
  }));
}

/**
 * Denné váhy - z každého dňa posledný zápis, nie priemer. Priemerovanie
 * skresľovalo smer: pri troch zápisoch za sebou (25, 40, 122 kg) vyšlo 62,33
 * a z poklesu 122 -> 90 sa stal nárast. Posledný zápis dňa je skutočná
 * nameraná hodnota a sedí s tým, čo ukazuje stránka Váha.
 */
async function dailyWeights(userId, days) {
  const result = await query(
    `SELECT DISTINCT ON (1) ${localDateSql("timestamp", 2)} AS day, weight::float AS weight
     FROM weights
     WHERE user_id = $1 AND timestamp >= ${startOfDaysAgoSql(2, 3)}
     ORDER BY 1 ASC, timestamp DESC`,
    [userId, APP_TIMEZONE, days - 1]
  );

  return result.rows.map((row) => ({
    day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10),
    weight: round(row.weight, 2)
  }));
}

function average(values) {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/* ---------------- Týždenný report ---------------- */

router.get(
  "/weekly-report",
  authenticate,
  asyncHandler(async (req, res) => {
    const [intake, weights, targetInfo] = await Promise.all([
      dailyIntake(req.user.id, WEEK_DAYS),
      dailyWeights(req.user.id, WEEK_DAYS),
      profileTarget(req.user.id)
    ]);

    const completeDays = intake.filter((day) => day.meals >= MEAL_TYPES_COUNT).length;
    const totalMeals = intake.reduce((sum, day) => sum + day.meals, 0);

    return res.json({
      days: WEEK_DAYS,
      intake,
      weights,
      target: targetInfo ? targetInfo.target : null,
      averages: {
        weight: average(weights.map((entry) => entry.weight)),
        // Priemer sa počíta len z dní, keď používateľ niečo odfajkol -
        // inak by prázdne dni umelo stlačili čísla nadol.
        calories: average(intake.map((day) => day.calories)),
        protein: average(intake.map((day) => day.protein)),
        carbs: average(intake.map((day) => day.carbs)),
        fat: average(intake.map((day) => day.fat))
      },
      completedMeals: totalMeals,
      completedDays: completeDays,
      trackedDays: intake.length
    });
  })
);

/* ---------------- Body, levely, odznaky ---------------- */

/** Dni, v ktorých bol splnený celý deň (3 jedlá). */
async function completeDayDates(userId, days) {
  const result = await query(
    `SELECT ${localDateSql("c.timestamp", 2)} AS day
     FROM meal_checks c
     WHERE c.user_id = $1 AND c.timestamp >= ${startOfDaysAgoSql(2, 3)}
     GROUP BY 1
     HAVING COUNT(DISTINCT c.meal_type) >= ${MEAL_TYPES_COUNT}
     ORDER BY 1 DESC`,
    [userId, APP_TIMEZONE, days - 1]
  );
  return result.rows.map((row) => String(row.day instanceof Date ? row.day.toISOString().slice(0, 10) : row.day).slice(0, 10));
}

/** Dni, v ktorých zjedené bielkoviny dosiahli cieľ. */
async function proteinGoalDates(userId, targetProtein, days) {
  if (!targetProtein) return [];

  const result = await query(
    `SELECT ${localDateSql("c.timestamp", 2)} AS day
     FROM meal_checks c
     WHERE c.user_id = $1 AND c.timestamp >= ${startOfDaysAgoSql(2, 3)}
     GROUP BY 1
     HAVING SUM(c.protein) >= $4
     ORDER BY 1 DESC`,
    [userId, APP_TIMEZONE, days - 1, targetProtein]
  );
  return result.rows.map((row) => String(row.day instanceof Date ? row.day.toISOString().slice(0, 10) : row.day).slice(0, 10));
}

/** Dni so zápisom váhy. */
async function weightDates(userId, days) {
  const result = await query(
    `SELECT DISTINCT ${localDateSql("timestamp", 2)} AS day
     FROM weights
     WHERE user_id = $1 AND timestamp >= ${startOfDaysAgoSql(2, 3)}
     ORDER BY 1 DESC`,
    [userId, APP_TIMEZONE, days - 1]
  );
  return result.rows.map((row) => String(row.day instanceof Date ? row.day.toISOString().slice(0, 10) : row.day).slice(0, 10));
}

router.get(
  "/achievements",
  authenticate,
  asyncHandler(async (req, res) => {
    const targetInfo = await profileTarget(req.user.id);
    const targetProtein = targetInfo ? targetInfo.target.protein : null;

    // Séria sa hľadá v okne 60 dní - dlhšie by nemalo zmysel počítať.
    const window = 60;
    const [points, completeDays, proteinDays, weights, history] = await Promise.all([
      totalPoints(req.user.id),
      completeDayDates(req.user.id, window),
      proteinGoalDates(req.user.id, targetProtein, window),
      weightDates(req.user.id, window),
      query(
        `SELECT reason, points, awarded_date
         FROM user_points
         WHERE user_id = $1
         ORDER BY awarded_date DESC, id DESC
         LIMIT 20`,
        [req.user.id]
      )
    ]);

    const badges = evaluateBadges(
      { completeDays, proteinDays, weightDays: weights },
      localDate()
    );

    return res.json({
      points,
      level: levelForPoints(points),
      badges,
      rules: Object.entries(POINT_RULES).map(([reason, rule]) => ({ reason, ...rule })),
      history: history.rows.map((row) => ({
        reason: row.reason,
        label: POINT_RULES[row.reason] ? POINT_RULES[row.reason].label : row.reason,
        points: row.points,
        date: String(row.awarded_date instanceof Date ? row.awarded_date.toISOString().slice(0, 10) : row.awarded_date).slice(0, 10)
      }))
    });
  })
);

/* ---------------- Odporúčania ---------------- */

/**
 * Odporúčania sú pravidlá nad dátami, nie jazykový model. Každé má podmienku,
 * ktorú vidno v kóde, takže sa dá overiť, prečo sa zobrazilo.
 */
function buildRecommendations({ weights, intake, target, profile, completedDays, trackedDays }) {
  const tips = [];

  if (!target) {
    tips.push({
      tone: "info",
      title: "Vyplň si profil",
      text: "Bez uložených makier sa nedá s čím porovnávať. Otvor kalkulačku a vypočítaj si ich."
    });
    return tips;
  }

  // --- Váha ---
  if (weights.length >= 2) {
    const first = weights[0].weight;
    const last = weights[weights.length - 1].weight;
    const change = round(last - first, 2);
    const goal = profile.goal;

    if (goal === "schudnut" && change < -0.1) {
      tips.push({
        tone: "good",
        title: "Váha ide správnym smerom",
        text: `Tvoja váha klesla o ${Math.abs(change)} kg, pokračuj.`
      });
    } else if (goal === "schudnut" && change > 0.3) {
      tips.push({
        tone: "warn",
        title: "Váha stúpla",
        text: `Váha stúpla o ${change} kg. Skontroluj, či sedia porcie a či nechýbajú odfajknuté jedlá.`
      });
    } else if (goal === "nabrat" && change > 0.1) {
      tips.push({
        tone: "good",
        title: "Naberáš podľa plánu",
        text: `Tvoja váha stúpla o ${change} kg, pokračuj.`
      });
    } else if (goal === "nabrat" && change < -0.3) {
      tips.push({
        tone: "warn",
        title: "Váha klesá",
        text: `Váha klesla o ${Math.abs(change)} kg, hoci chceš naberať. Skús pridať kalórie.`
      });
    } else {
      tips.push({
        tone: "info",
        title: "Váha je stabilná",
        text: `Za sledované obdobie sa zmenila o ${change} kg.`
      });
    }

    // Príliš rýchly úbytok je varovný signál - ale len keď váha naozaj klesla.
    // Math.abs() by tú istú hlášku spustil aj pri náraste a tvrdil by
    // používateľovi, že schudol, hoci pribral.
    const weeklyLoss = round(-change, 2);
    if (goal === "schudnut" && weeklyLoss > 1.2) {
      tips.push({
        tone: "warn",
        title: "Tempo je rýchle",
        text: `Za týždeň si zhodil ${weeklyLoss} kg. Tvoje tempo je rýchle, zváž pomalší cut.`
      });
    }
  } else {
    tips.push({
      tone: "info",
      title: "Zapisuj si váhu",
      text: "Zatiaľ nemáš dosť zápisov na porovnanie. Zapisuj váhu aspoň raz denne."
    });
  }

  // --- Makrá ---
  if (intake.length > 0) {
    const avgProtein = average(intake.map((day) => day.protein)) || 0;
    const avgCalories = average(intake.map((day) => day.calories)) || 0;

    if (avgProtein < target.protein * 0.8) {
      tips.push({
        tone: "warn",
        title: "Málo bielkovín",
        text: `Priemerne máš ${avgProtein} g bielkovín oproti cieľu ${target.protein} g. Makrá sú nízke, skús pridať viac bielkovín.`
      });
    } else if (avgProtein >= target.protein * 0.95) {
      tips.push({
        tone: "good",
        title: "Bielkoviny sedia",
        text: `Priemerne máš ${avgProtein} g bielkovín, cieľ je ${target.protein} g.`
      });
    }

    if (avgCalories < target.calories * 0.75) {
      tips.push({
        tone: "warn",
        title: "Málo kalórií",
        text: `Priemerne ješ ${avgCalories} kcal oproti cieľu ${Math.round(target.calories)} kcal. Príliš veľký deficit sa dlhodobo nedá udržať.`
      });
    } else if (avgCalories > target.calories * 1.15) {
      tips.push({
        tone: "warn",
        title: "Prekračuješ kalórie",
        text: `Priemerne ješ ${avgCalories} kcal oproti cieľu ${Math.round(target.calories)} kcal.`
      });
    }
  }

  // --- Disciplína ---
  if (trackedDays === 0) {
    tips.push({
      tone: "info",
      title: "Začni odfajkávať jedlá",
      text: "Zatiaľ nemáš odfajknuté žiadne jedlo. Bez toho sa progres nedá vyhodnotiť."
    });
  } else if (completedDays <= 2) {
    tips.push({
      tone: "warn",
      title: "Málo splnených dní",
      text: `Za posledný týždeň si splnil ${completedDays} dní. Splnil si málo dní, skús zvýšiť disciplínu.`
    });
  } else if (completedDays >= 6) {
    tips.push({
      tone: "good",
      title: "Výborná disciplína",
      text: `Splnil si ${completedDays} dní zo 7. Takto ďalej.`
    });
  }

  // --- Tempo ---
  if (profile.pace === "1" && profile.goal !== "udrzat") {
    tips.push({
      tone: "info",
      title: "Zvolené tempo je najrýchlejšie",
      text: "Tempo 1 kg za týždeň je náročné udržať. Ak sa cítiš vyčerpaný, zvoľ 0,5 kg."
    });
  }

  return tips;
}

router.get(
  "/recommendations",
  authenticate,
  asyncHandler(async (req, res) => {
    const [intake, weights, targetInfo] = await Promise.all([
      dailyIntake(req.user.id, WEEK_DAYS),
      dailyWeights(req.user.id, WEEK_DAYS),
      profileTarget(req.user.id)
    ]);

    const completedDays = intake.filter((day) => day.meals >= MEAL_TYPES_COUNT).length;

    const recommendations = buildRecommendations({
      weights,
      intake,
      target: targetInfo ? targetInfo.target : null,
      profile: targetInfo ? targetInfo.profile : null,
      completedDays,
      trackedDays: intake.length
    });

    return res.json({ recommendations, completedDays, trackedDays: intake.length });
  })
);

module.exports = router;
