import { describe, expect, it } from "vitest";
import {
  parseDisplayName,
  parseGuessInput,
  parseMultiplayerJsonBody,
  parseSelectedSets,
  parseTimerPerStepSeconds,
  requireUuid,
} from "./multiplayer-input";

describe("multiplayer input validation", () => {
  it("trims valid names and guesses without silently coercing fields", async () => {
    expect(parseDisplayName({ displayName: "  Seer  " })).toBe("Seer");
    expect(parseGuessInput({ guessText: "  Bravo Star  ", timeTakenMs: 1200 })).toEqual({
      guessText: "Bravo Star",
      timeTakenMs: 1200,
    });
    await expect(
      parseMultiplayerJsonBody({ json: async () => ({ displayName: "ok" }) }),
    ).resolves.toEqual({ displayName: "ok" });
  });

  it.each([
    { displayName: "", field: "displayName" },
    { displayName: "   ", field: "displayName" },
    { displayName: "x".repeat(81), field: "displayName" },
  ])("rejects invalid display names", ({ displayName }) => {
    expect(() => parseDisplayName({ displayName })).toThrow(/Invalid displayName/);
  });

  it.each([
    { guessText: "", timeTakenMs: 1 },
    { guessText: "\t", timeTakenMs: 1 },
    { guessText: "x".repeat(301), timeTakenMs: 1 },
    { guessText: "valid", timeTakenMs: -1 },
    { guessText: "valid", timeTakenMs: 1.5 },
    { guessText: "valid", timeTakenMs: Number.NaN },
    { guessText: "valid", timeTakenMs: 86_400_001 },
  ])("rejects invalid guesses and timings", (body) => {
    expect(() => parseGuessInput(body)).toThrow();
  });

  it("accepts an empty set selection and rejects unknown, duplicate and oversized selections", () => {
    expect(parseSelectedSets({ selectedSets: [] }, ["Monarch"])).toEqual([]);
    expect(parseSelectedSets({ selectedSets: [" Monarch "] }, ["Monarch"])).toEqual(["Monarch"]);
    expect(() => parseSelectedSets({ selectedSets: ["Unknown"] }, ["Monarch"])).toThrow();
    expect(() => parseSelectedSets({ selectedSets: ["Monarch", "Monarch"] }, ["Monarch"])).toThrow(
      /duplicates/,
    );
    expect(() => parseSelectedSets({ selectedSets: ["Monarch".repeat(101)] }, ["Monarch"])).toThrow();
    expect(() => parseSelectedSets({ selectedSets: Array.from({ length: 101 }, () => "Monarch") }, ["Monarch"])).toThrow();
  });

  it.each([14, 601, 15.5, Number.POSITIVE_INFINITY])("rejects invalid competitive timers", (value) => {
    expect(() => parseTimerPerStepSeconds({ timerPerStepSeconds: value })).toThrow();
  });

  it("validates UUID route identifiers", () => {
    expect(requireUuid("123e4567-e89b-12d3-a456-426614174000", "roomId")).toBe(
      "123e4567-e89b-12d3-a456-426614174000",
    );
    expect(() => requireUuid("not-a-uuid", "roomId")).toThrow(/Invalid roomId/);
  });

  it("rejects malformed JSON and non-object bodies", async () => {
    await expect(
      parseMultiplayerJsonBody({ json: async () => { throw new Error("bad json"); } }),
    ).rejects.toThrow(/valid JSON/);
    await expect(
      parseMultiplayerJsonBody({ json: async () => [] }),
    ).rejects.toThrow(/JSON object/);
  });
});
