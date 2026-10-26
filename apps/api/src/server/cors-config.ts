export const LOCAL_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

export function parseCorsOrigins(raw: string | undefined): string[] {
  return raw?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
}

export function resolveCorsOrigins(raw: string | undefined, nodeEnv: string | undefined): string[] {
  const configured = parseCorsOrigins(raw);
  if (configured.includes("*")) {
    throw new Error("CORS_ORIGIN must contain explicit origins; wildcard is not supported.");
  }
  if (nodeEnv === "production" && configured.length === 0) {
    throw new Error("CORS_ORIGIN must be configured in production.");
  }
  return configured.length > 0 ? configured : [...LOCAL_CORS_ORIGINS];
}

export function corsOriginForRequest(allowedOrigins: readonly string[], origin: string): string {
  return allowedOrigins.includes(origin) ? origin : "";
}
