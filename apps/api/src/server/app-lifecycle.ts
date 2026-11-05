export type ApplicationLifecycleState =
  | "starting"
  | "ready"
  | "shutting_down"
  | "stopped";

let state: ApplicationLifecycleState = "starting";

export function getApplicationLifecycleState(): ApplicationLifecycleState {
  return state;
}

export function markApplicationReady(): void {
  if (state === "starting") state = "ready";
}

export function markApplicationShuttingDown(): void {
  if (state === "starting" || state === "ready") state = "shutting_down";
}

export function markApplicationStopped(): void {
  state = "stopped";
}

export function __resetApplicationLifecycleForTests(): void {
  state = "starting";
}
