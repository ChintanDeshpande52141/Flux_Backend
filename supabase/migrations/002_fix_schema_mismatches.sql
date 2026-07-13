-- Fix schema mismatches between migration and actual usage

-- ============================================================
-- FIX USERS TABLE SCHEMA
-- ============================================================

-- Remove deprecated monthly_budget column if it exists
ALTER TABLE users DROP COLUMN IF EXISTS monthly_budget;

-- Add missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS income_sources jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_cards jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_income numeric DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS savings_goal numeric DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- ============================================================
-- FIX SUBSCRIPTIONS TABLE SCHEMA
-- ============================================================

-- Add missing payment_type column if it doesn't exist
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_type text CHECK (payment_type IN ('UPI','Cash','Credit','Debit'));

-- ============================================================
-- ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================

-- Index for transactions performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_merchant ON transactions(user_id, merchant);

-- Index for subscriptions performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_next_billing ON subscriptions(user_id, next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_category ON subscriptions(user_id, category);

-- Index for messages performance
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);

-- Index for ai_suggestions performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_created ON ai_suggestions(user_id, created_at DESC);

-- ============================================================
-- UPDATE USER BUDGETS TABLE IF NEEDED
-- ============================================================

-- Ensure user_budgets table has proper indexes
CREATE INDEX IF NOT EXISTS idx_user_budgets_user_id ON user_budgets(user_id);

-- ============================================================
-- ADD CREDIT HEALTH TABLE IF MISSING
-- ============================================================

-- Ensure credit_health table exists (might have been missed in initial migration)
CREATE TABLE IF NOT EXISTS credit_health (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       integer NOT NULL CHECK (score BETWEEN 300 AND 900),
  status      text NOT NULL CHECK (status IN ('excellent','good','fair','poor')),
  change      integer DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE credit_health ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create them
DROP POLICY IF EXISTS "credit_health_select_own" ON credit_health;
DROP POLICY IF EXISTS "credit_health_insert_own" ON credit_health;

CREATE POLICY "credit_health_select_own" ON credit_health FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_health_insert_own" ON credit_health FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for credit health performance
CREATE INDEX IF NOT EXISTS idx_credit_health_user_recorded ON credit_health(user_id, recorded_at DESC);

-- ============================================================
-- CLEAN UP ANY INCONSISTENT DATA
-- ============================================================

-- Update any NULL payment_type in subscriptions to 'UPI' as default
UPDATE subscriptions SET payment_type = 'UPI' WHERE payment_type IS NULL;

-- Ensure all users have default values for new columns
UPDATE users SET 
  income_sources = COALESCE(income_sources, '[]'::jsonb),
  credit_cards = COALESCE(credit_cards, '[]'::jsonb),
  total_income = COALESCE(total_income, 0),
  savings_goal = COALESCE(savings_goal, 0)
WHERE income_sources IS NULL OR credit_cards IS NULL OR total_income IS NULL OR savings_goal IS NULL;
