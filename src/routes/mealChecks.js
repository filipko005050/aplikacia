const express = require("express");
const { pool, query } = require("../db");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { verifyCsrf } = require("../middleware/csrf");
const { calculateHealthMetrics } = require("../utils/calculator");
const { parseBoundedNumber } = require("../utils/sanitize");
const { APP_TIMEZONE, todayName, localDate, startOfTodaySql } = require("../utils/appTime");
const { awardPoints } = require("../utils/points");

const router = express.Router();

const MEAL_TYPES = ["ranajky", "obed", "vecera"];
const MACRO_KEYS = ["calories", "protein", "carbs", "fat", "fiber"];

function round(value) {
  return Math.round(value * 10) / 10;
}

/** Jedlá pre daný deň aj s makrami oboch variantov. */
async function mealsForDay(userId, day) {
  const result = await query(
    `SELECT mp.id, mp.day, mp.meal_type, mp.variant1, mp.variant2,
            mp.variant1_meal_id, mp.variant2_meal_id,
            mp.calories, mp.protein, mp.carbs, mp.fat, mp.fiber,
            m1.calories AS variant1_calories, m1.protein AS variant1_protein,
            m1.carbs AS variant1_carbs, m1.fat AS variant1_fat, m1.fiber AS variant1_fiber,
            m2.calories AS variant2_calories, m2.protein AS variant2_protein,
            m2.carbs AS variant2_carbs, m2.fat AS variant2_fat, m2.fiber AS variant2_fiber
     FROM meal_plans mp
     LEFT JOIN meals m1 ON m1.id = mp.variant1_meal_id
     LEFT JOIN meals m2 ON m2.id = mp.variant2_meal_id
     WHERE mp.user_id = $1 AND mp.day = $2
     ORDER BY mp.id ASC`,
    [userId, day]
  );

  // Poradie raňajky - obed - večera bez ohľadu na poradie v databáze.
  return result.rows.sort((a, b) => MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type));
}

/** Dnešné odfajknutia aj s makrami zvoleného jedla. */
async function checksForToday(userId) {
  const result = await query(
    // Číta sa z kópie v meal_checks, nie cez JOIN - jedálniček sa môže
    // medzitým prepísať a história to musí prežiť.
    `SELECT c.id, c.meal_plan_id, c.meal_id, c.timestamp,
            c.meal_type, c.meal_name AS name,
            c.calories, c.protein, c.carbs, c.fat, c.fiber
     FROM meal_checks c
     WHERE c.user_id = $1 AND c.timestamp >= ${startOfTodaySql(2)}
     ORDER BY c.timestamp ASC`,
    [userId, APP_TIMEZONE]
  );

  return result.rows.map((row) => ({
    id: row.id,
    mealPlanId: row.meal_plan_id,
    mealId: row.meal_id,
    mealType: row.meal_type,
    name: row.name,
    timestamp: row.timestamp,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    fiber: Number(row.fiber)
  }));
}

/** Denné ciele z profilu. Bez profilu sa tracker nedá počítať. */
async function dailyTarget(userId) {
  const result = await query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
  const profile = result.rows[0];
  if (!profile) return null;

  return calculateHealthMetrics({
    height: Number(profile.height),
    weight: Number(profile.weight),
    activityLevel: profile.activity_level,
    goal: profile.goal,
    age: Number(profile.age),
    gender: profile.gender,
    pace: profile.pace
  });
}

/** Zloží prehľad: zjedol, cieľ a koľko zostáva. */
function buildSummary(checks, target) {
  const consumed = {};
  for (const key of MACRO_KEYS) {
    consumed[key] = round(checks.reduce((sum, check) => sum + check[key], 0));
  }

  if (!target) {
    return { consumed, target: null, remaining: null };
  }

  const remaining = {};
  for (const key of MACRO_KEYS) {
    // Zámerne aj záporné - používateľ musí vidieť, že cieľ prekročil.
    remaining[key] = round(target[key] - consumed[key]);
  }

  return { consumed, target, remaining };
}

async function respondWithDay(req, res) {
  const day = todayName();
  const [meals, checks, target] = await Promise.all([
    mealsForDay(req.user.id, day),
    checksForToday(req.user.id),
    dailyTarget(req.user.id)
  ]);

  return res.json({ day, meals, checks, ...buildSummary(checks, target) });
}

router.get("/today", authenticate, asyncHandler(respondWithDay));

router.post(
  "/",
  authenticate,
  verifyCsrf,
  asyncHandler(async (req, res) => {
    const mealPlanId = parseBoundedNumber(req.body && req.body.mealPlanId, 1, 2147483647);
    const mealId = parseBoundedNumber(req.body && req.body.mealId, 1, 2147483647);

    if (mealPlanId === null || mealId === null) {
      return res.status(400).json({ message: "Neplatné jedlo." });
    }

    const planResult = await query(
      `SELECT id, meal_type, variant1_meal_id, variant2_meal_id
       FROM meal_plans
       WHERE id = $1 AND user_id = $2`,
      [mealPlanId, req.user.id]
    );
    const plan = planResult.rows[0];

    if (!plan) {
      return res.status(404).json({ message: "Toto jedlo nie je v tvojom jedálničku." });
    }

    // Odfajknúť sa dá len jeden z dvoch variantov daného riadku.
    if (Number(plan.variant1_meal_id) !== mealId && Number(plan.variant2_meal_id) !== mealId) {
      return res.status(400).json({ message: "Toto jedlo nepatrí k danému chodu." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Na jeden typ jedla pripadá jeden zápis denne, takže nový výber
      // ten predchádzajúci nahradí. Tým je strop 3 záznamy na deň splnený.
      await client.query(
        `DELETE FROM meal_checks
         WHERE user_id = $1
           AND meal_type = $2
           AND timestamp >= ${startOfTodaySql(3)}`,
        [req.user.id, plan.meal_type, APP_TIMEZONE]
      );

      // Makrá sa kopírujú priamo do záznamu, aby história prežila
      // regeneráciu jedálnička, ktorá pôvodné meals riadky zmaže.
      await client.query(
        `INSERT INTO meal_checks
           (user_id, meal_plan_id, meal_id, meal_type, meal_name, calories, protein, carbs, fat, fiber)
         SELECT $1, $2, $3, $4, m.name, m.calories, m.protein, m.carbs, m.fat, m.fiber
         FROM meals m
         WHERE m.id = $3`,
        [req.user.id, mealPlanId, mealId, plan.meal_type]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await awardForToday(req.user.id, plan.meal_type);
    return respondWithDay(req, res);
  })
);

/**
 * Body za odfajknuté jedlo a bonus za kompletný deň.
 * Zápis je idempotentný, takže prepnutie variantu ani opakovaný klik
 * body nezduplikuje.
 */
async function awardForToday(userId, mealType) {
  await awardPoints(userId, `meal:${mealType}`, localDate());

  const completed = await query(
    `SELECT COUNT(DISTINCT meal_type)::int AS done
     FROM meal_checks
     WHERE user_id = $1 AND timestamp >= ${startOfTodaySql(2)}`,
    [userId, APP_TIMEZONE]
  );

  if (completed.rows[0].done >= MEAL_TYPES.length) {
    await awardPoints(userId, "day:complete", localDate());
  }
}

/**
 * Zrušenie odfajknutia. Zámerne POST a nie DELETE - CORS v tejto aplikácii
 * povoľuje len GET a POST, aby sa nemuselo rozširovať kvôli jednej akcii.
 */
router.post(
  "/uncheck",
  authenticate,
  verifyCsrf,
  asyncHandler(async (req, res) => {
    const mealPlanId = parseBoundedNumber(req.body && req.body.mealPlanId, 1, 2147483647);
    if (mealPlanId === null) {
      return res.status(400).json({ message: "Neplatné jedlo." });
    }

    await query(
      `DELETE FROM meal_checks
       WHERE user_id = $1 AND meal_plan_id = $2 AND timestamp >= ${startOfTodaySql(3)}`,
      [req.user.id, mealPlanId, APP_TIMEZONE]
    );

    return respondWithDay(req, res);
  })
);

module.exports = router;
