const ACTIVITY_MULTIPLIERS = {
  "1-2x": 1.375,
  "3-4x": 1.55,
  "5-6x": 1.725,
  "7x": 1.9
};

/**
 * Tempo progresu. Kilogram tuku má približne 7700 kcal, takže 0,5 kg týždenne
 * zodpovedá zhruba 500 kcal dennému rozdielu - preto tieto hodnoty.
 * Kľúč je zároveň hodnotou v selecte aj tým, čo sa ukladá do profiles.pace.
 */
const PACE_OPTIONS = [
  { key: "0.25", label: "0,25 kg / týždeň", kcal: 250 },
  { key: "0.5", label: "0,5 kg / týždeň", kcal: 500 },
  { key: "1", label: "1 kg / týždeň", kcal: 1000 }
];

const PACE_KCAL = Object.fromEntries(PACE_OPTIONS.map((option) => [option.key, option.kcal]));
const DEFAULT_PACE = "0.5";

// Bezpečnostné hranice. Pri tempe 1 kg/týždeň by inak vyšli hodnoty,
// ktoré sa nedajú ani zjesť, ani odporučiť.
const MIN_CALORIES = { muz: 1500, zena: 1200 };
const MIN_FAT_PER_KG = 0.5; // pod túto hranicu sa tuky neznižujú
const MIN_CARBS_G = 50;

function round(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizePace(value) {
  return PACE_KCAL[String(value)] !== undefined ? String(value) : DEFAULT_PACE;
}

/** Rozdiel oproti TDEE: mínus pri chudnutí, plus pri naberaní, nula pri udržiavaní. */
function paceAdjustment(goal, pace) {
  if (goal === "udrzat") return 0;
  const kcal = PACE_KCAL[normalizePace(pace)];
  return goal === "nabrat" ? kcal : -kcal;
}

function calculateHealthMetrics({ height, weight, activityLevel, goal, age, gender, pace }) {
  const heightCm = Number(height);
  const weightKg = Number(weight);
  const ageYears = Number(age);
  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  const heightInchesOver152 = Math.max(0, (heightCm - 152) / 2.54);
  let devine = 50 + 2.3 * heightInchesOver152;
  let robinson = 52 + 1.9 * heightInchesOver152;

  if (gender === "zena") {
    devine = 45.5 + 2.3 * heightInchesOver152;
    robinson = 49 + 1.7 * heightInchesOver152;
  }

  const idealWeight = (devine + robinson) / 2;

  const genderOffset = gender === "zena" ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + genderOffset;
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.375);

  const normalizedPace = normalizePace(pace);
  const adjustment = paceAdjustment(goal, normalizedPace);
  const requested = tdee + adjustment;

  // Zvolené tempo môže vyjsť pod zdravé minimum - vtedy sa kalórie zdvihnú
  // a používateľ sa o tom dozvie.
  const floor = MIN_CALORIES[gender] || MIN_CALORIES.muz;
  let calories = Math.max(requested, floor);
  const raisedToFloor = calories > requested;

  const protein = 2 * weightKg;
  let fat = 0.8 * weightKg;
  let carbs = (calories - protein * 4 - fat * 9) / 4;
  let fatReduced = false;

  // Pri veľkom deficite by bielkoviny a tuky samy prekročili kalorický cieľ
  // a sacharidy by vyšli záporné. Ako prvé sa znižujú tuky, nikdy nie bielkoviny.
  if (carbs < MIN_CARBS_G) {
    const fatFloor = MIN_FAT_PER_KG * weightKg;
    const fatForTarget = (calories - protein * 4 - MIN_CARBS_G * 4) / 9;
    const adjustedFat = Math.max(fatFloor, Math.min(fat, fatForTarget));
    if (adjustedFat < fat) {
      fat = adjustedFat;
      fatReduced = true;
    }
    carbs = (calories - protein * 4 - fat * 9) / 4;
  }

  // Ak ani po znížení tukov sacharidy nestačia, cieľ sa zdvihne na minimum,
  // ktoré sa z týchto makier vôbec dá poskladať.
  let raisedForMacros = false;
  if (carbs < MIN_CARBS_G) {
    calories = protein * 4 + fat * 9 + MIN_CARBS_G * 4;
    carbs = MIN_CARBS_G;
    raisedForMacros = true;
  }

  const fiber = clamp((calories / 1000) * 12, 25, 35);

  return {
    bmi: round(bmi),
    idealWeight: round(idealWeight),
    calories: round(calories),
    protein: round(Math.max(0, protein)),
    carbs: round(Math.max(0, carbs)),
    fat: round(Math.max(0, fat)),
    fiber: round(Math.max(0, fiber)),
    // Kontext k výpočtu - UI z toho vysvetlí, prečo číslo vyzerá inak.
    tdee: round(tdee),
    pace: normalizedPace,
    paceAdjustment: adjustment,
    safetyAdjusted: raisedToFloor || raisedForMacros || fatReduced,
    safetyNote: buildSafetyNote({ raisedToFloor, raisedForMacros, fatReduced, floor })
  };
}

function buildSafetyNote({ raisedToFloor, raisedForMacros, fatReduced, floor }) {
  if (raisedForMacros) {
    return "Zvolené tempo by pri tvojej váhe nevyšlo - kalórie sú zdvihnuté na minimum, ktoré sa z bielkovín, tukov a sacharidov dá poskladať.";
  }
  if (raisedToFloor) {
    return `Zvolené tempo by kleslo pod zdravé minimum ${floor} kcal, preto sú kalórie zdvihnuté naň.`;
  }
  if (fatReduced) {
    return "Tuky sú znížené, aby sa do kalórií zmestili aj sacharidy. Bielkoviny ostávajú nedotknuté.";
  }
  return null;
}

module.exports = {
  calculateHealthMetrics,
  normalizePace,
  paceAdjustment,
  PACE_OPTIONS
};
