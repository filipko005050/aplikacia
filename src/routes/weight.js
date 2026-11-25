const express = require("express");
const { query } = require("../db");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { verifyCsrf } = require("../middleware/csrf");
const { parseBoundedNumber } = require("../utils/sanitize");
const { localDate } = require("../utils/appTime");
const { awardPoints } = require("../utils/points");

const router = express.Router();

const MIN_WEIGHT = 20;
const MAX_WEIGHT = 400;
const DEFAULT_HISTORY = 90;

/** Zápisy od najstaršieho po najnovší - v tomto poradí ich kreslí graf. */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const limit = parseBoundedNumber(req.query.limit, 1, 365) || DEFAULT_HISTORY;

    const result = await query(
      `SELECT id, weight, timestamp
       FROM weights
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [req.user.id, limit]
    );

    const entries = result.rows.reverse().map((row) => ({
      id: row.id,
      weight: Number(row.weight),
      timestamp: row.timestamp
    }));

    return res.json({
      entries,
      latest: entries.length > 0 ? entries[entries.length - 1] : null
    });
  })
);

router.post(
  "/",
  authenticate,
  verifyCsrf,
  asyncHandler(async (req, res) => {
    const weight = parseBoundedNumber(req.body && req.body.weight, MIN_WEIGHT, MAX_WEIGHT);

    if (weight === null) {
      return res.status(400).json({ message: `Zadaj váhu v rozsahu ${MIN_WEIGHT} až ${MAX_WEIGHT} kg.` });
    }

    const inserted = await query(
      `INSERT INTO weights (user_id, weight)
       VALUES ($1, $2)
       RETURNING id, weight, timestamp`,
      [req.user.id, Math.round(weight * 100) / 100]
    );

    // Body za zápis váhy sa udelia raz denne, nech používateľ zapíše koľkokrát chce.
    const awarded = await awardPoints(req.user.id, "weight", localDate());

    const row = inserted.rows[0];
    return res.status(201).json({
      message: awarded ? "Váha bola zapísaná. +5 bodov" : "Váha bola zapísaná.",
      entry: { id: row.id, weight: Number(row.weight), timestamp: row.timestamp },
      pointsAwarded: awarded ? 5 : 0
    });
  })
);

module.exports = router;
