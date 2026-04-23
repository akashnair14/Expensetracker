-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upload Usage Tracker (Lifetime total for free, reset logic can be added if monthly)
CREATE TABLE IF NOT EXISTS upload_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" 
ON subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own upload usage" 
ON upload_usage FOR SELECT USING (auth.uid() = user_id);

-- Note: Subscription auto-creation is now handled by the consolidated trigger 
-- in migration 004_profiles.sql to avoid race conditions.
