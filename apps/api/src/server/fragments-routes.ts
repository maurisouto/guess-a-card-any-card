import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { RequestIdentityError } from "@/server/auth/request-identity-error";
import { requireUserActor, resolveActorFromRequest } from "@/server/auth/resolve-actor";
import {
  getFragmentsLeaderboard,
} from "@/server/services/fragments-leaderboard-service";
import {
  FragmentsHttpError,
  getFragmentsProfileByUserId,
  parseFragmentsCompletionInput,
  recordFragmentsCompletion,
} from "@/server/services/fragments-service";

function handleErr(c: Context, e: unknown) {
  if (e instanceof FragmentsHttpError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  if (e instanceof RequestIdentityError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

export const fragmentsRoutes = new Hono()
  .get("/leaderboards", async (c) => {
    try {
      const url = new URL(c.req.url);
      const body = await getFragmentsLeaderboard(url.searchParams);
      return c.json(body);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/completions", async (c) => {
    try {
      const actor = await resolveActorFromRequest(c.req.raw.headers);
      const body = await c.req.json().catch(() => ({}));
      const input = parseFragmentsCompletionInput(body);
      const result = await recordFragmentsCompletion(actor, input);
      return c.json(result);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/profile/me", async (c) => {
    try {
      const { userId } = await requireUserActor(c.req.raw.headers);
      const body = await getFragmentsProfileByUserId(userId);
      if (!body) {
        return c.json({ error: "User not found." }, 404);
      }
      return c.json(body);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/profile/:userId", async (c) => {
    try {
      const userId = c.req.param("userId")?.trim() ?? "";
      const body = await getFragmentsProfileByUserId(userId);
      if (!body) {
        return c.json({ error: "User not found." }, 404);
      }
      return c.json(body);
    } catch (e) {
      return handleErr(c, e);
    }
  });
