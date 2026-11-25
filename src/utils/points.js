const { query } = require("../db");
const { pointsForReason } = require("./gamification");
const { localDate } = require("./appTime");

/**
 * Pripíše body za daný dôvod. Vďaka unikátnemu indexu
 * (user_id, reason, awarded_date) sa to isté ocenenie v jeden deň nezapíše
 * dvakrát - opakované odfajknutie ani prepnutie variantu body nezduplikuje.
 * Vracia true, ak body naozaj pribudli.
 */
async function awardPoints(userId, reason, date = localDate()) {
  const points = pointsForReason(reason);
  if (points === 0) return false;

  const result = await query(
    `INSERT INTO user_points (user_id, points, reason, awarded_date)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, reason, awarded_date) DO NOTHING
     RETURNING id`,
    [userId, points, reason, date]
  );

  return result.rows.length > 0;
}

/** Celkový počet bodov používateľa. */
async function totalPoints(userId) {
  const result = await query(
    "SELECT COALESCE(SUM(points), 0)::int AS total FROM user_points WHERE user_id = $1",
    [userId]
  );
  return result.rows[0].total;
}

module.exports = { awardPoints, totalPoints };
