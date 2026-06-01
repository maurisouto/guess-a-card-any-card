import { afterEach, describe, expect, it } from "vitest";

import { app } from "./http-app";
import { __clearCatalogForTests, initCardCatalog } from "./services/card-catalog-service";

describe("GET /api/catalog/random-card", () => {
  afterEach(() => {
    initCardCatalog();
  });

  it("returns neutral JSON: id, name, imageUrl, set, rarity", async () => {
    const res = await app.request("http://localhost/api/catalog/random-card?seed=integration-seed-a");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.id).toBe("string");
    expect(typeof body.name).toBe("string");
    expect(typeof body.imageUrl).toBe("string");
    expect(String(body.imageUrl).length).toBeGreaterThan(12);
    expect(typeof body.set).toBe("string");
    expect(typeof body.rarity).toBe("string");
    expect(body).not.toHaveProperty("cardId");
  });

  it("returns 503 when catalog is unavailable", async () => {
    __clearCatalogForTests();
    const res = await app.request("http://localhost/api/catalog/random-card");
    expect(res.status).toBe(503);
    const j = (await res.json()) as { error?: string; code?: string };
    expect(j.error).toMatch(/unavailable|catalog/i);
  });

  it("legacy GET /api/single/puzzles/random-card still responds with cardId shape", async () => {
    initCardCatalog();
    const res = await app.request("http://localhost/api/single/puzzles/random-card?seed=legacy-shape-seed");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.cardId).toBe("string");
    expect(typeof body.cardName).toBe("string");
    expect(typeof body.fabSet).toBe("string");
    expect(body).not.toHaveProperty("id");
  });
});
