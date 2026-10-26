type LocalCoopRoomNotifier = (roomId: string) => void | Promise<void>;

let localNotifier: LocalCoopRoomNotifier | null = null;

export function setLocalCoopRoomNotifier(notifier: LocalCoopRoomNotifier): () => void {
  localNotifier = notifier;
  return () => {
    if (localNotifier === notifier) localNotifier = null;
  };
}

/** Notify the in-process WS hub, falling back to the legacy companion process when configured. */
export function notifyCoopRoom(roomId: string): void {
  if (localNotifier) {
    void localNotifier(roomId);
    return;
  }

  const base = process.env.COOP_REALTIME_NOTIFY_URL?.trim();
  if (!base || !roomId) return;

  const url = `${base.replace(/\/$/, "")}/notify`;
  const secret = process.env.COOP_REALTIME_SECRET?.trim();

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ roomId }),
  }).catch(() => {
    /* best-effort; HTTP polling still works */
  });
}
