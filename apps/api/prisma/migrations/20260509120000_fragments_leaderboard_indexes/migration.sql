-- Leaderboard scans: filter by mode + difficulty, order by time or moves (Phase 6).
CREATE INDEX IF NOT EXISTS "fragments_completions_lb_time_idx"
ON "fragments_completions" ("puzzle_mode", "difficulty", "time_ms", "moves", "completed_at");

CREATE INDEX IF NOT EXISTS "fragments_completions_lb_moves_idx"
ON "fragments_completions" ("puzzle_mode", "difficulty", "moves", "time_ms", "completed_at");

CREATE INDEX IF NOT EXISTS "fragments_completions_user_mode_diff_idx"
ON "fragments_completions" ("user_id", "puzzle_mode", "difficulty");
