const express = require("express");
const rateLimit = require("express-rate-limit");
const { query } = require("../db");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { verifyCsrf } = require("../middleware/csrf");
const { sanitizeText, normalizeEmail } = require("../utils/sanitize");

const router = express.Router();

const MAX_MESSAGE_LENGTH = 2000;

// Strop na odosielanie, aby sa tabuľka správ nedala zaplaviť.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Priveľa odoslaných správ. Skús to neskôr." }
});

router.post(
  "/",
  authenticate,
  verifyCsrf,
  contactLimiter,
  asyncHandler(async (req, res) => {
    // Správy číta admin v paneli - HTML a JS z nich ide preč hneď na vstupe.
    const name = sanitizeText(req.body && req.body.name, 80);
    const email = normalizeEmail(req.body && req.body.email);
    const message = sanitizeText(req.body && req.body.message, MAX_MESSAGE_LENGTH);

    if (!name) {
      return res.status(400).json({ message: "Zadaj svoje meno." });
    }
    if (!email) {
      return res.status(400).json({ message: "Zadaj platnú emailovú adresu." });
    }
    if (message.length < 3) {
      return res.status(400).json({ message: "Správa je príliš krátka." });
    }

    await query(
      `INSERT INTO messages (user_id, name, email, message)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, name, email, message]
    );

    return res.status(201).json({ message: "Správa bola odoslaná. Ďakujeme!" });
  })
);

module.exports = router;
