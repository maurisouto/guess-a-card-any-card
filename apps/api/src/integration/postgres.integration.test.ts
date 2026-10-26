import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createCoopRoom } from "@/server/services/coop-service";
import { createCompetitiveRoom } from "@/server/services/competitive-service";

const createdRoomIds: string[] = [];

async function createFixtureRoom() {
  const room = await prisma.room.create({
    data: {
      mode: "COOP",
      state: "LOBBY",
      hostGuestId: `fixture-host-${randomUUID()}`,
      selectedSets: [],
    },
  });
  createdRoomIds.push(room.id);
  return room;
}

async function expectRoomWithSingleHost(roomId: string, mode: "COOP" | "COMPETITIVE", guestId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { roomPlayers: { where: { leftAt: null } } },
  });
  expect(room).not.toBeNull();
  expect(room?.mode).toBe(mode);
  expect(room?.state).toBe("LOBBY");
  expect(room?.roomPlayers).toHaveLength(1);
  expect(room?.roomPlayers[0]).toMatchObject({
    roomId,
    guestId,
    isHost: true,
    isConnected: true,
  });
}

async function expectRoomCreationRollback(mode: "COOP" | "COMPETITIVE") {
  const guestId = `rollback-guest-${randomUUID()}`;
  const createRoom =
    mode === "COOP" ? createCoopRoom : createCompetitiveRoom;

  await expect(
    createRoom({ hostGuestId: guestId, displayName: "\u0000" }),
  ).rejects.toThrow();

  // PostgreSQL rejects NUL in text during the host-seat insert. The room insert must
  // be rolled back by the same transaction, leaving no room or seat for this guest.
  await expect(prisma.room.count({ where: { hostGuestId: guestId } })).resolves.toBe(0);
  await expect(prisma.roomPlayer.count({ where: { guestId } })).resolves.toBe(0);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

describe.sequential("PostgreSQL integration safety", () => {
  beforeEach(() => {
    expect(process.env.TEST_DATABASE_URL).toBeTruthy();
    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
  });

  afterAll(async () => {
    // Cleanup is scoped to fixture IDs created by this file. It never truncates or resets tables.
    if (createdRoomIds.length > 0) {
      await prisma.room.deleteMany({ where: { id: { in: createdRoomIds } } });
    }
    await prisma.$disconnect();
  });

  it("rolls back all writes when an interactive transaction fails", async () => {
    const roomId = randomUUID();

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.room.create({
          data: {
            id: roomId,
            mode: "COOP",
            state: "LOBBY",
            hostGuestId: `rollback-host-${randomUUID()}`,
            selectedSets: [],
          },
        });
        throw new Error("intentional rollback");
      }),
    ).rejects.toThrow("intentional rollback");

    await expect(prisma.room.findUnique({ where: { id: roomId } })).resolves.toBeNull();
  }, 15_000);

  it("creates a cooperative room and host seat atomically", async () => {
    const guestId = `coop-host-${randomUUID()}`;
    const { roomId } = await createCoopRoom({
      hostGuestId: guestId,
      displayName: " Coop Host ",
    });
    createdRoomIds.push(roomId);

    await expectRoomWithSingleHost(roomId, "COOP", guestId);
  }, 15_000);

  it("creates a competitive room and host seat atomically", async () => {
    const guestId = `competitive-host-${randomUUID()}`;
    const { roomId } = await createCompetitiveRoom({ hostGuestId: guestId, displayName: " Competitive Host " });
    createdRoomIds.push(roomId);

    await expectRoomWithSingleHost(roomId, "COMPETITIVE", guestId);
  }, 15_000);

  it("rolls back cooperative room creation when host-seat creation fails", async () => {
    await expectRoomCreationRollback("COOP");
  }, 15_000);

  it("rolls back competitive room creation when host-seat creation fails", async () => {
    await expectRoomCreationRollback("COMPETITIVE");
  }, 15_000);

  it("keeps concurrent independent room creations isolated", async () => {
    const creations = await Promise.all([
      createCoopRoom({ hostGuestId: `coop-${randomUUID()}`, displayName: "Co-op 1" }),
      createCoopRoom({ hostGuestId: `coop-${randomUUID()}`, displayName: "Co-op 2" }),
      createCompetitiveRoom({ hostGuestId: `competitive-${randomUUID()}`, displayName: "Competitive 1" }),
      createCompetitiveRoom({ hostGuestId: `competitive-${randomUUID()}`, displayName: "Competitive 2" }),
    ]);
    const roomIds = creations.map(({ roomId }) => roomId);
    createdRoomIds.push(...roomIds);

    expect(new Set(roomIds).size).toBe(4);
    for (const roomId of roomIds) {
      await expect(
        prisma.roomPlayer.count({ where: { roomId, leftAt: null, isHost: true } }),
      ).resolves.toBe(1);
    }
  }, 15_000);

  it("enforces one active guest seat per room across concurrent transactions", async () => {
    const room = await createFixtureRoom();
    const guestId = `fixture-guest-${randomUUID()}`;

    const results = await Promise.allSettled(
      [1, 2].map(() =>
        prisma.$transaction(async (tx) => {
          return tx.roomPlayer.create({
            data: {
              roomId: room.id,
              guestId,
              displayName: "Concurrent fixture",
              isHost: false,
              isConnected: true,
            },
          });
        }),
      ),
    );

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(isUniqueViolation(rejected[0]?.reason)).toBe(true);

    await expect(
      prisma.roomPlayer.count({ where: { roomId: room.id, guestId, leftAt: null } }),
    ).resolves.toBe(1);
  }, 15_000);
});
