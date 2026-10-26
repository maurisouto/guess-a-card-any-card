import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const createdRoomIds: string[] = [];
const createdGameIds: string[] = [];
const createdUserIds: string[] = [];

async function createUser() {
  const user = await prisma.user.create({
    data: {
      displayName: "Identity fixture",
      email: `${randomUUID()}@integration.test`,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createRoom(data: {
  hostUserId?: string | null;
  hostGuestId?: string | null;
}) {
  const room = await prisma.room.create({
    data: {
      mode: "COOP",
      state: "LOBBY",
      selectedSets: [],
      hostUserId: data.hostUserId ?? null,
      hostGuestId: data.hostGuestId ?? null,
    },
  });
  createdRoomIds.push(room.id);
  return room;
}

async function createGame() {
  const game = await prisma.game.create({
    data: {
      mode: "SINGLE",
      cardId: `identity-card-${randomUUID()}`,
      cardName: "Identity fixture card",
      cardSet: "TEST",
      cardImageUrl: "https://example.test/card.png",
      revealSeed: "identity-seed",
      revealCardKind: "standard",
      cardTemplateKey: "standard",
      status: "IN_PROGRESS",
      currentStep: 1,
    },
  });
  createdGameIds.push(game.id);
  return game;
}

async function expectConstraintFailure(operation: Promise<unknown>): Promise<void> {
  await expect(operation).rejects.toThrow();
}

describe.sequential("PostgreSQL identity invariants", () => {
  afterAll(async () => {
    if (createdGameIds.length > 0) {
      await prisma.game.deleteMany({ where: { id: { in: createdGameIds } } });
    }
    if (createdRoomIds.length > 0) {
      await prisma.room.deleteMany({ where: { id: { in: createdRoomIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  it("accepts valid registered and guest room identities", async () => {
    const user = await createUser();
    const registeredRoom = await createRoom({ hostUserId: user.id });
    const guestId = `identity-guest-${randomUUID()}`;
    const guestRoom = await createRoom({ hostGuestId: guestId });

    await prisma.roomPlayer.create({
      data: {
        roomId: registeredRoom.id,
        userId: user.id,
        displayName: "Registered",
        isHost: true,
      },
    });
    await prisma.roomPlayer.create({
      data: {
        roomId: guestRoom.id,
        guestId,
        displayName: "Guest",
        isHost: true,
      },
    });

    await expect(
      prisma.roomPlayer.count({ where: { roomId: registeredRoom.id } }),
    ).resolves.toBe(1);
    await expect(prisma.roomPlayer.count({ where: { roomId: guestRoom.id } })).resolves.toBe(1);
  });

  it("rejects invalid room host and active seat identities", async () => {
    const user = await createUser();
    await expectConstraintFailure(createRoom({ hostUserId: user.id, hostGuestId: "both-host" }));
    await expectConstraintFailure(createRoom({}));

    const validRoom = await createRoom({ hostGuestId: `host-${randomUUID()}` });
    await expectConstraintFailure(
      prisma.roomPlayer.create({
        data: {
          roomId: validRoom.id,
          userId: user.id,
          guestId: "both-seat",
          displayName: "Invalid",
        },
      }),
    );
    await expectConstraintFailure(
      prisma.roomPlayer.create({
        data: {
          roomId: validRoom.id,
          displayName: "Invalid",
        },
      }),
    );
  });

  it("preserves an inactive historical seat with neither identity", async () => {
    const room = await createRoom({ hostGuestId: `historical-host-${randomUUID()}` });
    const player = await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        displayName: "Historical seat",
        leftAt: new Date(),
        isConnected: false,
      },
    });

    await expect(
      prisma.roomPlayer.findUnique({ where: { id: player.id } }),
    ).resolves.toMatchObject({ userId: null, guestId: null });
  });

  it("accepts valid GamePlayer identities and rejects both populated", async () => {
    const user = await createUser();
    const game = await createGame();
    await prisma.gamePlayer.create({
      data: { gameId: game.id, userId: user.id, displayName: "Registered" },
    });
    await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        guestId: `game-guest-${randomUUID()}`,
        displayName: "Guest",
      },
    });
    await expectConstraintFailure(
      prisma.gamePlayer.create({
        data: {
          gameId: game.id,
          userId: user.id,
          guestId: "both-game-player",
          displayName: "Invalid",
        },
      }),
    );
  });

  it("rolls back room creation when an identity constraint is violated", async () => {
    const roomId = randomUUID();
    await expectConstraintFailure(
      prisma.$transaction(async (tx) => {
        await tx.room.create({
          data: {
            id: roomId,
            mode: "COOP",
            state: "LOBBY",
            hostGuestId: `rollback-${randomUUID()}`,
            selectedSets: [],
          },
        });
        await tx.roomPlayer.create({
          data: {
            roomId,
            displayName: "Invalid active identity",
          },
        });
      }),
    );

    await expect(prisma.room.findUnique({ where: { id: roomId } })).resolves.toBeNull();
  });
});
