import { Hono } from "hono";
import {
  GuestSessionError,
  issueGuestSession,
  resolveGuestSessionValue,
} from "@/server/auth/guest-session";

export const guestRoutes = new Hono().post("/session", (c) => {
  try {
    const existing = c.req.header("x-guest-id")?.trim();
    const guestId = existing ? resolveGuestSessionValue(existing) : undefined;
    return c.json(issueGuestSession(guestId), 201);
  } catch (e) {
    if (e instanceof GuestSessionError) {
      return c.json({ error: e.message }, e.status);
    }
    throw e;
  }
});
