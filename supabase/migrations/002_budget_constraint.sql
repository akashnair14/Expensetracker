-- Add unique constraint to budgets to support upserts
ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_category_month_key UNIQUE (user_id, category, month);
