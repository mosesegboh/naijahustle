// Test double only. Application startup always connects to MongoDB.
export function memoryStore() {
  const races = new Map();
  const ads = new Map(),
    views = new Set();
  let economy = null;
  const users = new Map(),
    sessions = new Map(),
    presence = new Map();
  const copy = (v) => (v ? structuredClone(v) : null);
  return {
    economy: async () => copy(economy),
    saveEconomy: async (value) => {
      if ((economy?.revision || 0) !== value.revision) return false;
      economy = { ...copy(value), revision: value.revision + 1 };
      return true;
    },
    ad: async (id) => copy(ads.get(id)),
    adByReference: async (ref) =>
      copy([...ads.values()].find((a) => a.txRef === ref)),
    ownedAds: async (owner) =>
      copy([...ads.values()].filter((a) => a.owner === owner)),
    reviewAds: async () =>
      copy([...ads.values()].filter((a) => a.status === "review")),
    activeAds: async (now) =>
      copy(
        [...ads.values()].filter(
          (a) => a.status === "active" && a.expiresAt > now,
        ),
      ),
    createAd: async (ad) => {
      ads.set(ad.id, copy(ad));
    },
    patchAd: async (id, condition, fields) => {
      const ad = ads.get(id);
      if (!ad || !Object.entries(condition).every(([k, v]) => ad[k] === v))
        return false;
      ads.set(id, { ...ad, ...copy(fields) });
      return true;
    },
    impression: async (id, viewer, day) => {
      const key = `${id}:${viewer}:${day}`;
      if (!views.has(key)) {
        views.add(key);
        ads.get(id).impressions++;
      }
    },
    findPlayers: async (query, id) =>
      [...users.values()]
        .filter(
          (p) =>
            p.id !== id && p.name.toLowerCase().startsWith(query.toLowerCase()),
        )
        .slice(0, 12)
        .map(({ id, name }) => ({ id, name })),
    race: async (id) => copy(races.get(id)),
    racesFor: async (id, now) =>
      copy(
        [...races.values()]
          .filter(
            (m) =>
              m.created > now - 1800000 && m.players.some((p) => p.id === id),
          )
          .reverse()
          .slice(0, 20),
      ),
    createRace: async (m) => {
      races.set(m.id, copy(m));
    },
    saveRace: async (m) => {
      if (races.get(m.id)?.revision !== m.revision) return false;
      races.set(m.id, { ...copy(m), revision: m.revision + 1 });
      return true;
    },
    close: async () => {},
    ping: async () => {},
    user: async (id) => copy(users.get(id)),
    userByName: async (name) =>
      copy(
        [...users.values()].find(
          (u) => u.name.toLowerCase() === name.toLowerCase(),
        ),
      ),
    async createUser(user) {
      if (
        [...users.values()].some(
          (u) =>
            u.name.toLowerCase() === user.name.toLowerCase() ||
            (user.email && u.email?.toLowerCase() === user.email.toLowerCase()),
        )
      )
        return false;
      users.set(user.id, { ...copy(user), revision: 0, fight: null });
      return true;
    },
    async saveUser(user) {
      if (users.get(user.id)?.revision !== user.revision) return false;
      users.set(user.id, { ...copy(user), revision: user.revision + 1 });
      return true;
    },
    session: async (hash, now) => {
      const s = sessions.get(hash);
      return s?.expires > now ? copy(s) : null;
    },
    putSession: async (hash, id, expires) => {
      sessions.set(hash, { id, expires });
    },
    deleteSession: async (hash) => {
      sessions.delete(hash);
    },
    deletePresence: async (id) => {
      presence.delete(id);
    },
    async publishPresence(player, now) {
      presence.set(player.id, { ...player, expiresAt: now + 12000 });
      const active = [...presence.values()].filter((p) => p.expiresAt > now);
      return {
        online: active.length,
        players: active
          .filter((p) => p.id !== player.id && p.view === "city")
          .map(({ expiresAt, ...p }) => p),
      };
    },
  };
}
