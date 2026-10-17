import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { connectStore } from "./mongo.mjs";
import { racer, DEFAULT_OPTIONS } from "../../packages/shared/src/race-match";
it.skipIf(!process.env.MONGODB_TEST_URI)(
  "persists invitations and rejects stale race revisions in MongoDB",
  async () => {
    const db = "naija_race_test_" + randomUUID().replaceAll("-", "");
    const uri = process.env.MONGODB_TEST_URI!;
    let store = await connectStore(uri, db);
    try {
      await store.createUser({
        id: "a",
        name: "Ada",
        email: "a@example.test",
        coins: 0,
        wins: 0,
      });
      await store.createUser({
        id: "b",
        name: "Bisi",
        email: "b@example.test",
        coins: 0,
        wins: 0,
      });
      const m = {
        id: "test",
        host: "a",
        options: DEFAULT_OPTIONS,
        players: [racer("a", "Ada", "pulse"), racer("b", "Bisi", "shield")],
        status: "lobby",
        created: Date.now(),
        updated: Date.now(),
        starts: 0,
        time: -1,
        winner: null,
        shots: [],
        cleared: [],
        revision: 0,
      };
      await store.createRace(m);
      await store.close();
      store = await connectStore(uri, db);
      expect(await store.racesFor("b", Date.now())).toHaveLength(1);
      expect(await store.findPlayers("Bi", "a")).toEqual([
        { id: "b", name: "Bisi" },
      ]);
      const x = await store.race("test");
      x.players[1].accepted = true;
      expect(await store.saveRace(x)).toBe(true);
      expect(await store.saveRace(x)).toBe(false);
      expect((await store.race("test")).players[1].accepted).toBe(true);
    } finally {
      await store.close();
      const client = new MongoClient(uri);
      await client.connect();
      await client.db(db).dropDatabase();
      await client.close();
    }
  },
  30000,
);
