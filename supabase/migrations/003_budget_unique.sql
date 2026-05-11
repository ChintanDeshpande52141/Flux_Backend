-- Add unique constraint on user_budgets(user_id) to support ON CONFLICT upsert
ALTER TABLE user_budgets ADD CONSTRAINT user_budgets_user_id_unique UNIQUE (user_id);
