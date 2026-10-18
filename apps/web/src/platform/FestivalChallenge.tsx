import AdvertiseBanner from "../commerce/AdvertiseBanner";
import { useEffect, useRef, useState } from "react";
import { api } from "../stores/sessionStore";
import {
  advanceFestival,
  runner,
  reward,
  DURATION,
  type FestivalMatch,
  type PlatformInput,
} from "../../../../packages/shared/src/platform";
import { paint } from "./paint";
import "./festival.css";
export default function FestivalChallenge({
  userId,
  name,
  onExit,
}: {
  userId: string;
  name: string;
  onExit: () => void;
}) {
  const [matches, setMatches] = useState<FestivalMatch[]>([]);
  const [match, setMatch] = useState<FestivalMatch | null>(null);
  const state = useRef<FestivalMatch | null>(null);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<PlatformInput>({ move: 0, jump: false });
  const jumpPulse = useRef(false);
  const keys = useRef(new Set<string>());
  const fingers = useRef(new Map<number, string>());
  const offset = useRef(0);
  const [clock, setClock] = useState(Date.now());
  const open = (m: FestivalMatch) => {
    state.current = m;
    setMatch(m);
    setError("");
  };
  const refresh = async () => {
    const d = await api("festival");
    setMatches(d.matches);
  };
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const d = await api("festival");
        if (live) setMatches(d.matches);
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    };
    void poll();
    const timer = setInterval(poll, 3000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      void api("races/players", { query })
        .then((d) => {
          if (live) setPlayers(d.players);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);
  async function action(id: string, action: string) {
    setBusy(true);
    setError("");
    try {
      const d = await api("festival/action", { id, action });
      if (action === "start") open(d.match);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const [heldActions, setHeldActions] = useState<string[]>([]);
  const updateInput = () => {
    const held = [...keys.current, ...fingers.current.values()];
    setHeldActions(held);
    input.current = {
      move: Number(held.includes("right")) - Number(held.includes("left")),
      jump: held.includes("jump"),
    };
  };
  useEffect(() => {
    if (!match) return;
    const reset = () => {
      setHeldActions([]);
      keys.current.clear();
      fingers.current.clear();
      jumpPulse.current = false;
      input.current = { move: 0, jump: false };
    };
    reset();
    const resize = new ResizeObserver(() => {
      const element = canvas.current;
      if (!element) return;
      const rect = element.parentElement!.getBoundingClientRect();
      element.width = Math.max(
        320,
        Math.round((540 * rect.width) / Math.max(1, rect.height)),
      );
    });
    if (canvas.current?.parentElement)
      resize.observe(canvas.current.parentElement);
    let live = true,
      frame = 0,
      timer: ReturnType<typeof setTimeout>;
    const keyboard = (event: KeyboardEvent) => {
      const action = (
        {
          ArrowLeft: "left",
          KeyA: "left",
          ArrowRight: "right",
          KeyD: "right",
          Space: "jump",
          ArrowUp: "jump",
          KeyW: "jump",
        } as Record<string, string>
      )[event.code];
      if (
        !action ||
        (event.type === "keydown" &&
          (event.target as HTMLElement)?.closest("button,input"))
      )
        return;
      event.preventDefault();
      if (event.type === "keydown") {
        keys.current.add(action);
        if (action === "jump" && !event.repeat) jumpPulse.current = true;
      } else keys.current.delete(action);
      updateInput();
    };
    window.addEventListener("keydown", keyboard);
    window.addEventListener("keyup", keyboard);
    window.addEventListener("blur", reset);
    window.addEventListener("orientationchange", reset);
    document.addEventListener("visibilitychange", reset);
    let lastUI = 0;
    const visual = new Map<string, { x: number; y: number }>();
    const render = (now: number) => {
      if (!live) return;
      const m = state.current;
      if (m) {
        if (m.practice) {
          const p = m.players[0];
          p.jumpQueued ||=
            jumpPulse.current || (input.current.jump && !p.input.jump);
          jumpPulse.current = false;
          p.input = { ...input.current };
          p.lastInput = Date.now();
          advanceFestival(m, Date.now());
        }
        const ctx = canvas.current?.getContext("2d");
        if (ctx) {
          const rendered = {
            ...m,
            players: m.players.map((p) => {
              const old = visual.get(p.id) ?? { x: p.x, y: p.y };
              const snap = Math.abs(old.x - p.x) > 180;
              const next = {
                x: snap ? p.x : old.x + (p.x - old.x) * 0.3,
                y: snap ? p.y : old.y + (p.y - old.y) * 0.3,
              };
              visual.set(p.id, next);
              return { ...p, ...next };
            }),
          };
          paint(ctx, rendered, userId, Date.now() + offset.current);
        }
        if (now - lastUI > 100) {
          setClock(Date.now() + offset.current);
          if (m.practice) setMatch({ ...m });
          lastUI = now;
        }
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const sync = async () => {
      if (!live || state.current?.practice) return;
      const m = state.current!;
      const jump = jumpPulse.current || input.current.jump;
      jumpPulse.current = false;
      try {
        const d = await api("festival/action", {
          id: m.id,
          action: m.status === "active" ? "input" : "poll",
          input: { ...input.current, jump },
        });
        if (live) {
          offset.current = d.serverTime - Date.now();
          state.current = d.match;
          setMatch(d.match);
          setError("");
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      }
      if (live) timer = setTimeout(sync, 100);
    };
    void sync();
    return () => {
      live = false;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      resize.disconnect();
      reset();
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("keyup", keyboard);
      window.removeEventListener("blur", reset);
      window.removeEventListener("orientationchange", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [match?.id]);
  const hold = (action: string) => ({
    "data-held": heldActions.includes(action),
    "aria-pressed": heldActions.includes(action),
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      fingers.current.set(e.pointerId, action);
      if (action === "jump") jumpPulse.current = true;
      updateInput();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      fingers.current.delete(e.pointerId);
      updateInput();
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      fingers.current.delete(e.pointerId);
      updateInput();
    },
    onLostPointerCapture: (e: React.PointerEvent<HTMLButtonElement>) => {
      fingers.current.delete(e.pointerId);
      updateInput();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!["Space", "Enter"].includes(e.code)) return;
      e.preventDefault();
      keys.current.add(action);
      if (action === "jump" && !e.repeat) jumpPulse.current = true;
      updateInput();
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!["Space", "Enter"].includes(e.code)) return;
      e.preventDefault();
      keys.current.delete(action);
      updateInput();
    },
    onBlur: () => {
      keys.current.delete(action);
      updateInput();
    },
  });
  async function leave() {
    if (match && !match.practice && match.status === "active") {
      try {
        await api("festival/action", { id: match.id, action: "leave" });
      } catch (e) {
        setError(`Could not leave: ${(e as Error).message}`);
        return;
      }
    }
    state.current = null;
    setMatch(null);
    void refresh().catch((e) => setError(e.message));
  }
  function practice() {
    offset.current = 0;
    const p = runner(userId, name);
    p.accepted = true;
    open({
      id: `practice-${Date.now()}`,
      game: "festival",
      practice: true,
      host: userId,
      players: [p],
      status: "active",
      created: Date.now(),
      updated: Date.now(),
      starts: Date.now() + 3000,
      waiting: false,
      winner: null,
      revision: 0,
    });
  }
  const me = match?.players.find((p) => p.id === userId);
  const seconds = match
    ? Math.max(0, Math.ceil(DURATION - (clock - match.starts) / 1000))
    : 0;
  return (
    <main className={`festival ${match ? "festival-playing" : ""}`}>
      <header>
        <button onClick={() => (match ? void leave() : onExit())}>
          ← {match ? "Leave run" : "Dashboard"}
        </button>
        <AdvertiseBanner game />
        <b>✦ FESTIVAL RUSH</b>
      </header>
      {error && (
        <p role="alert" className="festival-error">
          {error}
        </p>
      )}
      {!match ? (
        <div className="festival-lobby">
          <section className="festival-hero">
            <span className="festival-tag">
              NEW · 2–4 PLAYERS · PLATFORM ADVENTURE
            </span>
            <h1>
              Bring back
              <br />
              <em>the rhythm.</em>
            </h1>
            <p>
              A storm scattered the festival lanterns across Lagos. Mama Bisi
              needs your crew to cross the markets, leap over the canals and
              reach the rooftop stage before the music stops.
            </p>
            <div className="festival-buttons">
              <button className="festival-primary" onClick={practice}>
                Try solo practice ↗
              </button>
              <a href="#festival-invites">Challenge your friends ↓</a>
            </div>
            <small>
              Original characters and world · no entry fee · practice has no
              wallet rewards
            </small>
            <div className="festival-art" aria-hidden="true">
              ☀<span>⚑</span>
              <strong>✦</strong>
              <i>♫</i>
            </div>
          </section>
          <section className="festival-chapters" aria-label="Story chapters">
            {[
              [
                "01",
                "Market morning",
                "Jump over roaming storm crabs. Collect your own lantern coins and reach the first flag.",
              ],
              [
                "02",
                "Across the canal",
                "Time your leaps between walkways. Flags save your progress if you fall.",
              ],
              [
                "03",
                "Rooftop reunion",
                "Pass all three flags and reach the festival arch. First home gets the champion bonus.",
              ],
            ].map(([n, title, detail]) => (
              <article key={n}>
                <span>{n}</span>
                <h2>{title}</h2>
                <p>{detail}</p>
              </article>
            ))}
          </section>
          <section className="festival-rewards">
            <h2>Everyone can make progress.</h2>
            <p>
              <b>Finish: 10 coins</b> + your collected coins (up to 20).{" "}
              <b>First place: +30 coins.</b> A simultaneous finish shares first
              place with no winner bonus. You have 150 seconds; falling returns
              you to your last flag without removing coins.
            </p>
            <p>
              Rewards arrive after the round ends. Leaving or not finishing
              earns zero. Coins are virtual game currency; cash conversion and
              withdrawals are not available.
            </p>
          </section>
          <section id="festival-invites" className="festival-invites">
            <div>
              <h2>Assemble your crew</h2>
              <p>
                Select 1–3 usernames. Everyone must accept before the host
                starts.
              </p>
              <label>
                Find players
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a username"
                  maxLength={20}
                />
              </label>
              <div className="festival-player-list">
                {players.map((p) => (
                  <label key={p.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      disabled={
                        !selected.includes(p.id) && selected.length === 3
                      }
                      onChange={() =>
                        setSelected((s) =>
                          s.includes(p.id)
                            ? s.filter((id) => id !== p.id)
                            : [...s, p.id],
                        )
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <button
                disabled={busy || !selected.length}
                className="festival-primary"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("festival/create", { invitees: selected });
                    setSelected([]);
                    await refresh();
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Invite {selected.length || "your"} player
                {selected.length === 1 ? "" : "s"}
              </button>
            </div>
            <div>
              <h2>Your invitations & runs</h2>
              {!matches.length && (
                <p>
                  No invitations yet. Invite a friend, or try the practice
                  course.
                </p>
              )}
              {matches.map((m) => (
                <article className="festival-invite" key={m.id}>
                  <strong>
                    {m.players
                      .map((p) => `${p.name}${p.accepted ? " ✓" : " …"}`)
                      .join(" · ")}
                  </strong>
                  <p>
                    {m.status === "lobby" ? "Waiting for your crew" : m.status}
                  </p>
                  <div className="festival-buttons">
                    {m.status === "lobby" && (
                      <>
                        {!m.players.find((p) => p.id === userId)?.accepted && (
                          <button
                            disabled={busy}
                            onClick={() => void action(m.id, "accept")}
                          >
                            Accept
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() => void action(m.id, "decline")}
                        >
                          {m.host === userId ? "Cancel" : "Decline"}
                        </button>
                        {m.host === userId && (
                          <button
                            disabled={
                              busy ||
                              m.players.length < 2 ||
                              !m.players.every((p) => p.accepted)
                            }
                            onClick={() => void action(m.id, "start")}
                          >
                            Start round
                          </button>
                        )}
                      </>
                    )}
                    {["active", "finished"].includes(m.status) &&
                      !m.players.find((p) => p.id === userId)?.left && (
                        <button onClick={() => open(m)}>
                          {m.status === "active" ? "Enter run" : "View results"}
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="festival-hud">
            <strong>{match.practice ? "PRACTICE" : "CREW RUN"}</strong>
            <span>⚑ {me?.checkpoint}/3</span>
            <span>✦ {me?.collected.length}/20</span>
            <span>
              {match.waiting
                ? "Crew loading…"
                : `${Math.min(DURATION, seconds)}s left`}
            </span>
          </div>
          <div className="festival-stage">
            <canvas
              ref={canvas}
              width={960}
              height={540}
              aria-label="Festival Rush platform course; use left and right to move and Space to jump"
            />
            {(match.waiting || clock < match.starts) &&
              match.status === "active" && (
                <div className="festival-countdown">
                  {match.waiting
                    ? "Waiting for your crew to enter…"
                    : Math.ceil((match.starts - clock) / 1000)}
                  <small>Everyone must enter within 30 seconds</small>
                </div>
              )}
            {me?.finished !== null && match.status === "active" && (
              <div className="festival-countdown">
                You made it!
                <small>
                  Waiting for the crew to finish. Stay for your reward.
                </small>
              </div>
            )}
            {["finished", "cancelled"].includes(match.status) && (
              <div className="festival-results">
                <h2>
                  {match.status === "cancelled"
                    ? "Round cancelled"
                    : "The festival is back!"}
                </h2>
                {match.players.map((p) => (
                  <p key={p.id}>
                    <b>{p.name}</b> ·{" "}
                    {p.left
                      ? "Left"
                      : p.finished === null
                        ? "Did not finish"
                        : match.winner === p.id
                          ? "Champion"
                          : "Finished"}
                    <span>
                      {match.practice
                        ? "Practice"
                        : `+${reward(match, p)} coins${reward(match, p) && !match.paid?.includes(p.id) ? " · saving…" : ""}`}
                    </span>
                  </p>
                ))}
                <small>
                  {match.practice
                    ? "Practice does not change your wallet."
                    : "Virtual coins only · cash withdrawals unavailable"}
                </small>
                <button
                  className="festival-primary"
                  onClick={() => void leave()}
                >
                  Back to challenges
                </button>
              </div>
            )}
          </div>
          <div className="festival-progress">
            {match.players.map((p) => (
              <div key={p.id}>
                <span>{p.name}</span>
                <progress max={3550} value={p.x} />
                {p.finished !== null ? "⚑" : ""}
              </div>
            ))}
          </div>
          <div
            className="festival-controls"
            onContextMenu={(e) => e.preventDefault()}
          >
            <div>
              <button aria-label="Move left" {...hold("left")}>
                ◀
              </button>
              <button aria-label="Move right" {...hold("right")}>
                ▶
              </button>
            </div>
            <small>
              A / D or arrows · Space to jump
              <br />
              Jump over crabs and gaps · Flags save progress
            </small>
            <button className="festival-jump" {...hold("jump")}>
              JUMP ↑
            </button>
          </div>
        </>
      )}
    </main>
  );
}
