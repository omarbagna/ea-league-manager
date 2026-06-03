-- Opponent's claimed score when disputing (admin compares vs original submission).
ALTER TABLE match_disputes
  ADD COLUMN IF NOT EXISTS counter_home_score INT
    CHECK (counter_home_score IS NULL OR (counter_home_score >= 0 AND counter_home_score <= 99)),
  ADD COLUMN IF NOT EXISTS counter_away_score INT
    CHECK (counter_away_score IS NULL OR (counter_away_score >= 0 AND counter_away_score <= 99));
