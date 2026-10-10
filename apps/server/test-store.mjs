// Test double only. Application startup always connects to MongoDB.
export function memoryStore() {
  const users = new Map(),
    sessions = new Map(),
    presence = new Map();
  const copy = (v) => (v ? structuredClone(v) : null);
  return {
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
          (u) => u.name.toLowerCase() === user.name.toLowerCase(),
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
