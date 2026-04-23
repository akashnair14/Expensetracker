CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎯',
  target_amount NUMERIC(12,2) NOT NULL,
  saved_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_contribution NUMERIC(10,2),        -- user-set or AI-suggested
  deadline DATE,                              -- optional target date
  priority INTEGER DEFAULT 2,                -- 1=high 2=medium 3=low
  status TEXT NOT NULL DEFAULT 'active',     -- active | completed | paused | abandoned
  color TEXT NOT NULL DEFAULT '#00E5A0',     -- goal accent color
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  note TEXT,
  contributed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own goals') THEN
        CREATE POLICY "Users manage own goals" ON goals FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own contributions') THEN
        CREATE POLICY "Users manage own contributions" ON goal_contributions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Index for fast goal lookups
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contributions_goal ON goal_contributions(goal_id, contributed_at DESC);
