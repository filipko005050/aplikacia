CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  banned BOOLEAN NOT NULL DEFAULT false,
  -- Zvýšením verzie sa okamžite zneplatnia všetky vydané tokeny používateľa.
  token_version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  height NUMERIC(6,2) NOT NULL,
  weight NUMERIC(6,2) NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  activity_level TEXT NOT NULL,
  goal TEXT NOT NULL,
  -- Zoznam alergií / intolerancií, napr. ["laktoza","lepok"].
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Tempo progresu v kg za týždeň: 0.25, 0.5 alebo 1.
  pace TEXT NOT NULL DEFAULT '0.5'
);

CREATE TABLE IF NOT EXISTS weights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight NUMERIC(6,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  variant1 TEXT NOT NULL,
  variant2 TEXT NOT NULL,
  variant1_meal_id INTEGER,
  variant2_meal_id INTEGER,
  calories NUMERIC(8,2) NOT NULL,
  protein NUMERIC(8,2) NOT NULL,
  carbs NUMERIC(8,2) NOT NULL,
  fat NUMERIC(8,2) NOT NULL,
  fiber NUMERIC(8,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  calories NUMERIC(8,2) NOT NULL,
  protein NUMERIC(8,2) NOT NULL,
  carbs NUMERIC(8,2) NOT NULL,
  fat NUMERIC(8,2) NOT NULL,
  fiber NUMERIC(8,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  grams NUMERIC(8,2) NOT NULL,
  calories NUMERIC(8,2) NOT NULL,
  protein NUMERIC(8,2) NOT NULL,
  carbs NUMERIC(8,2) NOT NULL,
  fat NUMERIC(8,2) NOT NULL,
  fiber NUMERIC(8,2) NOT NULL
);

-- Obľúbené jedlá. Okrem meal_id sa ukladá aj názov: jedálniček sa pri
-- regenerácii prepisuje a pôvodné meals riadky zmiznú, takže bez názvu by
-- obľúbené jedlo zaniklo spolu s nimi.
CREATE TABLE IF NOT EXISTS favorite_meals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_id INTEGER REFERENCES meals(id) ON DELETE SET NULL,
  meal_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, meal_name)
);

-- Body ako účtovná kniha. Unikátny index bráni tomu, aby sa to isté
-- ocenenie dalo získať v jeden deň viackrát.
CREATE TABLE IF NOT EXISTS user_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  awarded_date DATE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reason, awarded_date)
);

-- Odfajknuté jedlá. Musí byť až za meals aj meal_plans, na ktoré sa odkazuje.
-- Na jeden kalendárny deň pripadajú najviac tri záznamy (raňajky, obed, večera) -
-- stráži to routa, ktorá pri novom výbere ten predchádzajúci nahradí.
CREATE TABLE IF NOT EXISTS meal_checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Na už existujúcej databáze CREATE TABLE IF NOT EXISTS vyššie nič neurobí,
-- takže nové stĺpce treba doplniť zvlášť - inak by referencie nižšie zlyhali.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allergies JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pace TEXT NOT NULL DEFAULT '0.5';
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS variant1_meal_id INTEGER;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS variant2_meal_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'variant1_meal_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meal_plans_variant1_meal_id_fkey'
      AND conrelid = 'meal_plans'::regclass
  ) THEN
    ALTER TABLE meal_plans
      ADD CONSTRAINT meal_plans_variant1_meal_id_fkey
      FOREIGN KEY (variant1_meal_id) REFERENCES meals(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'meal_plans' AND column_name = 'variant2_meal_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meal_plans_variant2_meal_id_fkey'
      AND conrelid = 'meal_plans'::regclass
  ) THEN
    ALTER TABLE meal_plans
      ADD CONSTRAINT meal_plans_variant2_meal_id_fkey
      FOREIGN KEY (variant2_meal_id) REFERENCES meals(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- História odfajknutých jedál si drží vlastnú kópiu údajov. Bez nej by
-- regenerácia jedálnička (ktorá maže meal_plans aj meals) vymazala aj celú
-- históriu - týždenný report aj série pre odznaky by sa vynulovali.
ALTER TABLE meal_checks ADD COLUMN IF NOT EXISTS meal_type TEXT;
ALTER TABLE meal_checks ADD COLUMN IF NOT EXISTS meal_name TEXT;
ALTER TABLE meal_checks ADD COLUMN IF NOT EXISTS calories NUMERIC(8,2);
ALTER TABLE meal_checks ADD COLUMN IF NOT EXISTS protein NUMERIC(8,2);
ALTER TABLE meal_checks ADD COLUMN IF NOT EXISTS carbs NUMERIC(8,2);
ALTER TABLE meal_checks ADD COLUMN IF NOT EXISTS fat NUMERIC(8,2);
ALTER TABLE meal_checks ADD COLUMN IF NOT EXISTS fiber NUMERIC(8,2);
ALTER TABLE meal_checks ALTER COLUMN meal_plan_id DROP NOT NULL;
ALTER TABLE meal_checks ALTER COLUMN meal_id DROP NOT NULL;

-- Cudzie kľúče sa prerobia z CASCADE na SET NULL, aby zmazanie plánu
-- záznam o zjedenom jedle nezmazalo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_checks_meal_plan_id_fkey') THEN
    ALTER TABLE meal_checks DROP CONSTRAINT meal_checks_meal_plan_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_checks_meal_id_fkey') THEN
    ALTER TABLE meal_checks DROP CONSTRAINT meal_checks_meal_id_fkey;
  END IF;
  ALTER TABLE meal_checks
    ADD CONSTRAINT meal_checks_meal_plan_id_fkey
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE SET NULL;
  ALTER TABLE meal_checks
    ADD CONSTRAINT meal_checks_meal_id_fkey
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE SET NULL;
END
$$;

-- Doplnenie údajov k záznamom, ktoré ešte kópiu nemajú.
UPDATE meal_checks c
SET meal_type = COALESCE(c.meal_type, mp.meal_type)
FROM meal_plans mp
WHERE mp.id = c.meal_plan_id AND c.meal_type IS NULL;

UPDATE meal_checks c
SET meal_name = COALESCE(c.meal_name, m.name),
    calories = COALESCE(c.calories, m.calories),
    protein = COALESCE(c.protein, m.protein),
    carbs = COALESCE(c.carbs, m.carbs),
    fat = COALESCE(c.fat, m.fat),
    fiber = COALESCE(c.fiber, m.fiber)
FROM meals m
WHERE m.id = c.meal_id AND c.meal_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_meal_id ON ingredients(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_checks_user_time ON meal_checks(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_meals_user ON favorite_meals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_date ON user_points(user_id, awarded_date DESC);
CREATE INDEX IF NOT EXISTS idx_weights_user_time ON weights(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_timestamp ON login_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
-- Zamykanie účtu počíta neúspešné pokusy pre daný email v poslednom okne.
CREATE INDEX IF NOT EXISTS idx_login_logs_email_time ON login_logs(email, timestamp DESC);
