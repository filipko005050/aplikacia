const DAYS = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
const MEAL_TYPES = ["ranajky", "obed", "vecera"];
const MEAL_SPLIT = {
  ranajky: 0.3,
  obed: 0.4,
  vecera: 0.3
};

const TEMPLATES_PER_MEAL_TYPE = 14; // 7 dní x 2 varianty

/**
 * Povolené sú výhradne základné potraviny. Hodnoty sú na 100 g suroviny
 * (obilniny a cestoviny suché), `carbs` sú celkové sacharidy vrátane vlákniny.
 *
 * `allergens` - zoznam alergénov, kvôli ktorým sa surovina vylúči.
 * `min` / `max` - reálne porcie v jednom jedle, držia gramáže v jedlej rovine.
 * `form`        - tvar do názvu jedla ("Kuracie mäso s ryžou a brokolicou").
 */
const FOODS = {
  // --- Bielkoviny: mäso ---
  kuracie: { name: "Kuracie mäso", protein: 31, carbs: 0, fat: 3.6, fiber: 0, allergens: [], min: 40, max: 350, withForm: "s kuracím mäsom" },
  morcacie: { name: "Morčacie mäso", protein: 29, carbs: 0, fat: 1.9, fiber: 0, allergens: [], min: 40, max: 350, withForm: "s morčacím mäsom" },
  hovadzie: { name: "Hovädzie mäso", protein: 26, carbs: 0, fat: 8, fiber: 0, allergens: [], min: 40, max: 320, withForm: "s hovädzím mäsom" },

  // --- Bielkoviny: ryby ---
  losos: { name: "Losos", protein: 20, carbs: 0, fat: 13, fiber: 0, allergens: ["ryby"], min: 40, max: 220, withForm: "s lososom" },
  treska: { name: "Treska", protein: 18, carbs: 0, fat: 0.7, fiber: 0, allergens: ["ryby"], min: 40, max: 380, withForm: "s treskou" },
  tuniak: { name: "Tuniak", protein: 24, carbs: 0, fat: 1, fiber: 0, allergens: ["ryby"], min: 40, max: 320, withForm: "s tuniakom" },

  // --- Bielkoviny: ostatné ---
  vajcia: { name: "Vajcia", protein: 13, carbs: 1.1, fat: 10, fiber: 0, allergens: ["vajcia"], min: 50, max: 300, withForm: "s vajcami" },
  tofu: { name: "Tofu", protein: 12, carbs: 1.9, fat: 7, fiber: 1, allergens: ["soja"], min: 50, max: 300, withForm: "s tofu" },
  skyr: { name: "Skyr", protein: 11, carbs: 4, fat: 0.2, fiber: 0, allergens: ["laktoza"], min: 80, max: 550, withForm: "so skyrom" },
  tvaroh: { name: "Tvaroh", protein: 12, carbs: 3.5, fat: 0.5, fiber: 0, allergens: ["laktoza"], min: 80, max: 500, withForm: "s tvarohom" },
  cottage: { name: "Cottage cheese", protein: 12, carbs: 3.4, fat: 4.3, fiber: 0, allergens: ["laktoza"], min: 80, max: 500, withForm: "s cottage cheese" },
  biely_jogurt: { name: "Biely jogurt", protein: 5, carbs: 6, fat: 3, fiber: 0, allergens: ["laktoza"], min: 100, max: 600, withForm: "s bielym jogurtom" },
  sunka: { name: "Šunka", protein: 18, carbs: 1, fat: 4, fiber: 0, allergens: [], min: 30, max: 260, withForm: "so šunkou" },

  // --- Sacharidy ---
  // Ovsené vločky aj bežné cestoviny sa pri bezlepkovej diéte vylučujú.
  ovsene_vlocky: { name: "Ovsené vločky", protein: 13.2, carbs: 60, fat: 6.5, fiber: 10, allergens: ["lepok"], min: 15, max: 420, form: "s ovsenými vločkami" },
  cestoviny: { name: "Cestoviny", protein: 13, carbs: 63, fat: 2.5, fiber: 8, allergens: ["lepok"], min: 15, max: 420, form: "s cestovinami" },
  ryza: { name: "Ryža", protein: 7, carbs: 79, fat: 0.6, fiber: 1.3, allergens: [], min: 15, max: 450, form: "s ryžou" },
  quinoa: { name: "Quinoa", protein: 14, carbs: 64, fat: 6, fiber: 7, allergens: [], min: 15, max: 420, form: "s quinoou" },
  zemiaky: { name: "Zemiaky", protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, allergens: [], min: 60, max: 1400, form: "so zemiakmi" },
  bataty: { name: "Sladké zemiaky", protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, allergens: [], min: 60, max: 1200, form: "so sladkými zemiakmi" },
  chlieb: { name: "Celozrnný chlieb", protein: 9, carbs: 41, fat: 3.5, fiber: 7, allergens: ["lepok"], min: 20, max: 500, form: "s toastom" },
  musli: { name: "Müsli", protein: 10, carbs: 60, fat: 8, fiber: 9, allergens: ["lepok"], min: 15, max: 200, form: "s müsli" },

  // --- Tuky ---
  orechy: { name: "Orechy", protein: 21, carbs: 22, fat: 50, fiber: 12, allergens: ["orechy"], min: 5, max: 70 },
  olivovy_olej: { name: "Olivový olej", protein: 0, carbs: 0, fat: 100, fiber: 0, allergens: [], min: 2, max: 45 },
  syr: { name: "Syr", protein: 25, carbs: 1.3, fat: 26, fiber: 0, allergens: ["laktoza"], min: 15, max: 120 },

  // --- Zelenina ---
  brokolica: { name: "Brokolica", protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, allergens: [], min: 30, max: 450, form: "a brokolicou" },
  paprika: { name: "Paprika", protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, allergens: [], min: 30, max: 450, form: "a paprikou" },
  paradajky: { name: "Paradajky", protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, allergens: [], min: 30, max: 500, form: "a paradajkami" },
  uhorka: { name: "Uhorka", protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, allergens: [], min: 30, max: 500, form: "a uhorkou" },
  spenat: { name: "Špenát", protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, allergens: [], min: 30, max: 400, form: "a špenátom" },
  salat: { name: "Šalát", protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, allergens: [], min: 30, max: 400, form: "a šalátom" },

  // --- Ovocie ---
  jablko: { name: "Jablko", protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, allergens: [], min: 30, max: 450, form: "a jablkom" },
  banan: { name: "Banán", protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, allergens: [], min: 30, max: 400, form: "a banánom" },
  maliny: { name: "Maliny", protein: 1.2, carbs: 12, fat: 0.7, fiber: 6.5, allergens: [], min: 30, max: 350, form: "a malinami" },
  cucoriedky: { name: "Čučoriedky", protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, allergens: [], min: 30, max: 400, form: "a čučoriedkami" }
};

/**
 * Z čoho sa skladá ktoré jedlo. Recepty sa nepíšu ručne - poskladajú sa
 * z týchto zoznamov, takže po vyradení alergénov vždy ostane platná ponuka.
 *
 * `protein`      - obvyklé zdroje pre daný typ jedla
 * `proteinBackup`- použijú sa, až keď alergie vyradia všetky obvyklé
 * `fiber`        - zelenina/ovocie s dostatkom vlákniny (nesie vlákninový cieľ)
 * `fiberGarnish` - doplnková zelenina; sama by vlákninu nepokryla, ale dodá pestrosť
 */
const MEAL_COMPONENTS = {
  ranajky: {
    protein: ["skyr", "tvaroh", "cottage", "vajcia", "biely_jogurt", "sunka"],
    proteinBackup: ["kuracie", "morcacie", "tofu", "tuniak"],
    carbs: ["ovsene_vlocky", "musli", "chlieb", "ryza", "quinoa"],
    fat: ["orechy", "syr", "olivovy_olej"],
    fiber: ["banan", "jablko", "cucoriedky", "paradajky", "spenat"],
    // Maliny majú najviac vlákniny na gram sacharidov zo všetkého povoleného
    // ovocia. Sú v každých raňajkách, aby sa vláknina dala pokryť bez toho,
    // aby sladké ovocie prestrelilo sacharidový cieľ.
    fiberGarnish: ["maliny"]
  },
  obed: {
    protein: ["kuracie", "morcacie", "hovadzie", "losos", "treska", "tuniak", "tofu", "vajcia"],
    proteinBackup: ["cottage", "tvaroh", "sunka"],
    carbs: ["ryza", "zemiaky", "bataty", "cestoviny", "quinoa", "chlieb"],
    fat: ["olivovy_olej", "orechy", "syr"],
    fiber: ["brokolica", "paprika", "spenat"],
    fiberGarnish: ["paradajky", "salat", "uhorka"]
  },
  vecera: {
    protein: ["treska", "kuracie", "tuniak", "morcacie", "tofu", "vajcia", "cottage", "hovadzie", "sunka", "tvaroh", "skyr"],
    proteinBackup: ["biely_jogurt"],
    carbs: ["zemiaky", "ryza", "quinoa", "bataty", "cestoviny", "chlieb"],
    fat: ["olivovy_olej", "orechy", "syr"],
    // Večera môže byť aj tvarohová/skyrová misa, preto je medzi možnosťami aj ovocie.
    fiber: ["spenat", "brokolica", "paprika", "jablko", "maliny"],
    fiberGarnish: ["salat", "paradajky", "uhorka"]
  }
};

/**
 * Konkrétne jedlá, nie kombinácie surovín. Skladať jedlo automaticky zo
 * zoznamov (bielkovina x príloha x zelenina) dá síce správne makrá, ale aj
 * nezmysly typu "cottage cheese s ryžou a čučoriedkami". Preto sú tu recepty
 * napísané ručne - dopočítavajú sa už len gramáže.
 *
 * `meals` - pri ktorých chodoch sa jedlo ponúkne
 * `items` - [surovina, skupina]; skupina určuje, ktoré makro surovina ladí
 *           (protein / carbs / fat / fiber)
 *
 * Alergie recept vyradia celý, keď obsahuje čo i len jednu zakázanú surovinu.
 */
const RECIPES = [
  // --- Raňajky: ovsená kaša ---
  {
    name: "Ovsená kaša so skyrom a banánom",
    meals: ["ranajky"],
    items: [["skyr", "protein"], ["ovsene_vlocky", "carbs"], ["orechy", "fat"], ["banan", "fiber"], ["maliny", "fiber"]]
  },
  {
    name: "Ovsená kaša s tvarohom a malinami",
    meals: ["ranajky"],
    items: [["tvaroh", "protein"], ["ovsene_vlocky", "carbs"], ["orechy", "fat"], ["maliny", "fiber"], ["jablko", "fiber"]]
  },
  {
    name: "Ovsená kaša s bielym jogurtom a čučoriedkami",
    meals: ["ranajky"],
    items: [["biely_jogurt", "protein"], ["skyr", "protein"], ["ovsene_vlocky", "carbs"], ["orechy", "fat"], ["cucoriedky", "fiber"], ["maliny", "fiber"]]
  },
  {
    name: "Ovsená kaša s jablkom a orechmi",
    meals: ["ranajky"],
    items: [["skyr", "protein"], ["ovsene_vlocky", "carbs"], ["orechy", "fat"], ["jablko", "fiber"], ["maliny", "fiber"]]
  },

  // --- Raňajky: jogurt a müsli ---
  {
    name: "Biely jogurt s müsli a čučoriedkami",
    meals: ["ranajky"],
    items: [["biely_jogurt", "protein"], ["skyr", "protein"], ["musli", "carbs"], ["orechy", "fat"], ["cucoriedky", "fiber"], ["maliny", "fiber"]]
  },
  {
    name: "Skyr s müsli a malinami",
    meals: ["ranajky"],
    items: [["skyr", "protein"], ["musli", "carbs"], ["orechy", "fat"], ["maliny", "fiber"], ["banan", "fiber"]]
  },
  {
    name: "Tvaroh s müsli a banánom",
    meals: ["ranajky"],
    items: [["tvaroh", "protein"], ["musli", "carbs"], ["orechy", "fat"], ["banan", "fiber"], ["maliny", "fiber"]]
  },

  // --- Raňajky: vajcia ---
  {
    name: "Praženica so šunkou a paradajkami",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["uhorka", "fiber"]]
  },
  {
    name: "Praženica so špenátom a toastom",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Volské oká s toastom a paradajkami",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["uhorka", "fiber"]]
  },
  {
    name: "Omeleta so syrom a paprikou",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["chlieb", "carbs"], ["syr", "fat"], ["paprika", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Omeleta so šunkou a špenátom",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Praženica so zemiakmi a paprikou",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Omeleta so zemiakmi a špenátom",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },

  {
    name: "Volské oká so zemiakmi a paradajkami",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["uhorka", "fiber"]]
  },
  {
    name: "Praženica so zemiakmi a paradajkami",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["spenat", "fiber"]]
  },
  {
    name: "Omeleta so sladkými zemiakmi a paprikou",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["bataty", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["paradajky", "fiber"]]
  },

  // --- Raňajky: toast ---
  {
    name: "Toast so šunkou a syrom",
    meals: ["ranajky"],
    items: [["sunka", "protein"], ["chlieb", "carbs"], ["syr", "fat"], ["paradajky", "fiber"], ["uhorka", "fiber"]]
  },
  {
    name: "Toast s tvarohom a paradajkami",
    meals: ["ranajky"],
    items: [["tvaroh", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["uhorka", "fiber"]]
  },
  {
    name: "Toast s cottage cheese a uhorkou",
    meals: ["ranajky"],
    items: [["cottage", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["uhorka", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Toast s vajcom a paradajkami",
    meals: ["ranajky"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["spenat", "fiber"]]
  },

  // --- Raňajky: bezlepkové kaše ---
  {
    name: "Ryžová kaša s jablkom a škoricou",
    meals: ["ranajky"],
    items: [["skyr", "protein"], ["ryza", "carbs"], ["orechy", "fat"], ["jablko", "fiber"], ["maliny", "fiber"]]
  },
  {
    name: "Ryžová kaša s bielym jogurtom a malinami",
    meals: ["ranajky"],
    items: [["biely_jogurt", "protein"], ["skyr", "protein"], ["ryza", "carbs"], ["orechy", "fat"], ["maliny", "fiber"], ["banan", "fiber"]]
  },
  {
    name: "Quinoa kaša s banánom a orechmi",
    meals: ["ranajky"],
    items: [["skyr", "protein"], ["quinoa", "carbs"], ["orechy", "fat"], ["banan", "fiber"], ["maliny", "fiber"]]
  },

  // --- Raňajky bez mliečnych výrobkov, lepku aj vajec ---
  {
    name: "Tofu praženica so zemiakmi",
    meals: ["ranajky"],
    items: [["tofu", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["spenat", "fiber"]]
  },
  {
    name: "Kuracia miska s ryžou a zeleninou",
    meals: ["ranajky"],
    lastResort: true,
    items: [["kuracie", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["brokolica", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Šunka so zemiakmi a paprikou",
    meals: ["ranajky"],
    items: [["sunka", "protein"], ["kuracie", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Šunka so sladkými zemiakmi a špenátom",
    meals: ["ranajky"],
    items: [["sunka", "protein"], ["kuracie", "protein"], ["bataty", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Tofu praženica s ryžou a paprikou",
    meals: ["ranajky"],
    items: [["tofu", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Morčacia miska s quinoou a špenátom",
    meals: ["ranajky"],
    lastResort: true,
    items: [["morcacie", "protein"], ["quinoa", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },

  // --- Obed a večera: kuracie ---
  {
    name: "Kuracie prsia s ryžou a brokolicou",
    meals: ["obed", "vecera"],
    items: [["kuracie", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["brokolica", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Kuracie soté so zemiakmi a paprikou",
    meals: ["obed", "vecera"],
    items: [["kuracie", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["salat", "fiber"]]
  },
  {
    name: "Kuracie kari s ryžou a paprikou",
    meals: ["obed", "vecera"],
    items: [["kuracie", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["spenat", "fiber"]]
  },
  {
    name: "Kuracie prsia so sladkými zemiakmi a brokolicou",
    meals: ["obed", "vecera"],
    items: [["kuracie", "protein"], ["bataty", "carbs"], ["olivovy_olej", "fat"], ["brokolica", "fiber"], ["salat", "fiber"]]
  },
  {
    name: "Kuracie prsia s quinoou a brokolicou",
    meals: ["obed", "vecera"],
    items: [["kuracie", "protein"], ["quinoa", "carbs"], ["olivovy_olej", "fat"], ["brokolica", "fiber"], ["salat", "fiber"]]
  },
  {
    name: "Rizoto s kuracím mäsom a špenátom",
    meals: ["obed", "vecera"],
    items: [["kuracie", "protein"], ["ryza", "carbs"], ["syr", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Quinoa šalát s kuracím mäsom",
    meals: ["obed", "vecera"],
    items: [["kuracie", "protein"], ["quinoa", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["uhorka", "fiber"]]
  },
  {
    name: "Cestoviny s kuracím mäsom a špenátom",
    meals: ["obed", "vecera"],
    items: [["kuracie", "protein"], ["cestoviny", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },

  // --- Obed a večera: morčacie a hovädzie ---
  {
    name: "Morčacie soté s ryžou a špenátom",
    meals: ["obed", "vecera"],
    items: [["morcacie", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Morčacie prsia so zemiakmi a šalátom",
    meals: ["obed", "vecera"],
    items: [["morcacie", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["salat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Morčacie so sladkými zemiakmi a paprikou",
    meals: ["obed", "vecera"],
    items: [["morcacie", "protein"], ["bataty", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["salat", "fiber"]]
  },
  {
    name: "Hovädzie mäso so zemiakmi a špenátom",
    meals: ["obed", "vecera"],
    items: [["hovadzie", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Hovädzie mäso s ryžou a brokolicou",
    meals: ["obed", "vecera"],
    items: [["hovadzie", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["brokolica", "fiber"], ["salat", "fiber"]]
  },
  {
    name: "Bolonské cestoviny",
    meals: ["obed", "vecera"],
    items: [["hovadzie", "protein"], ["cestoviny", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["spenat", "fiber"]]
  },

  // --- Obed a večera: ryby ---
  {
    name: "Losos so sladkými zemiakmi a brokolicou",
    meals: ["obed", "vecera"],
    items: [["losos", "protein"], ["treska", "protein"], ["bataty", "carbs"], ["olivovy_olej", "fat"], ["brokolica", "fiber"], ["salat", "fiber"]]
  },
  {
    name: "Losos s ryžou a špenátom",
    meals: ["obed", "vecera"],
    items: [["losos", "protein"], ["treska", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["spenat", "fiber"], ["uhorka", "fiber"]]
  },
  {
    name: "Treska so zemiakmi a šalátom",
    meals: ["obed", "vecera"],
    items: [["treska", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["salat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Treska s ryžou a brokolicou",
    meals: ["obed", "vecera"],
    items: [["treska", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["brokolica", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Cestoviny s tuniakom a paradajkami",
    meals: ["obed", "vecera"],
    items: [["tuniak", "protein"], ["cestoviny", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["salat", "fiber"]]
  },
  {
    name: "Tuniakový šalát s toastom",
    meals: ["obed", "vecera"],
    items: [["tuniak", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["salat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Tuniakový šalát so zemiakmi",
    meals: ["obed", "vecera"],
    items: [["tuniak", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["salat", "fiber"], ["uhorka", "fiber"]]
  },

  // --- Obed a večera: bezmäsité ---
  {
    name: "Tofu stir-fry s ryžou a brokolicou",
    meals: ["obed", "vecera"],
    items: [["tofu", "protein"], ["ryza", "carbs"], ["olivovy_olej", "fat"], ["brokolica", "fiber"], ["paprika", "fiber"]]
  },
  {
    name: "Tofu so zemiakmi a paprikou",
    meals: ["obed", "vecera"],
    items: [["tofu", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["paprika", "fiber"], ["spenat", "fiber"]]
  },
  {
    name: "Zapekané zemiaky so šunkou a syrom",
    meals: ["obed", "vecera"],
    items: [["sunka", "protein"], ["vajcia", "protein"], ["zemiaky", "carbs"], ["syr", "fat"], ["paradajky", "fiber"], ["spenat", "fiber"]]
  },

  // --- Ľahšie večere ---
  {
    name: "Omeleta so šunkou a šalátom",
    meals: ["vecera"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["salat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Praženica so zemiakmi a šalátom",
    meals: ["vecera"],
    items: [["vajcia", "protein"], ["sunka", "protein"], ["zemiaky", "carbs"], ["olivovy_olej", "fat"], ["salat", "fiber"], ["paradajky", "fiber"]]
  },
  {
    name: "Cottage cheese s toastom a zeleninou",
    meals: ["vecera"],
    items: [["cottage", "protein"], ["chlieb", "carbs"], ["olivovy_olej", "fat"], ["paradajky", "fiber"], ["uhorka", "fiber"]]
  },
  {
    name: "Tvarohová misa s ovocím a orechmi",
    meals: ["vecera"],
    items: [["tvaroh", "protein"], ["skyr", "protein"], ["ovsene_vlocky", "carbs"], ["orechy", "fat"], ["maliny", "fiber"], ["jablko", "fiber"]]
  },
  {
    name: "Skyr s ovocím a orechmi",
    meals: ["vecera"],
    items: [["skyr", "protein"], ["ovsene_vlocky", "carbs"], ["orechy", "fat"], ["cucoriedky", "fiber"], ["maliny", "fiber"]]
  }
];

/**
 * Dvojice, ktoré makrovo sedia, ale nikto ich reálne neje - mäso do ovsenej
 * kaše ani jogurt k zemiakom. Ak by vylúčenie nechalo bielkovinu bez prílohy,
 * pravidlo sa pre ňu preskočí, aby jedálniček ostal zostaviteľný.
 */
const INCOMPATIBLE_CARBS = {
  sunka: ["ovsene_vlocky", "musli"],
  kuracie: ["ovsene_vlocky", "musli"],
  morcacie: ["ovsene_vlocky", "musli"],
  hovadzie: ["ovsene_vlocky", "musli"],
  losos: ["ovsene_vlocky", "musli"],
  treska: ["ovsene_vlocky", "musli"],
  tuniak: ["ovsene_vlocky", "musli"],
  tofu: ["ovsene_vlocky", "musli"],
  biely_jogurt: ["zemiaky", "bataty", "cestoviny", "ryza"],
  skyr: ["zemiaky", "bataty", "cestoviny"],
  tvaroh: ["zemiaky", "bataty", "cestoviny"],
  cottage: ["cestoviny"]
};

/**
 * Ten istý základ sa dá pripraviť viacerými spôsobmi. Štýly menia iba názov
 * jedla, nie jeho zloženie ani makrá - vajcia sú vajcia, či už z nich urobíš
 * praženicu alebo volské oko.
 */
const PROTEIN_STYLES = {
  ranajky: {
    vajcia: ["Praženica", "Omeleta", "Volské oko"]
  },
  obed: {
    kuracie: ["Kuracie prsia", "Kuracie soté"],
    morcacie: ["Morčacie mäso", "Morčacie soté"],
    hovadzie: ["Hovädzie mäso", "Hovädzie soté"]
  },
  vecera: {
    vajcia: ["Omeleta", "Praženica"],
    kuracie: ["Kuracie prsia", "Kuracie soté"]
  }
};

/**
 * Rozhoduje pomer tuku k bielkovine, nie samotný tuk. Profil má 2 g bielkovín
 * a 0,8 g tuku na kilogram, čiže pomer 0,4 - a časť tuku musí ostať pre olej
 * a prílohu. Surovina nad 0,3 (vajcia 0,77, tofu 0,58, hovädzie 0,31) by sama
 * tukový cieľ prekročila, preto dostane chudého partnera.
 */
const FATTY_RATIO_THRESHOLD = 0.3;

// Partneri sa líšia podľa jedla, aby ryba neskončila v raňajkovej kaši.
const LEAN_PARTNERS = {
  ranajky: ["skyr", "tvaroh", "morcacie", "kuracie"],
  obed: ["treska", "morcacie", "kuracie", "tuniak"],
  vecera: ["treska", "morcacie", "kuracie", "tuniak"]
};

// Tučná bielkovina sa nesmie stretnúť s tučnou prílohou. Vajcia s ovsenými
// vločkami (6,5 g tuku na 100 g) by tukový cieľ prekročili aj pri minime oleja.
const LEAN_CARB_MAX_FAT = 3;

// Keď alergie nechajú len jednu bielkovinu, jedálniček by bol jednotvárny -
// vtedy sa ponuka doplní o náhradné zdroje.
const MIN_PROTEIN_VARIETY = 2;

/**
 * Pri veľkom deficite vyjde málo sacharidov na veľa bielkovín. Mliečne výrobky
 * nesú na každých 100 g aj ~4 g sacharidov, takže by samy cieľ prekročili -
 * vtedy sa uprednostnia bielkoviny, ktoré sacharidy prakticky nemajú.
 */
// Pomer sacharidov k bielkovinám pod 1:1 je už low-carb strava - vtedy sa
// oplatí vyberať suroviny, ktoré sacharidy nenesú zbytočne.
const TIGHT_CARB_RATIO = 1;
const LOW_CARB_PROTEIN_MAX = 0.15; // sacharidy na gram bielkoviny v surovine

function carbToProteinRatio(foodKey) {
  const food = FOODS[foodKey];
  return food.protein > 0 ? food.carbs / food.protein : Number.POSITIVE_INFINITY;
}

/**
 * Opačný prípad: pri objemovom príjme sa príloha vyženie takmer na strop, takže
 * bielkovina, ktorú sama nesie, prekročí cieľ - a mäso sa už nedá stiahnuť pod
 * minimálnu porciu. Vtedy sa uprednostnia prílohy, ktoré nesú bielkovín čo
 * najmenej (ryža 0,09 g/g sacharidov oproti chlebu 0,22 g/g).
 */
const CARB_HEAVY_RATIO = 3;
const HEAVY_CARB_PROTEIN_MAX = 0.12; // bielkoviny na gram sacharidov v surovine

function proteinPerCarbRatio(foodKey) {
  const food = FOODS[foodKey];
  return food.carbs > 0 ? food.protein / food.carbs : Number.POSITIVE_INFINITY;
}

// Koľko vlákniny dá surovina na gram sacharidov. Pri tesných sacharidoch sa
// vyberá zelenina a ovocie, ktoré vlákninu dodá čo najlacnejšie.
const EFFICIENT_FIBER_RATIO = 0.35;

function fiberPerCarbRatio(foodKey) {
  const food = FOODS[foodKey];
  return food.carbs > 0 ? food.fiber / food.carbs : Number.POSITIVE_INFINITY;
}

/**
 * Každá surovina má realistický strop porcie - 260 g šunky alebo 200 g müsli
 * je už maximum, ktoré niekto naraz zje. Pri veľkých cieľoch taká surovina ani
 * pri strope cieľ nepokryje a rozdiel by musela dorovnávať iná, čím sa jedlo
 * makrovo rozjde. Preto sa medzi hlavné zložky pustí len surovina, ktorá vie
 * pokryť aspoň túto časť cieľa daného chodu.
 */
const MIN_TARGET_COVERAGE = 0.8;

function coversTarget(foodKey, macro, targetGrams) {
  if (!targetGrams) return true;
  const food = FOODS[foodKey];
  return (food.max * food[macro]) / 100 >= targetGrams * MIN_TARGET_COVERAGE;
}

function fatToProteinRatio(foodKey) {
  const food = FOODS[foodKey];
  return food.protein > 0 ? food.fat / food.protein : Number.POSITIVE_INFINITY;
}

const MACROS = ["protein", "fat", "carbs", "fiber"];

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function caloriesFromMacros(protein, carbs, fat) {
  return protein * 4 + carbs * 4 + fat * 9;
}

function macroTotal(items, macro) {
  return items.reduce((sum, item) => sum + (item.grams * FOODS[item.food][macro]) / 100, 0);
}

/** Surovina je povolená, keď ju nevylučuje ani jedna zo zaškrtnutých alergií. */
function isFoodAllowed(foodKey, allergies) {
  const food = FOODS[foodKey];
  if (!food) return false;
  return !food.allergens.some((allergen) => allergies.includes(allergen));
}

/** Mapa "názov suroviny" -> alergény. Slúži na kontrolu už uložených jedál. */
function buildIngredientAllergenMap() {
  const map = new Map();
  for (const food of Object.values(FOODS)) {
    map.set(food.name, food.allergens);
  }
  return map;
}

const INGREDIENT_ALLERGENS = buildIngredientAllergenMap();

/**
 * Zistí, ktoré alergény porušuje zoznam ingrediencií uloženého jedla.
 * Neznáma surovina (napr. z jedálnička staršej verzie) sa nepovažuje
 * za bezpečnú - preto sa vracia ako "neznama".
 */
function findViolatedAllergens(ingredientNames, allergies) {
  if (allergies.length === 0) return [];

  const violated = new Set();
  for (const name of ingredientNames) {
    const allergens = INGREDIENT_ALLERGENS.get(name);
    if (!allergens) {
      violated.add("neznama");
      continue;
    }
    for (const allergen of allergens) {
      if (allergies.includes(allergen)) violated.add(allergen);
    }
  }

  return [...violated];
}

/**
 * Škáluje suroviny jedla tak, aby jeho makrá sedeli na cieľ. Každá skupina
 * (bielkovinová, tuková, sacharidová, vlákninová) sa posúva k svojmu cieľu
 * v rámci reálnych porcií; kroky sa opakujú, kým sa hodnoty ustália.
 */
function runFitPasses(items, target, passes) {
  for (let pass = 0; pass < passes; pass += 1) {
    MACROS.forEach((macro) => {
      const pool = items.filter((item) => item.role === macro);
      if (pool.length === 0) return;

      const poolAmount = macroTotal(pool, macro);
      if (poolAmount <= 1e-9) return;

      const gap = target[macro] - macroTotal(items, macro);
      const factor = Math.max(0, (poolAmount + gap) / poolAmount);

      pool.forEach((item) => {
        const food = FOODS[item.food];
        item.grams = clamp(item.grams * factor, food.min, food.max);
      });
    });
  }
}

/**
 * Presúva gramáže vnútri jednej skupiny tak, že `holdMacro` ostáva nezmenené
 * a `reduceMacro` klesá k cieľu. Rieši dva reálne konflikty: celozrnné prílohy
 * nesú viac vlákniny než je cieľ, a sladké ovocie donesie priveľa sacharidov.
 */
function tradeWithinPool(items, role, holdMacro, reduceMacro, target) {
  const pool = items.filter((item) => item.role === role);
  if (pool.length < 2) return false;

  const ratio = (item) => {
    const food = FOODS[item.food];
    return food[holdMacro] > 0 ? food[reduceMacro] / food[holdMacro] : Number.POSITIVE_INFINITY;
  };

  let moved = false;

  for (let step = 0; step < 60; step += 1) {
    const excess = macroTotal(items, reduceMacro) - target[reduceMacro];
    if (excess <= 0.05) break;

    const donor = pool
      .filter((item) => item.grams > FOODS[item.food].min + 1e-6)
      .sort((a, b) => ratio(b) - ratio(a))[0];
    const receiver = pool
      .filter((item) => item.grams < FOODS[item.food].max - 1e-6)
      .sort((a, b) => ratio(a) - ratio(b))[0];

    if (!donor || !receiver || donor === receiver) break;
    if (ratio(donor) - ratio(receiver) < 1e-9) break;

    const donorFood = FOODS[donor.food];
    const receiverFood = FOODS[receiver.food];
    const holdRatio = donorFood[holdMacro] / receiverFood[holdMacro];
    const savedPerGram = donorFood[reduceMacro] / 100 - (receiverFood[reduceMacro] / 100) * holdRatio;
    if (savedPerGram <= 1e-9) break;

    let grams = Math.min(excess / savedPerGram, donor.grams - donorFood.min);
    const receiverHeadroom = receiverFood.max - receiver.grams;
    if (grams * holdRatio > receiverHeadroom) {
      grams = receiverHeadroom / holdRatio;
    }
    if (grams <= 1e-6) break;

    donor.grams -= grams;
    receiver.grams += grams * holdRatio;
    moved = true;
  }

  return moved;
}

function fitMealToTarget(items, target) {
  items.forEach((item) => {
    item.grams = FOODS[item.food].min;
  });

  runFitPasses(items, target, 300);

  // Výmena rozhodí ostatné makrá, preto sa striedavo dolaďuje aj zvyšok.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const tradedFiber = tradeWithinPool(items, "carbs", "carbs", "fiber", target);
    const tradedCarbs = tradeWithinPool(items, "fiber", "fiber", "carbs", target);
    if (!tradedFiber && !tradedCarbs) break;
    runFitPasses(items, target, 120);
  }

  items.forEach((item) => {
    item.grams = round(item.grams, 1);
  });

  return items;
}

function buildMealVariant(template, target) {
  const items = template.items.map(([food, role]) => ({ food, role, grams: 0 }));
  fitMealToTarget(items, target);

  const ingredients = items.map((item) => {
    const food = FOODS[item.food];
    const ratio = item.grams / 100;
    const protein = round(food.protein * ratio, 1);
    const carbs = round(food.carbs * ratio, 1);
    const fat = round(food.fat * ratio, 1);
    const fiber = round(food.fiber * ratio, 1);

    return {
      ingredient_name: food.name,
      grams: item.grams,
      calories: Math.round(caloriesFromMacros(protein, carbs, fat)),
      protein,
      carbs,
      fat,
      fiber
    };
  });

  const totals = ingredients.reduce(
    (acc, ingredient) => ({
      protein: acc.protein + ingredient.protein,
      carbs: acc.carbs + ingredient.carbs,
      fat: acc.fat + ingredient.fat,
      fiber: acc.fiber + ingredient.fiber
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    name: template.name,
    calories: Math.round(caloriesFromMacros(totals.protein, totals.carbs, totals.fat)),
    protein: round(totals.protein, 1),
    carbs: round(totals.carbs, 1),
    fat: round(totals.fat, 1),
    fiber: round(totals.fiber, 1),
    ingredients
  };
}

/**
 * Názov jedla. Ovsená kaša sa pomenúva podľa prílohy, lebo tá je v jedle
 * hlavná - "Ovsená kaša so skyrom a banánom" znie ako reálne jedlo,
 * kým "Skyr s ovsenými vločkami" nie.
 */
function buildMealName(proteinKey, carbKey, fiberKey, style) {
  const protein = FOODS[proteinKey];
  const carb = FOODS[carbKey];
  const fiber = FOODS[fiberKey];

  if (carbKey === "ovsene_vlocky" && protein.withForm) {
    return `Ovsená kaša ${protein.withForm} ${fiber.form}`;
  }

  return `${style || protein.name} ${carb.form} ${fiber.form}`;
}

/**
 * Núdzové skladanie jedla zo surovín. Použije sa, až keď alergie vyradia
 * všetky napísané recepty - vtedy je aj kombinácia lepšia než prázdny
 * jedálniček. Vyberá tak, aby sa suroviny čo najviac striedali.
 */
function buildCombinedTemplates(mealType, allergies, target, favoriteNames = new Set()) {
  const components = MEAL_COMPONENTS[mealType];
  const keep = (list) => (list || []).filter((food) => isFoodAllowed(food, allergies));

  // Cieľ jedla rozhoduje, či si môžeme dovoliť bielkoviny nesúce sacharidy.
  const carbsTight = Boolean(target) && target.protein > 0 && target.carbs / target.protein < TIGHT_CARB_RATIO;
  const carbsHeavy = Boolean(target) && target.protein > 0 && target.carbs / target.protein > CARB_HEAVY_RATIO;

  const allowed = {
    carbs: keep(components.carbs),
    fat: keep(components.fat),
    fiber: keep(components.fiber),
    garnish: keep(components.fiberGarnish)
  };

  // Náhradné bielkoviny sa pridajú, keď alergie zredukujú obvyklé na jednu.
  allowed.protein = keep(components.protein);
  if (allowed.protein.length < MIN_PROTEIN_VARIETY) {
    const backup = keep(components.proteinBackup).filter((food) => !allowed.protein.includes(food));
    allowed.protein = [...allowed.protein, ...backup];
  }

  // Pri tesných sacharidoch sa mliečne zdroje vynechajú a doplnia sa chudé
  // náhrady, aby ostala aspoň nejaká pestrosť.
  if (carbsTight) {
    const lowCarb = allowed.protein.filter((food) => carbToProteinRatio(food) <= LOW_CARB_PROTEIN_MAX);
    const backup = keep(components.proteinBackup)
      .filter((food) => carbToProteinRatio(food) <= LOW_CARB_PROTEIN_MAX && !lowCarb.includes(food));
    const combined = [...lowCarb, ...backup];
    if (combined.length > 0) allowed.protein = combined;
  }

  // Pri objemovom príjme sa vyberú prílohy s najmenším bielkovinovým nákladom.
  if (carbsHeavy) {
    const light = allowed.carbs.filter((food) => proteinPerCarbRatio(food) <= HEAVY_CARB_PROTEIN_MAX);
    if (light.length > 0) allowed.carbs = light;
  }

  // Suroviny, ktoré na cieľ chodu nestačia ani pri maximálnej porcii, sa
  // vynechajú - ale nikdy tak, aby rola ostala prázdna.
  if (target) {
    for (const [role, macro] of [["protein", "protein"], ["carbs", "carbs"]]) {
      const capable = allowed[role].filter((food) => coversTarget(food, macro, target[macro]));
      if (capable.length > 0) allowed[role] = capable;
    }
  }

  // Bez bielkoviny, prílohy alebo zeleniny sa jedlo poskladať nedá.
  if (allowed.protein.length === 0 || allowed.carbs.length === 0 || allowed.fiber.length === 0) {
    return [];
  }

  // Partner musí byť chudý na tuk - a pri tesných sacharidoch aj na sacharidy,
  // inak by ich do jedla priniesol namiesto bielkoviny, ktorú má odľahčiť.
  let leanPartners = keep(LEAN_PARTNERS[mealType]).filter(
    (food) => fatToProteinRatio(food) < FATTY_RATIO_THRESHOLD
  );
  if (carbsTight) {
    const lowCarbPartners = leanPartners.filter((food) => carbToProteinRatio(food) <= LOW_CARB_PROTEIN_MAX);
    if (lowCarbPartners.length > 0) leanPartners = lowCarbPartners;
  }

  // Pri tesných sacharidoch sa zelenina a ovocie zúžia na tie, ktoré dodajú
  // vlákninu s najmenším sacharidovým nákladom.
  if (carbsTight) {
    for (const role of ["fiber", "garnish"]) {
      const efficient = allowed[role].filter((food) => fiberPerCarbRatio(food) >= EFFICIENT_FIBER_RATIO);
      if (efficient.length > 0) allowed[role] = efficient;
    }
  }

  // K tučnej bielkovine sa pripustia len chudé prílohy, aby jedlo sadlo do tukov.
  const baseCarbsFor = (protein) => {
    const leanCarbs = allowed.carbs.filter((food) => FOODS[food].fat <= LEAN_CARB_MAX_FAT);
    return fatToProteinRatio(protein) >= FATTY_RATIO_THRESHOLD && leanCarbs.length > 0
      ? leanCarbs
      : allowed.carbs;
  };

  // Z nich sa ešte vyhodia kulinársky nezmyselné dvojice.
  const sensibleCarbsFor = (protein) => {
    const banned = INCOMPATIBLE_CARBS[protein] || [];
    return baseCarbsFor(protein).filter((food) => !banned.includes(food));
  };

  // Keby bielkovine ostali samé nezmyselné prílohy (jogurt, ku ktorému by sa
  // makrovo hodila už len ryža), vynechá sa radšej celá bielkovina. Ak by tým
  // ponuka ostala prázdna, prednosť dostane zostaviteľnosť jedálnička.
  const sensibleProteins = allowed.protein.filter((protein) => sensibleCarbsFor(protein).length > 0);
  if (sensibleProteins.length > 0) allowed.protein = sensibleProteins;

  const combos = [];
  for (const protein of allowed.protein) {
    // Tučnej bielkovine sa priradí chudý partner, aby jedlo sadlo do tukov.
    const partners = fatToProteinRatio(protein) >= FATTY_RATIO_THRESHOLD
      ? leanPartners.filter((food) => food !== protein)
      : [];
    const partner = partners.length > 0 ? partners[0] : null;

    const sensible = sensibleCarbsFor(protein);
    const usableCarbs = sensible.length > 0 ? sensible : baseCarbsFor(protein);

    for (const carbs of usableCarbs) {
      for (const fiber of allowed.fiber) {
        // Tuk je voliteľný: keď ho alergie vyradia, tuk dodá mäso a príloha.
        for (const fat of allowed.fat.length > 0 ? allowed.fat : [null]) {
          combos.push({ protein, partner, carbs, fat, fiber, garnish: null });
        }
      }
    }
  }

  // Doplnková zelenina sa strieda naprieč kombináciami, aby jedlá neboli fádne.
  if (allowed.garnish.length > 0) {
    combos.forEach((combo, index) => {
      combo.garnish = allowed.garnish[index % allowed.garnish.length];
    });
  }

  // Spôsob prípravy (praženica / omeleta / soté) sa tiež strieda.
  const styles = PROTEIN_STYLES[mealType] || {};
  const styleCounter = new Map();
  for (const combo of combos) {
    const options = styles[combo.protein];
    if (!options) continue;
    const used = styleCounter.get(combo.protein) || 0;
    combo.style = options[used % options.length];
    styleCounter.set(combo.protein, used + 1);
  }

  const picked = [];
  const usedNames = new Set();
  const usage = new Map();
  const useCount = (key) => usage.get(key) || 0;

  // Obľúbené jedlá dostanú bonus, takže sa do ponuky dostanú prednostne.
  // Nie sú však jediné - pestrosť surovín ostáva hlavným kritériom.
  const FAVORITE_BONUS = 6;

  while (picked.length < TEMPLATES_PER_MEAL_TYPE && combos.length > 0) {
    let bestIndex = 0;
    let bestScore = Infinity;

    combos.forEach((combo, index) => {
      const isFavorite = favoriteNames.has(buildMealName(combo.protein, combo.carbs, combo.fiber, combo.style));
      const score =
        useCount(combo.protein) * 4 + useCount(combo.carbs) * 3 + useCount(combo.fiber) * 2 + useCount(combo.fat)
        - (isFavorite ? FAVORITE_BONUS : 0);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const [combo] = combos.splice(bestIndex, 1);

    // Názov nezohľadňuje tuk ani doplnkovú zeleninu, takže dve rôzne
    // kombinácie môžu dať rovnaké meno - tie sa preskočia.
    const name = buildMealName(combo.protein, combo.carbs, combo.fiber, combo.style);
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    for (const key of [combo.protein, combo.carbs, combo.fiber, combo.fat, combo.garnish]) {
      if (key) usage.set(key, useCount(key) + 1);
    }

    const items = [
      [combo.protein, "protein"],
      [combo.carbs, "carbs"],
      [combo.fiber, "fiber"]
    ];
    if (combo.partner) items.push([combo.partner, "protein"]);
    if (combo.fat) items.push([combo.fat, "fat"]);
    if (combo.garnish) items.push([combo.garnish, "fiber"]);

    picked.push({ name, items });
  }

  // Pri veľa alergiách môže ostať menej než 14 kombinácií - vtedy sa
  // ponuka zopakuje, aby mal každý deň obidva varianty.
  const templates = [];
  for (let i = 0; i < TEMPLATES_PER_MEAL_TYPE; i += 1) {
    templates.push(picked[i % picked.length]);
  }
  return templates;
}

/**
 * Najväčšia percentuálna odchýlka jedla od cieľa chodu. Vláknina sa počíta
 * inak než ostatné makrá: je to spodná hranica, nie cieľ. Celozrnná príloha
 * jej donesie viac, než koľko sa žiada, a to je v poriadku - trestá sa len
 * to, keď jej je málo.
 */
function fitDeviation(template, target) {
  const variant = buildMealVariant(template, target);
  let worst = 0;

  for (const macro of ["protein", "carbs", "fat"]) {
    if (!target[macro]) continue;
    worst = Math.max(worst, Math.abs(variant[macro] - target[macro]) / target[macro]);
  }

  if (target.fiber > 0 && variant.fiber < target.fiber) {
    worst = Math.max(worst, (target.fiber - variant.fiber) / target.fiber);
  }

  return worst;
}

// Koľko odchýlky sa oplatí obetovať za pestrosť a za obľúbené jedlo.
// Hodnoty sú v podiele cieľa, takže 0,01 = jedno percento.
const VARIETY_PENALTY = 0.003;
const FAVORITE_BONUS = 0.06;

/**
 * Jedlo, ktoré sa od cieľa odchýli viac, sa do týždňa nedostane vôbec.
 * Radšej sa zopakuje jedlo, ktoré sadne - tak sa aj naozaj je. Keby prah
 * nesplnil žiadny recept, vyberú sa jednoducho tie najpresnejšie.
 */
const ACCEPTABLE_FIT = 0.08;

// Jedlo, ktoré už je v inom chode, sa zopakuje len keď niet z čoho vyberať -
// nikto nechce mať na večeru presne to isté, čo mal na obed.
const REPEATED_COURSE_PENALTY = 0.05;

// Koľko bežných jedál musí ostať, aby sa núdzové vôbec nepoužili.
const MIN_ORDINARY_VARIETY = 4;

/**
 * Vyberie 14 jedál pre jeden chod (7 dní x 2 varianty) zo zoznamu receptov.
 * Recepty s alergénom sa vyradia celé; zo zvyšku sa uprednostnia tie, ktoré
 * sa dajú gramážou najpresnejšie dopočítať na cieľ, pri zachovaní pestrosti.
 */
function buildTemplates(mealType, allergies, target, favoriteNames = new Set(), usedInOtherCourses = new Set()) {
  const candidates = RECIPES.filter(
    (recipe) =>
      recipe.meals.includes(mealType) &&
      recipe.items.every(([food]) => isFoodAllowed(food, allergies))
  ).map((recipe) => ({
    template: { name: recipe.name, items: recipe.items },
    lastResort: Boolean(recipe.lastResort)
  }));

  // Pri veľmi obmedzujúcej kombinácii alergií nemusí ostať žiadny recept.
  if (candidates.length === 0) {
    return buildCombinedTemplates(mealType, allergies, target, favoriteNames);
  }

  const scored = candidates.map(({ template, lastResort }) => ({
    template,
    lastResort,
    fit: target ? fitDeviation(template, target) : 0,
    favorite: favoriteNames.has(template.name)
  }));

  const accurate = scored.filter((entry) => entry.fit <= ACCEPTABLE_FIT);
  let pool = accurate.length > 0 ? accurate : scored;

  // Núdzové jedlá (kuracia miska na raňajky) sa ponúknu, až keď by týždeň
  // inak stál na hŕstke jedál - vtedy je čudné jedlo lepšie než to isté
  // jedlo sedemkrát za sebou.
  const ordinary = pool.filter((entry) => !entry.lastResort);
  if (ordinary.length >= MIN_ORDINARY_VARIETY) pool = ordinary;

  const picked = [];
  const usage = new Map();
  const useCount = (key) => usage.get(key) || 0;

  while (picked.length < TEMPLATES_PER_MEAL_TYPE && pool.length > 0) {
    let bestIndex = 0;
    let bestScore = Infinity;

    pool.forEach((entry, index) => {
      const repeats = entry.template.items.reduce((acc, [food]) => acc + useCount(food), 0);
      const score =
        entry.fit
        + repeats * VARIETY_PENALTY
        + (usedInOtherCourses.has(entry.template.name) ? REPEATED_COURSE_PENALTY : 0)
        - (entry.favorite ? FAVORITE_BONUS : 0);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const [entry] = pool.splice(bestIndex, 1);
    entry.template.items.forEach(([food]) => usage.set(food, useCount(food) + 1));
    picked.push(entry.template);
  }

  // Keď alergie nechajú menej než 14 jedál, ponuka sa zopakuje - aj tak je
  // lepšie jesť to isté dvakrát než dostať nezmyselnú kombináciu.
  const templates = [];
  for (let i = 0; i < TEMPLATES_PER_MEAL_TYPE; i += 1) {
    templates.push(picked[i % picked.length]);
  }
  return templates;
}

function splitMacroAcrossMeals(total) {
  const breakfast = round(total * MEAL_SPLIT.ranajky, 1);
  const lunch = round(total * MEAL_SPLIT.obed, 1);
  const dinner = round(total - breakfast - lunch, 1);
  return { ranajky: breakfast, obed: lunch, vecera: dinner };
}

function targetMealsForDay(macros) {
  return {
    calories: splitMacroAcrossMeals(macros.calories),
    protein: splitMacroAcrossMeals(macros.protein),
    carbs: splitMacroAcrossMeals(macros.carbs),
    fat: splitMacroAcrossMeals(macros.fat),
    fiber: splitMacroAcrossMeals(macros.fiber)
  };
}

/**
 * Týždenný jedálniček. `allergies` je zoznam kľúčov z utils/allergies -
 * suroviny, ktoré niektorá z nich vylučuje, sa do jedál vôbec nedostanú.
 */
function generateWeeklyMealPlan(macros, allergies = [], favorites = []) {
  const favoriteNames = new Set(favorites);
  const rows = [];
  const dayTargets = targetMealsForDay(macros);

  const templatesByMealType = {};
  const usedInOtherCourses = new Set();
  for (const mealType of MEAL_TYPES) {
    // Recepty sa vyberajú so znalosťou cieľa daného chodu.
    const mealTarget = {
      calories: dayTargets.calories[mealType],
      protein: dayTargets.protein[mealType],
      carbs: dayTargets.carbs[mealType],
      fat: dayTargets.fat[mealType],
      fiber: dayTargets.fiber[mealType]
    };
    templatesByMealType[mealType] = buildTemplates(
      mealType,
      allergies,
      mealTarget,
      favoriteNames,
      usedInOtherCourses
    );
    if (templatesByMealType[mealType].length === 0) {
      throw new Error(
        "Pri zvolených alergiách sa nedá poskladať jedálniček. Skús odškrtnúť aspoň jednu položku."
      );
    }
    templatesByMealType[mealType].forEach((template) => usedInOtherCourses.add(template.name));
  }

  DAYS.forEach((day, dayIndex) => {
    MEAL_TYPES.forEach((mealType) => {
      const target = {
        calories: dayTargets.calories[mealType],
        protein: dayTargets.protein[mealType],
        carbs: dayTargets.carbs[mealType],
        fat: dayTargets.fat[mealType],
        fiber: dayTargets.fiber[mealType]
      };

      const templates = templatesByMealType[mealType];
      const variantA = templates[(dayIndex * 2) % templates.length];
      const variantB = templates[(dayIndex * 2 + 1) % templates.length];

      rows.push({
        day,
        meal_type: mealType,
        variant1: buildMealVariant(variantA, target),
        variant2: buildMealVariant(variantB, target),
        calories: target.calories,
        protein: target.protein,
        carbs: target.carbs,
        fat: target.fat,
        fiber: target.fiber
      });
    });
  });

  return rows;
}

module.exports = {
  generateWeeklyMealPlan,
  findViolatedAllergens,
  isFoodAllowed,
  buildTemplates,
  buildMealVariant,
  FOODS,
  RECIPES,
  MEAL_COMPONENTS
};
