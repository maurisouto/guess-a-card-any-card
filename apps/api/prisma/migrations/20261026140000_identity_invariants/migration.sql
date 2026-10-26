-- H-03: protect player/host identity combinations at the PostgreSQL boundary.
-- RoomPlayer historical rows may have neither identity after a user deletion, but active seats may not.
-- GamePlayer is a historical snapshot and user_id uses ON DELETE SET NULL, so only the XOR upper bound
-- is enforced there; application ownership validation still requires exactly one identity on creation.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM rooms
    WHERE num_nonnulls(host_user_id, host_guest_id) <> 1
  ) THEN
    RAISE EXCEPTION 'Cannot add rooms_host_identity_xor: existing rooms violate host identity invariant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM room_players
    WHERE num_nonnulls(user_id, guest_id) > 1
       OR (left_at IS NULL AND num_nonnulls(user_id, guest_id) <> 1)
  ) THEN
    RAISE EXCEPTION 'Cannot add room_players identity constraints: existing rows violate identity invariant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM game_players
    WHERE num_nonnulls(user_id, guest_id) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add game_players_identity_at_most_one: existing rows violate identity invariant';
  END IF;
END;
$$;

ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_host_identity_xor"
  CHECK (num_nonnulls("host_user_id", "host_guest_id") = 1);

ALTER TABLE "room_players"
  ADD CONSTRAINT "room_players_identity_at_most_one"
  CHECK (num_nonnulls("user_id", "guest_id") <= 1);

ALTER TABLE "room_players"
  ADD CONSTRAINT "room_players_active_identity_required"
  CHECK ("left_at" IS NOT NULL OR num_nonnulls("user_id", "guest_id") = 1);

ALTER TABLE "game_players"
  ADD CONSTRAINT "game_players_identity_at_most_one"
  CHECK (num_nonnulls("user_id", "guest_id") <= 1);
