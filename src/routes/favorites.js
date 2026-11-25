const express = require("express");
const { query } = require("../db");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { verifyCsrf } = require("../middleware/csrf");
const { parseBoundedNumber, sanitizeText } = require("../utils/sanitize");

const router = express.Router();

/**
 * Obľúbené jedlá sa vedú podľa NÁZVU, nie podľa meal_id. Jedálniček sa pri
 * regenerácii prepisuje a pôvodné meals riadky zmiznú - podľa id by obľúbené
 * jedlo zaniklo spolu s nimi.
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT f.id, f.meal_name, f.timestamp, f.meal_id,
              m.calories, m.protein, m.carbs, m.fat, m.fiber
       FROM favorite_meals f
       LEFT JOIN meals m ON m.id = f.meal_id
       WHERE f.user_id = $1
       ORDER BY f.timestamp DESC`,
      [req.user.id]
    );

    return res.json({ favorites: result.rows });
  })
);

router.post(
  "/",
  authenticate,
  verifyCsrf,
  asyncHandler(async (req, res) => {
    const mealId = parseBoundedNumber(req.body && req.body.mealId, 1, 2147483647);
    if (mealId === null) {
      return res.status(400).json({ message: "Neplatné jedlo." });
    }

    const mealResult = await query("SELECT id, name FROM meals WHERE id = $1", [mealId]);
    const meal = mealResult.rows[0];
    if (!meal) {
      return res.status(404).json({ message: "Jedlo neexistuje." });
    }

    // Názov ide cez sanitizáciu - zobrazuje sa aj v admin analytike.
    const name = sanitizeText(meal.name, 120);

    await query(
      `INSERT INTO favorite_meals (user_id, meal_id, meal_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, meal_name)
       DO UPDATE SET meal_id = EXCLUDED.meal_id`,
      [req.user.id, mealId, name]
    );

    return res.status(201).json({ message: "Pridané medzi obľúbené.", mealName: name });
  })
);

/** Odobranie z obľúbených. POST, lebo CORS povoľuje len GET a POST. */
router.post(
  "/remove",
  authenticate,
  verifyCsrf,
  asyncHandler(async (req, res) => {
    const name = sanitizeText(req.body && req.body.mealName, 120);
    if (!name) {
      return res.status(400).json({ message: "Chýba názov jedla." });
    }

    await query("DELETE FROM favorite_meals WHERE user_id = $1 AND meal_name = $2", [req.user.id, name]);
    return res.json({ message: "Odobrané z obľúbených." });
  })
);

module.exports = router;
