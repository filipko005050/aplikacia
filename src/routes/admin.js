const express = require("express");
const { query } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { verifyCsrf } = require("../middleware/csrf");
const { parseBoundedNumber } = require("../utils/sanitize");
const { APP_TIMEZONE } = require("../utils/appTime");

const router = express.Router();

// Poradie je podstatné: najprv overenie tokenu proti DB (rieši aj ban),
// až potom kontrola roly. Obe bežia pred každou routou nižšie.
router.use(authenticate, requireRole("admin"));

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const usersResult = await query(
      "SELECT id, email, role, banned FROM users ORDER BY id ASC"
    );
    const profilesResult = await query(
      "SELECT user_id, name, height, weight, age, gender, activity_level, goal FROM profiles ORDER BY user_id ASC"
    );
    const mealsResult = await query(
      `SELECT user_id, day, meal_type, variant1, variant2, calories, protein, carbs, fat, fiber
       FROM meal_plans
       ORDER BY user_id ASC, id ASC`
    );

    const profilesByUser = new Map();
    profilesResult.rows.forEach((profile) => {
      profilesByUser.set(profile.user_id, profile);
    });

    const mealsByUser = new Map();
    mealsResult.rows.forEach((meal) => {
      const existing = mealsByUser.get(meal.user_id) || [];
      existing.push(meal);
      mealsByUser.set(meal.user_id, existing);
    });

    const users = usersResult.rows.map((user) => ({
      ...user,
      profile: profilesByUser.get(user.id) || null,
      mealPlan: mealsByUser.get(user.id) || []
    }));

    return res.json({ users });
  })
);

router.get(
  "/login-logs",
  asyncHandler(async (req, res) => {
    const limit = parseBoundedNumber(req.query.limit, 1, 200) || 50;
    const userId = req.query.userId ? parseBoundedNumber(req.query.userId, 1, 2147483647) : null;

    if (req.query.userId && userId === null) {
      return res.status(400).json({ message: "Neplatné ID používateľa." });
    }

    const result = await query(
      `SELECT l.id, l.user_id, l.email, l.timestamp, l.ip_address, l.user_agent, l.success,
              u.email AS current_email
       FROM login_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE ($1::int IS NULL OR l.user_id = $1)
       ORDER BY l.timestamp DESC
       LIMIT $2`,
      [userId, limit]
    );

    return res.json({ logs: result.rows });
  })
);

/**
 * Vymaže históriu prihlásení. Je to jediná čisto záznamová tabuľka v paneli -
 * ostatné čísla v analytike (počet používateľov, BMI, alergie, obľúbené jedlá)
 * sa rátajú naživo z účtov, takže sa nedajú vyčistiť bez zmazania samotných
 * účtov. Graf aktivity vychádza z prihlásení, preto sa vyprázdni tiež.
 */
router.post(
  "/login-logs/reset",
  verifyCsrf,
  asyncHandler(async (req, res) => {
    const result = await query("DELETE FROM login_logs");

    console.log(`[admin] ${req.user.email} vymazal históriu prihlásení (${result.rowCount} záznamov)`);

    return res.json({
      message: `Vymazaných ${result.rowCount} záznamov o prihlásení.`,
      deleted: result.rowCount
    });
  })
);

router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const [users, plans, allergies, favorites, profiles, signups] = await Promise.all([
      query("SELECT COUNT(*) FILTER (WHERE banned = false)::int AS active, COUNT(*) FILTER (WHERE banned)::int AS banned FROM users"),
      query("SELECT COUNT(DISTINCT user_id)::int AS users_with_plan, COUNT(*)::int AS rows FROM meal_plans"),
      // jsonb_array_elements_text rozbalí pole alergií na riadky, aby sa dali spočítať.
      query(
        `SELECT allergy, COUNT(*)::int AS count
         FROM profiles, jsonb_array_elements_text(allergies) AS allergy
         GROUP BY allergy
         ORDER BY count DESC, allergy ASC`
      ),
      query(
        `SELECT meal_name, COUNT(*)::int AS count
         FROM favorite_meals
         GROUP BY meal_name
         ORDER BY count DESC, meal_name ASC
         LIMIT 10`
      ),
      query("SELECT height, weight, pace FROM profiles"),
      // Prihlásenia za 30 dní - registrácia sa nesleduje, prvé prihlásenie
      // je najbližší dostupný ukazovateľ aktivity.
      query(
        `SELECT (timestamp AT TIME ZONE $1)::date AS day, COUNT(DISTINCT user_id)::int AS count
         FROM login_logs
         WHERE success = true AND timestamp >= NOW() - INTERVAL '30 days'
         GROUP BY 1
         ORDER BY 1 ASC`,
        [APP_TIMEZONE]
      )
    ]);

    // Priemerné BMI sa počíta z výšky a váhy, nie z uloženého čísla.
    const bmis = profiles.rows
      .map((row) => {
        const heightM = Number(row.height) / 100;
        return heightM > 0 ? Number(row.weight) / (heightM * heightM) : null;
      })
      .filter((value) => value !== null && Number.isFinite(value));

    const paceValues = profiles.rows.map((row) => Number(row.pace)).filter((value) => Number.isFinite(value));
    const round = (value, d = 2) => Math.round(value * 10 ** d) / 10 ** d;
    const average = (list) => (list.length > 0 ? round(list.reduce((a, b) => a + b, 0) / list.length) : null);

    return res.json({
      users: {
        active: users.rows[0].active,
        banned: users.rows[0].banned,
        // Aplikácia nemá platený režim - pole je tu kvôli úplnosti prehľadu.
        premium: 0,
        premiumSupported: false
      },
      mealPlans: {
        usersWithPlan: plans.rows[0].users_with_plan,
        rows: plans.rows[0].rows
      },
      allergies: allergies.rows,
      favorites: favorites.rows,
      averageBmi: average(bmis),
      averagePace: average(paceValues),
      signupsByDay: signups.rows.map((row) => ({
        day: String(row.day instanceof Date ? row.day.toISOString().slice(0, 10) : row.day).slice(0, 10),
        count: row.count
      }))
    });
  })
);

/** Zmena banned stavu. Zvýšenie token_version odhlási používateľa okamžite. */
async function setBanned(req, res, banned) {
  const userId = parseBoundedNumber(req.params.userId, 1, 2147483647);
  if (userId === null) {
    return res.status(400).json({ message: "Neplatné ID používateľa." });
  }

  if (banned && userId === req.user.id) {
    return res.status(400).json({ message: "Nemôžeš zabanovať sám seba." });
  }

  const target = await query("SELECT id, email, role FROM users WHERE id = $1", [userId]);
  if (target.rows.length === 0) {
    return res.status(404).json({ message: "Používateľ neexistuje." });
  }

  if (banned && target.rows[0].role === "admin") {
    return res.status(400).json({ message: "Iného admina zabanovať nemôžeš." });
  }

  const updated = await query(
    `UPDATE users
     SET banned = $2,
         token_version = token_version + 1
     WHERE id = $1
     RETURNING id, email, role, banned`,
    [userId, banned]
  );

  console.log(
    `[admin] ${req.user.email} ${banned ? "zabanoval" : "odbanoval"} používateľa ${target.rows[0].email}`
  );

  return res.json({
    message: banned ? "Používateľ bol zabanovaný." : "Používateľ bol odbanovaný.",
    user: updated.rows[0]
  });
}

router.post(
  "/users/:userId/ban",
  verifyCsrf,
  asyncHandler((req, res) => setBanned(req, res, true))
);

router.post(
  "/users/:userId/unban",
  verifyCsrf,
  asyncHandler((req, res) => setBanned(req, res, false))
);

module.exports = router;
