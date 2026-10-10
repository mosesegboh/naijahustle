import { useEffect, useState } from "react";
import {
  CHALLENGES,
  type FightAction,
} from "../../../../packages/shared/src/combat";
import { useSessionStore } from "../stores/sessionStore";
import { useWorldStore } from "../stores/worldStore";
import { usePlayerStore } from "../stores/playerStore";
export function CityLife() {
  const s = useSessionStore(),
    w = useWorldStore(),
    p = usePlayerStore((state) => state.progress);
  const [open, setOpen] = useState<"challenges" | "account" | null>(null),
    [mode, setMode] = useState("login"),
    [name, setName] = useState(""),
    [password, setPassword] = useState("");
  useEffect(() => {
    void useSessionStore.getState().restore();
    const t = setInterval(() => void useSessionStore.getState().tick(), 200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    useWorldStore.setState({ combat: s.fight !== null });
    return () => {
      useWorldStore.setState({ combat: false });
    };
  }, [s.fight !== null]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !useSessionStore.getState().fight ||
        e.repeat ||
        (e.target as HTMLElement)?.matches("input,textarea,select")
      )
        return;
      const action = (
        { j: "jab", k: "kick", l: "block", " ": "dodge" } as Record<
          string,
          FightAction
        >
      )[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        void useSessionStore.getState().action(action);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const show = (value: typeof open) => {
    setOpen(value);
    w.setPanel(value ? "social" : null);
  };
  useEffect(() => {
    if (w.panel !== "social") setOpen(null);
  }, [w.panel]);
  if (!p.name) return null;
  return (
    <>
      {s.error && !open && !s.fight && (
        <div className="life-error glass" role="alert">
          {s.error}
        </div>
      )}
      <div className="city-life-tools glass">
        <button
          disabled={w.riding || !!s.fight}
          onClick={() => show("challenges")}
        >
          ✦ Challenges
        </button>
        <button disabled={!!s.fight} onClick={() => show("account")}>
          {s.user
            ? `${s.user.name} · ${s.connected ? s.online + " online" : "reconnecting"}`
            : "Join online"}
        </button>
        <span className="coin-balance">◉ {s.user?.coins ?? 0} coins</span>
      </div>
      {s.fight && (
        <section className="combat-hud glass" aria-label="Combat challenge">
          <div className="combat-heading">
            <span>
              LEVEL {s.fight.level + 1} ·{" "}
              {s.practice ? "PRACTICE" : "COIN CHALLENGE"}
            </span>
            <b>{CHALLENGES[s.fight.level].name}</b>
          </div>
          <div className="combat-bars">
            <label>
              You <progress max={100} value={s.fight.hp} />
              <span>{s.fight.hp} HP</span>
            </label>
            <label>
              Opponent{" "}
              <progress
                max={CHALLENGES[s.fight.level].health}
                value={s.fight.enemyHp}
              />
              <span>{s.fight.enemyHp} HP</span>
            </label>
          </div>
          <label className="stamina">
            Stamina <meter max={100} value={s.fight.stamina} />
          </label>
          <p
            role="status"
            className={
              s.fight.status === "active" &&
              s.fight.nextAttack - s.fight.updatedAt < 0.85
                ? "attack-cue"
                : ""
            }
          >
            {s.fight.status === "active" &&
            s.fight.nextAttack - s.fight.updatedAt < 0.85
              ? "Incoming strike — block or dodge!"
              : s.fight.message}
          </p>
          {s.fight.status === "active" ? (
            <>
              <div className="fight-actions">
                {(["jab", "kick", "block", "dodge"] as const).map((a, i) => (
                  <button key={a} onClick={() => void s.action(a)}>
                    <kbd>{["J", "K", "L", "Space"][i]}</kbd>
                    {a}
                  </button>
                ))}
              </div>
              <button className="retreat" onClick={() => void s.leaveFight()}>
                Leave challenge
              </button>
            </>
          ) : (
            <>
              <strong className="fight-reward">
                {s.fight.status === "won"
                  ? s.practice
                    ? "Practice cleared · sign in to earn coins"
                    : `+${s.fight.reward} coins earned`
                  : "Try again when you’re ready"}
              </strong>
              <button className="primary" onClick={s.dismissFight}>
                Return to the city
              </button>
            </>
          )}
          {s.error && <p role="alert">{s.error}</p>}
        </section>
      )}
      {open && w.panel === "social" && (
        <div className="panel-backdrop" onClick={() => show(null)}>
          <section
            className="detail-panel glass life-panel"
            role="dialog"
            aria-modal="true"
            aria-label={
              open === "account" ? "Online account" : "Challenge ladder"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="panel-close"
              aria-label="Close panel"
              onClick={() => show(null)}
            >
              ×
            </button>
            {open === "account" ? (
              <>
                <span className="eyebrow">A SHARED LAGOS</span>
                <h2>
                  {s.user ? "Your online account" : "Meet other players."}
                </h2>
                {s.user ? (
                  <>
                    <p>
                      Signed in as <b>{s.user.name}</b>. Other signed-in players
                      appear in the city with name labels.
                    </p>
                    <div className="profile-grid">
                      <div>
                        <small>Earned coins</small>
                        <b>{s.user.coins}</b>
                      </div>
                      <div>
                        <small>Victories</small>
                        <b>{s.user.wins}</b>
                      </div>
                    </div>
                    <p>
                      Coin conversion is coming later. Coins currently stay in
                      your account.
                    </p>
                    <button className="primary" onClick={() => void s.logout()}>
                      Sign out
                    </button>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void s.auth(mode, name, password);
                      setPassword("");
                    }}
                  >
                    <p>
                      Keep exploring as a guest, or create an account to earn
                      coins and join the shared city.
                    </p>
                    <label>
                      Username
                      <input
                        required
                        minLength={3}
                        maxLength={20}
                        pattern="[a-zA-Z0-9_]+"
                        autoComplete="username"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label>
                      Password
                      <input
                        required
                        type="password"
                        minLength={10}
                        maxLength={128}
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>
                    <button className="primary" disabled={s.busy}>
                      {s.busy
                        ? "Connecting…"
                        : mode === "login"
                          ? "Sign in"
                          : "Create account"}
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setMode(mode === "login" ? "register" : "login")
                      }
                    >
                      {mode === "login"
                        ? "New here? Create an account"
                        : "Already registered? Sign in"}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <span className="eyebrow">STREET CHALLENGES</span>
                <h2>Stand your ground.</h2>
                <p>
                  Four fictional adult opponents. Read their attack cues, manage
                  stamina, and fight your way up.{" "}
                  {s.user
                    ? "Victories earn account coins."
                    : "Guest fights are practice; sign in to earn coins."}
                </p>
                <div className="challenge-list">
                  {CHALLENGES.map((c, i) => {
                    const locked = i > (s.user?.level ?? s.practiceLevel);
                    return (
                      <button
                        key={c.name}
                        disabled={locked || s.busy}
                        onClick={async () => {
                          if (w.riding) return;
                          w.setView("city");
                          await s.startFight(i);
                          if (useSessionStore.getState().fight) show(null);
                        }}
                      >
                        <span className="level-badge">{i + 1}</span>
                        <span>
                          <b>{c.name}</b>
                          <small>
                            {locked
                              ? "Win the previous level to unlock"
                              : c.place}
                          </small>
                        </span>
                        <strong>{locked ? "Locked" : `◉ ${c.reward}`}</strong>
                      </button>
                    );
                  })}
                </div>
                <p className="muted">
                  J: jab · K: kick · L: block · Space: dodge. Touch buttons work
                  too. The camera moves closer during fights.
                </p>
              </>
            )}
            {s.error && (
              <p role="alert" className="account-error">
                {s.error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
