import { MongoClient } from "mongodb";

// Account revisions make the fight, balance and reward ledger one atomic write.
// A competing request must reload instead of overwriting an already-paid fight.
export async function connectStore(
  uri = process.env.MONGODB_URI,
  name = process.env.MONGODB_DB ?? "naija_hustle",
) {
  if (!uri)
    throw new Error("Set MONGODB_URI in .env or your hosting configuration.");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
    writeConcern: { w: "majority" },
  });
  try {
    await client.connect();
    const db = client.db(name);
    const users = db.collection("users"),
      sessions = db.collection("sessions"),
      presence = db.collection("presence");
    const races = db.collection("race_matches");
    const ads = db.collection("advertisements"),
      config = db.collection("economy_settings"),
      views = db.collection("ad_impressions");
    await Promise.all([
      ads.createIndex({ id: 1 }, { unique: true }),
      ads.createIndex({ txRef: 1 }, { unique: true, sparse: true }),
      ads.createIndex({ transactionId: 1 }, { unique: true, sparse: true }),
      views.createIndex({ ad: 1, viewer: 1, day: 1 }, { unique: true }),
      views.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      races.createIndex({ id: 1 }, { unique: true }),
      races.createIndex({ "players.id": 1, created: -1 }),
      races.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      users.createIndex({ id: 1 }, { unique: true }),
      users.createIndex({ nameKey: 1 }, { unique: true }),
      users.createIndex(
        { emailKey: 1 },
        {
          unique: true,
          partialFilterExpression: { emailKey: { $type: "string" } },
        },
      ),
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      presence.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    return {
      economy: () => config.findOne({ _id: "main" }),
      async saveEconomy(value) {
        const { revision, ...fields } = value;
        try {
          const r = await config.updateOne(
            { _id: "main", revision },
            { $set: fields, $inc: { revision: 1 } },
            { upsert: revision === 0 },
          );
          return !!(r.modifiedCount || r.upsertedCount);
        } catch (e) {
          if (e.code === 11000) return false;
          throw e;
        }
      },
      ad: (id) => ads.findOne({ id }),
      adByReference: (txRef) => ads.findOne({ txRef }),
      ownedAds: (owner) =>
        ads.find({ owner }).sort({ created: -1 }).limit(100).toArray(),
      reviewAds: () =>
        ads
          .find({ status: "review" })
          .sort({ created: 1 })
          .limit(100)
          .toArray(),
      activeAds: (now) =>
        ads
          .find({ status: "active", expiresAt: { $gt: now } })
          .limit(100)
          .toArray(),
      createAd: (ad) => ads.insertOne(ad),
      async patchAd(id, condition, fields) {
        const r = await ads.updateOne({ id, ...condition }, { $set: fields });
        return r.modifiedCount === 1;
      },
      async impression(ad, viewer, day) {
        // A transaction keeps the daily de-duplication record and count together.
        const session = client.startSession();
        try {
          await session.withTransaction(async () => {
            await views.insertOne(
              { ad, viewer, day, expiresAt: new Date((day + 31) * 86400000) },
              { session },
            );
            await ads.updateOne(
              { id: ad },
              { $inc: { impressions: 1 } },
              { session },
            );
          });
        } catch (e) {
          if (e.code !== 11000) throw e;
        } finally {
          await session.endSession();
        }
      },
      findPlayers: (query, id) =>
        users
          .find(
            { id: { $ne: id }, nameKey: { $regex: "^" + query.toLowerCase() } },
            { projection: { _id: 0, id: 1, name: 1 } },
          )
          .limit(12)
          .toArray(),
      race: (id) => races.findOne({ id }),
      racesFor: (id, now) =>
        races
          .find({ "players.id": id, created: { $gt: now - 1800000 } })
          .sort({ created: -1 })
          .limit(20)
          .toArray(),
      createRace: (m) =>
        races.insertOne({ ...m, expiresAt: new Date(m.created + 86400000) }),
      async saveRace(m) {
        const { _id, revision, ...fields } = m;
        const r = await races.updateOne(
          { id: m.id, revision },
          { $set: fields, $inc: { revision: 1 } },
        );
        return r.modifiedCount === 1;
      },
      close: () => client.close(),
      ping: () => db.command({ ping: 1 }),
      user: (id) => users.findOne({ id }),
      userByName: (name) => users.findOne({ nameKey: name.toLowerCase() }),
      async createUser(user) {
        try {
          await users.insertOne({
            ...user,
            nameKey: user.name.toLowerCase(),
            ...(user.email
              ? { emailKey: user.email.trim().toLowerCase() }
              : {}),
            revision: 0,
            fight: null,
          });
          return true;
        } catch (error) {
          if (error.code === 11000) return false;
          throw error;
        }
      },
      async saveUser(user) {
        const { _id, revision, ...fields } = user;
        const result = await users.updateOne(
          { id: user.id, revision },
          { $set: fields, $inc: { revision: 1 } },
        );
        return result.modifiedCount === 1;
      },
      session: (hash, now) =>
        sessions.findOne({ _id: hash, expiresAt: { $gt: new Date(now) } }),
      putSession: (hash, id, expires) =>
        sessions.insertOne({ _id: hash, id, expiresAt: new Date(expires) }),
      deleteSession: (hash) => sessions.deleteOne({ _id: hash }),
      deletePresence: (id) => presence.deleteOne({ _id: id }),
      async publishPresence(player, now) {
        await presence.updateOne(
          { _id: player.id },
          { $set: { ...player, expiresAt: new Date(now + 12000) } },
          { upsert: true },
        );
        const active = { expiresAt: { $gt: new Date(now) } };
        const [players, online] = await Promise.all([
          presence
            .find(
              { ...active, id: { $ne: player.id }, view: "city" },
              { projection: { _id: 0, expiresAt: 0 } },
            )
            .limit(64)
            .toArray(),
          presence.countDocuments(active),
        ]);
        return { players, online };
      },
    };
  } catch (error) {
    await client.close();
    throw error;
  }
}
