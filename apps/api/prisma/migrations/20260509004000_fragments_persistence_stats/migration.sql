-- Phase 5: Fragments persistence + registered-user aggregates (separate from Guess stats).

CREATE TYPE "FragmentPuzzleMode" AS ENUM ('FRAGMENTS', 'SLIDING');
CREATE TYPE "FragmentPuzzleDifficulty" AS ENUM ('EASY', 'NORMAL', 'HARD');

CREATE TABLE "fragments_completions" (
  "id" UUID NOT NULL,
  "run_id" TEXT NOT NULL,
  "user_id" UUID NOT NULL,
  "card_id" TEXT NOT NULL,
  "card_name" TEXT NOT NULL,
  "card_image_url" TEXT NOT NULL,
  "fab_set" TEXT,
  "rarity" TEXT,
  "puzzle_mode" "FragmentPuzzleMode" NOT NULL,
  "difficulty" "FragmentPuzzleDifficulty" NOT NULL,
  "time_ms" INTEGER NOT NULL,
  "moves" INTEGER NOT NULL,
  "seed" TEXT NOT NULL,
  "template_id" TEXT,
  "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fragments_completions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_fragments_stats" (
  "user_id" UUID NOT NULL,
  "puzzles_completed" INTEGER NOT NULL DEFAULT 0,
  "total_time_ms" BIGINT NOT NULL DEFAULT 0,
  "total_moves" BIGINT NOT NULL DEFAULT 0,
  "best_time_ms" INTEGER,
  "best_moves" INTEGER,
  "average_time_ms" DECIMAL(12,2),
  "average_moves" DECIMAL(12,2),
  "last_completed_at" TIMESTAMPTZ(6),
  "fragments_count" INTEGER NOT NULL DEFAULT 0,
  "sliding_count" INTEGER NOT NULL DEFAULT 0,
  "easy_count" INTEGER NOT NULL DEFAULT 0,
  "normal_count" INTEGER NOT NULL DEFAULT 0,
  "hard_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_fragments_stats_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "user_fragments_card_stats" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "card_id" TEXT NOT NULL,
  "card_name" TEXT NOT NULL,
  "times_completed" INTEGER NOT NULL DEFAULT 0,
  "total_time_ms" BIGINT NOT NULL DEFAULT 0,
  "total_moves" BIGINT NOT NULL DEFAULT 0,
  "best_time_ms" INTEGER,
  "best_moves" INTEGER,
  "average_time_ms" DECIMAL(12,2),
  "average_moves" DECIMAL(12,2),
  "last_completed_at" TIMESTAMPTZ(6),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_fragments_card_stats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fragments_completions_run_id_key" ON "fragments_completions"("run_id");
CREATE INDEX "fragments_completions_user_id_completed_at_idx" ON "fragments_completions"("user_id", "completed_at");
CREATE INDEX "fragments_completions_user_id_card_id_idx" ON "fragments_completions"("user_id", "card_id");
CREATE INDEX "fragments_completions_user_id_puzzle_mode_idx" ON "fragments_completions"("user_id", "puzzle_mode");
CREATE INDEX "fragments_completions_user_id_difficulty_idx" ON "fragments_completions"("user_id", "difficulty");

CREATE UNIQUE INDEX "user_fragments_card_stats_user_id_card_id_key" ON "user_fragments_card_stats"("user_id", "card_id");
CREATE INDEX "user_fragments_card_stats_user_id_idx" ON "user_fragments_card_stats"("user_id");

ALTER TABLE "fragments_completions"
  ADD CONSTRAINT "fragments_completions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_fragments_stats"
  ADD CONSTRAINT "user_fragments_stats_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_fragments_card_stats"
  ADD CONSTRAINT "user_fragments_card_stats_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
