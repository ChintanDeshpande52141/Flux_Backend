-- Add onboarding data columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS income_sources jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS credit_cards jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_income numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS savings_goal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Update policy to allow updating these columns
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
