-- Add payment_type column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payment_type text CHECK (payment_type IN ('UPI', 'Cash', 'Credit', 'Debit'));
