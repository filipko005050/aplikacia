/**
 * Práca s dátumami v pásme používateľa.
 *
 * Server na Renderi beží v UTC. Bez tohto by sa deň lámal o dve hodiny neskôr,
 * takže o 00:30 by appka ukazovala včerajšok a zápisy by padali do zlého dňa.
 */
const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Bratislava";

const DAYS = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  weekday: "short"
});

// en-CA dáva rovno tvar YYYY-MM-DD.
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

/** Deň v týždni v tvare, aký používa jedálniček. */
function todayName(now = new Date()) {
  return DAYS[WEEKDAY_INDEX[weekdayFormatter.format(now)]];
}

/** Dátum v pásme používateľa ako YYYY-MM-DD. */
function localDate(now = new Date()) {
  return isoDateFormatter.format(now);
}

/**
 * SQL výraz pre začiatok dňa v pásme používateľa, prevedený späť na
 * timestamptz, aby sa dal porovnať so stĺpcom timestamp.
 * `paramIndex` je poradie parametra, do ktorého sa pásmo pošle.
 */
function startOfTodaySql(paramIndex) {
  return `(date_trunc('day', NOW() AT TIME ZONE $${paramIndex}) AT TIME ZONE $${paramIndex})`;
}

/** To isté, ale posunuté o zadaný počet dní dozadu (0 = dnes). */
function startOfDaysAgoSql(tzParamIndex, daysParamIndex) {
  return `((date_trunc('day', NOW() AT TIME ZONE $${tzParamIndex}) - make_interval(days => $${daysParamIndex}::int)) AT TIME ZONE $${tzParamIndex})`;
}

/** Dátum záznamu v pásme používateľa - na zoskupovanie po dňoch. */
function localDateSql(column, tzParamIndex) {
  return `((${column} AT TIME ZONE $${tzParamIndex})::date)`;
}

module.exports = {
  APP_TIMEZONE,
  DAYS,
  todayName,
  localDate,
  startOfTodaySql,
  startOfDaysAgoSql,
  localDateSql
};
