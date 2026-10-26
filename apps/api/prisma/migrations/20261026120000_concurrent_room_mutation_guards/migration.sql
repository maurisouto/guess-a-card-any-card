-- Keep at most one active seat for a guest in each room. PostgreSQL's unique indexes
-- allow multiple NULLs, so this partial index is intentionally scoped to active guest rows.
WITH duplicate_active_players AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY room_id, guest_id
           ORDER BY joined_at ASC, id ASC
         ) AS row_number
  FROM room_players
  WHERE left_at IS NULL AND guest_id IS NOT NULL
)
UPDATE room_players
SET left_at = CURRENT_TIMESTAMP,
    is_connected = FALSE,
    is_host = FALSE
WHERE id IN (
  SELECT id FROM duplicate_active_players WHERE row_number > 1
);

CREATE UNIQUE INDEX "room_players_active_guest_key"
ON "room_players" ("room_id", "guest_id")
WHERE "left_at" IS NULL AND "guest_id" IS NOT NULL;
