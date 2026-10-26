import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyCoopRoom, setLocalCoopRoomNotifier } from "@/server/realtime/coop-notify";

describe("co-op realtime notifications", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.COOP_REALTIME_NOTIFY_URL;
  });

  it("uses the in-process hub before the legacy HTTP fallback", async () => {
    const notifier = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const unregister = setLocalCoopRoomNotifier(notifier);

    notifyCoopRoom("room-1");
    await Promise.resolve();

    expect(notifier).toHaveBeenCalledWith("room-1");
    expect(fetchSpy).not.toHaveBeenCalled();
    unregister();
  });
});
