-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY,
  email         text NOT NULL,
  name          text,
  monthly_budget numeric DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant      text NOT NULL,
  category      text NOT NULL CHECK (category IN ('Food','Transport','Shopping','Entertainment','Others')),
  amount        numeric NOT NULL,
  payment_type  text NOT NULL CHECK (payment_type IN ('UPI','Cash','Credit','Debit')),
  transacted_at timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_transacted ON transactions(user_id, transacted_at DESC);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              text NOT NULL,
  subtitle          text,
  amount            numeric NOT NULL,
  billing_cycle     text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  next_billing_date date NOT NULL,
  category          text NOT NULL,
  badge             text CHECK (badge IN ('Auto','Fixed','Elite','Manual')),
  logo_initial      text,
  logo_color        text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_delete_own" ON subscriptions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- MESSAGES (Chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       text NOT NULL,
  sender     text NOT NULL CHECK (sender IN ('user','ai')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own" ON messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_delete_own" ON messages FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- AI SUGGESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       text NOT NULL,
  category   text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_suggestions_select_own" ON ai_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_suggestions_insert_own" ON ai_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_suggestions_delete_own" ON ai_suggestions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- USER BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_budgets (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_budget  numeric DEFAULT 0,
  month_budget numeric DEFAULT 0,
  daily_limit  numeric DEFAULT 0,
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE user_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_budgets_select_own" ON user_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_budgets_insert_own" ON user_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_budgets_update_own" ON user_budgets FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- CREDIT HEALTH
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_health (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       integer NOT NULL CHECK (score BETWEEN 300 AND 900),
  status      text NOT NULL CHECK (status IN ('excellent','good','fair','poor')),
  change      integer DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE credit_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_health_select_own" ON credit_health FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_health_insert_own" ON credit_health FOR INSERT WITH CHECK (auth.uid() = user_id);
