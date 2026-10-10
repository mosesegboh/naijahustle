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
    await Promise.all([
      users.createIndex({ id: 1 }, { unique: true }),
      users.createIndex({ nameKey: 1 }, { unique: true }),
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      presence.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    return {
      close: () => client.close(),
      ping: () => db.command({ ping: 1 }),
      user: (id) => users.findOne({ id }),
      userByName: (name) => users.findOne({ nameKey: name.toLowerCase() }),
      async createUser(user) {
        try {
          await users.insertOne({
            ...user,
            nameKey: user.name.toLowerCase(),
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
