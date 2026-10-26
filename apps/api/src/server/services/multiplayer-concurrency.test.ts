import { beforeEach, describe, expect, it, vi } from "vitest";

const roomPlayerFindFirst = vi.hoisted(() => vi.fn());
const roomFindUnique = vi.hoisted(() => vi.fn());
const roomUpdateMany = vi.hoisted(() => vi.fn());
const roomPlayerUpdate = vi.hoisted(() => vi.fn());
const gameCreate = vi.hoisted(() => vi.fn());
const gamePlayerCreate = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const getRandomCard = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    roomPlayer: { findFirst: roomPlayerFindFirst },
    room: { findUnique: roomFindUnique },
    $transaction: transaction,
  },
}));

vi.mock("@/server/services/card-catalog-service", () => ({
  getRandomCard,
}));

vi.mock("@/server/realtime/coop-notify", () => ({
  notifyCoopRoom: vi.fn(),
}));

vi.mock("@/lib/card-art-url", () => ({
  resolveCatalogCardArtUrl: vi.fn(() => "https://img/card.png"),
}));

vi.mock("@/lib/fab-reveal-profile", () => ({
  revealProfileFromFabCard: vi.fn(() => ({
    revealCardKind: "STANDARD",
    cardTemplateKey: "standard",
  })),
}));

vi.mock("@/lib/game-card-resolution", () => ({
  newRevealSeed: vi.fn(() => "seed"),
  resolveGameCard: vi.fn(),
}));

vi.mock("@/server/services/terminal-game-stats-service", () => ({
  applyRegisteredUserStatsForTerminalGameInTx: vi.fn(),
}));

const catalogCard = {
  id: "card-1",
  name: "Test Card",
  setKey: "MON",
  imageUrl: "https://img/card.png",
  fabCard: {},
  printing: {},
};

function lobbyRoom(mode: "COOP" | "COMPETITIVE") {
  return {
    id: "room-1",
    mode,
    state: "LOBBY",
    selectedSets: [],
    timerPerStepSeconds: 90,
    roomPlayers: [
      { id: "player-1", guestId: "host-1", userId: null, displayName: "Host", avatarId: null, isHost: true },
      { id: "player-2", guestId: "guest-2", userId: null, displayName: "Guest", avatarId: null, isHost: false },
    ],
  };
}

describe("multiplayer room transition guards", () => {
  beforeEach(() => {
    vi.resetModules();
    roomPlayerFindFirst.mockReset();
    roomFindUnique.mockReset();
    roomUpdateMany.mockReset();
    roomPlayerUpdate.mockReset();
    gameCreate.mockReset();
    gamePlayerCreate.mockReset();
    transaction.mockReset();
    getRandomCard.mockReset();

    roomPlayerFindFirst.mockResolvedValue({
      id: "player-1",
      guestId: "host-1",
      isHost: true,
      leftAt: null,
    });
    getRandomCard.mockReturnValue(catalogCard);
    gameCreate.mockResolvedValue({ id: "game-1" });
    roomPlayerUpdate.mockResolvedValue(undefined);
    gamePlayerCreate.mockResolvedValue(undefined);
    transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        room: { updateMany: roomUpdateMany },
        roomPlayer: { update: roomPlayerUpdate },
        game: { create: gameCreate },
        gamePlayer: { create: gamePlayerCreate },
      }),
    );
  });

  it("rejects a co-op start when another transaction already claimed the lobby", async () => {
    roomFindUnique.mockResolvedValue(lobbyRoom("COOP"));
    roomUpdateMany.mockResolvedValue({ count: 0 });

    const { startCoopGame } = await import("@/server/services/coop-service");

    await expect(startCoopGame({ roomId: "room-1", hostGuestId: "host-1" })).rejects.toMatchObject({
      status: 409,
    });
    expect(roomUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "room-1",
          state: "LOBBY",
          currentGameId: null,
        }),
      }),
    );
  });

  it("rejects a competitive start when another transaction already claimed the lobby", async () => {
    roomFindUnique.mockResolvedValue(lobbyRoom("COMPETITIVE"));
    roomUpdateMany.mockResolvedValue({ count: 0 });

    const { startCompetitiveGame } = await import("@/server/services/competitive-service");

    await expect(
      startCompetitiveGame({ roomId: "room-1", hostGuestId: "host-1" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(roomUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "room-1",
          state: "LOBBY",
          currentGameId: null,
        }),
      }),
    );
  });
});
