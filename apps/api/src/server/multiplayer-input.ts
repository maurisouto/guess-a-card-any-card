export const DISPLAY_NAME_MAX_LENGTH = 80;
export const GUESS_TEXT_MAX_LENGTH = 300;
export const SELECTED_SETS_MAX_LENGTH = 100;
export const SET_IDENTIFIER_MAX_LENGTH = 120;
export const TIME_TAKEN_MS_MAX = 86_400_000;
export const TIMER_SECONDS_MIN = 15;
export const TIMER_SECONDS_MAX = 600;

export class MultiplayerInputError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "MultiplayerInputError";
  }
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new MultiplayerInputError("Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

export async function parseMultiplayerJsonBody(request: {
  json: () => Promise<unknown>;
}): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new MultiplayerInputError("Request body must be valid JSON.");
  }
  return asRecord(body);
}

function requiredText(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
): string {
  if (typeof body[field] !== "string") {
    throw new MultiplayerInputError(`Invalid ${field}.`);
  }
  const value = body[field].trim();
  if (value.length === 0 || value.length > maxLength) {
    throw new MultiplayerInputError(`Invalid ${field}.`);
  }
  return value;
}

export function parseDisplayName(body: Record<string, unknown>): string {
  return requiredText(body, "displayName", DISPLAY_NAME_MAX_LENGTH);
}

export function validateDisplayName(value: string): string {
  return parseDisplayName({ displayName: value });
}

export function parseGuessText(body: Record<string, unknown>): string {
  return requiredText(body, "guessText", GUESS_TEXT_MAX_LENGTH);
}

export function parseTimeTakenMs(body: Record<string, unknown>): number {
  const value = body.timeTakenMs;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > TIME_TAKEN_MS_MAX
  ) {
    throw new MultiplayerInputError("Invalid timeTakenMs.");
  }
  return value;
}

export function parseGuessInput(body: Record<string, unknown>): {
  guessText: string;
  timeTakenMs: number;
} {
  return {
    guessText: parseGuessText(body),
    timeTakenMs: parseTimeTakenMs(body),
  };
}

export function validateGuessInput(guessText: string, timeTakenMs: number): {
  guessText: string;
  timeTakenMs: number;
} {
  return parseGuessInput({ guessText, timeTakenMs });
}

export function parseSelectedSets(
  body: Record<string, unknown>,
  allowedSets: readonly string[],
): string[] {
  if (!Array.isArray(body.selectedSets) || body.selectedSets.length > SELECTED_SETS_MAX_LENGTH) {
    throw new MultiplayerInputError("Invalid selectedSets.");
  }

  const allowed = new Set(allowedSets);
  const selected = body.selectedSets.map((raw) => {
    if (typeof raw !== "string") {
      throw new MultiplayerInputError("Invalid selectedSets.");
    }
    const value = raw.trim();
    if (value.length === 0 || value.length > SET_IDENTIFIER_MAX_LENGTH || !allowed.has(value)) {
      throw new MultiplayerInputError("Invalid selectedSets.");
    }
    return value;
  });

  if (new Set(selected).size !== selected.length) {
    throw new MultiplayerInputError("selectedSets cannot contain duplicates.");
  }
  return selected;
}

export function validateSelectedSets(selectedSets: string[], allowedSets: readonly string[]): string[] {
  return parseSelectedSets({ selectedSets }, allowedSets);
}

export function parseTimerPerStepSeconds(body: Record<string, unknown>): number {
  const value = body.timerPerStepSeconds;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < TIMER_SECONDS_MIN ||
    value > TIMER_SECONDS_MAX
  ) {
    throw new MultiplayerInputError("Timer must be an integer between 15 and 600 seconds.");
  }
  return value;
}

export function validateTimerPerStepSeconds(value: number): number {
  return parseTimerPerStepSeconds({ timerPerStepSeconds: value });
}

export function requireUuid(value: string, field: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new MultiplayerInputError(`Invalid ${field}.`);
  }
  return value;
}
