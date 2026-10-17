import { useEffect, useState } from "react";
import { api } from "../stores/sessionStore";
import {
  DEFAULT_OPTIONS,
  sectors,
  obstacles,
  type Match,
  type Options,
} from "../../../../packages/shared/src/race-match";
import { track, TAU } from "../racing/physics";
import "./challenges.css";
export const chapters = [
  [
    "The invitation",
    "Mama Bisi’s market festival needs a new champion. Oga Tunde lends you a kart: learn the waterfront loop and bring it home in one piece.",
    "Circuit · 1 lap",
  ],
  [
    "Market movers",
    "The festival deliveries are late. Navigate the market barriers and use boost lanes to make a clean run.",
    "Obstacle · rookie",
  ],
  [
    "Signal trouble",
    "A rival crew has scattered signal targets around Marina. Clear them with your pulse launcher before the timer runs out.",
    "Battle · 90 seconds",
  ],
  [
    "Crew call",
    "Invite friends to represent their neighbourhoods. Everyone chooses a gadget; the host sets the course and starts the countdown.",
    "2–4 players · invitations",
  ],
  [
    "Afterglow qualifiers",
    "The barriers tighten and the course gets faster. Take on a three-lap pro event against your crew.",
    "Circuit · pro",
  ],
  [
    "The festival final",
    "One last night under the festival flags. Win a crew challenge to earn 50 coins and celebrate with the neighbourhood. Then host a rematch with new rules.",
    "Server-verified winner · 50 coins",
  ],
];
export default function ChallengeHub({
  userId,
  onPlay,
}: {
  userId: string;
  onPlay: (options: Options, match?: Match) => void;
}) {
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS),
    [chapter, setChapter] = useState(0),
    [query, setQuery] = useState(""),
    [players, setPlayers] = useState<{ id: string; name: string }[]>([]),
    [selected, setSelected] = useState<{ id: string; name: string }[]>([]),
    [matches, setMatches] = useState<Match[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = async () => {
    try {
      const data = await api("races");
      setMatches(data.matches ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    let alive = true;
    const update = async () => {
      try {
        const d = await api("races");
        if (alive) setMatches(d.matches ?? []);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void update();
    const t = setInterval(update, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      void api("races/players", { query })
        .then((d) => {
          if (alive) setPlayers(d.players ?? []);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);
  async function action(id: string, action: string) {
    setBusy(true);
    setError("");
    try {
      const d = await api("races/action", {
        id,
        action,
        weapon: options.weapon,
      });
      await refresh();
      if (action === "start") onPlay(d.match.options, d.match);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const route = Array.from({ length: 121 }, (_, i) => {
    const p = track((i / 120) * TAU);
    return `${p.x + 90},${p.z + 65}`;
  }).join(" ");
  return (
    <section className="challenge-hub" id="campaign">
      <div className="campaign-heading">
        <span className="nh-eyebrow">SEASON 01 / LAGOS AFTERGLOW</span>
        <h2>Build your crew. Own the night.</h2>
        <p>
          A neighbourhood festival. Six chapters. Your road from rookie to
          Street King.
        </p>
      </div>
      <div className="campaign-layout">
        <div className="campaign-map">
          <svg
            viewBox="0 0 180 135"
            role="img"
            aria-label="Marina circuit: festival gate, market chicane, lagoon bend, bridge approach, neon mile and home straight"
          >
            <path d="M0 75 Q60 35 180 80V135H0" fill="#123e63" />
            <polyline
              points={route}
              fill="none"
              stroke="#274c55"
              strokeWidth="12"
            />
            <polyline
              points={route}
              fill="none"
              stroke="#a5ed65"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            {obstacles(options).map((o) => (
              <circle
                key={`obstacle-${o.id}`}
                cx={o.x + 90}
                cy={o.z + 65}
                r="1.8"
                fill={
                  o.kind === "boost"
                    ? "#42f5c5"
                    : o.kind === "target"
                      ? "#ffdf7d"
                      : "#f384ab"
                }
              />
            ))}
            {sectors.map((s, i) => {
              const p = track((i / 6) * TAU);
              return (
                <g key={s}>
                  <circle
                    cx={p.x + 90}
                    cy={p.z + 65}
                    r="5"
                    fill={i === chapter ? "#ffce56" : "#2fc0b1"}
                  />
                  <text
                    x={p.x + 90}
                    y={p.z + 67}
                    textAnchor="middle"
                    fontSize="5"
                    fill="#071b27"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="map-legend">
            MARINA CIRCUIT <span>● boost lanes · ◆ targets · ▰ barriers</span>
          </div>
          <ol>
            {sectors.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
        <div className="campaign-story">
          <div className="chapter-tabs">
            {chapters.map((c, i) => (
              <button
                key={c[0]}
                aria-label={`Chapter ${i + 1}: ${c[0]}`}
                aria-pressed={chapter === i}
                onClick={() => {
                  setChapter(i);
                  setOptions({
                    ...options,
                    mode: i === 1 ? "obstacle" : i === 2 ? "battle" : "circuit",
                    laps: i >= 4 ? 3 : 1,
                    difficulty: i >= 4 ? "pro" : "rookie",
                  });
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <span className="nh-eyebrow">
            CHAPTER {chapter + 1} · {chapters[chapter][2]}
          </span>
          <h3>{chapters[chapter][0]}</h3>
          <p>{chapters[chapter][1]}</p>
          <small>
            Pick any chapter to explore its briefing and rules. These are story
            chapters, not locked progression.
          </small>
        </div>
      </div>
      <div className="challenge-workshop">
        <div>
          <span className="nh-eyebrow">BUILD YOUR EVENT</span>
          <h3>Your challenge. Your rules.</h3>
          <div className="match-settings">
            <label>
              Game mode
              <select
                value={options.mode}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    mode: e.target.value as Options["mode"],
                  })
                }
              >
                <option value="circuit">Circuit race · first to finish</option>
                <option value="battle">
                  Target battle · highest score in 90s
                </option>
                <option value="obstacle">Obstacle run · first to finish</option>
              </select>
            </label>
            <label>
              Laps
              <select
                value={options.laps}
                disabled={options.mode === "battle"}
                onChange={(e) =>
                  setOptions({ ...options, laps: Number(e.target.value) })
                }
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n} lap{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Course
              <select
                value={options.difficulty}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    difficulty: e.target.value as Options["difficulty"],
                  })
                }
              >
                <option value="rookie">Rookie · 10 obstacles</option>
                <option value="pro">Pro · 18 obstacles</option>
              </select>
            </label>
            <label>
              Your gadget
              <select
                value={options.weapon}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    weapon: e.target.value as Options["weapon"],
                  })
                }
              >
                <option value="pulse">Pulse launcher · shoot forward</option>
                <option value="oil">Oil trap · drop behind</option>
                <option value="shield">Shield · block hits for 3s</option>
              </select>
            </label>
          </div>
          <p className="rules-note">
            Battle: +5 per target, +3 per unshielded rival hit, +10 per lap.
            Ties pay nobody. Circuit and obstacle: first to finish wins. Free
            entry; winner earns 50 in-game coins. Solo practice earns no coins.
          </p>
          <button className="nh-primary" onClick={() => onPlay(options)}>
            Solo practice ↗
          </button>
        </div>
        <div>
          <span className="nh-eyebrow">CHALLENGE YOUR CREW / 2–4 PLAYERS</span>
          <h3>Choose your rivals.</h3>
          <label className="player-search">
            Search username
            <input
              value={query}
              maxLength={20}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a registered player…"
            />
          </label>
          <div className="player-picks">
            {players.map((p) => (
              <button
                key={p.id}
                aria-pressed={selected.some((s) => s.id === p.id)}
                disabled={
                  selected.length === 3 && !selected.some((s) => s.id === p.id)
                }
                onClick={() =>
                  setSelected(
                    selected.some((s) => s.id === p.id)
                      ? selected.filter((s) => s.id !== p.id)
                      : [...selected, p],
                  )
                }
              >
                <span>{p.name.slice(0, 2).toUpperCase()}</span>
                {p.name}
                <b>{selected.some((s) => s.id === p.id) ? "✓" : "+"}</b>
              </button>
            ))}
          </div>
          {players.length === 0 && (
            <p>No matching players. Ask your friends to register.</p>
          )}
          <p>
            Selected:{" "}
            {selected.map((p) => p.name).join(", ") || "Choose up to 3 rivals"}
          </p>
          <button
            className="nh-primary"
            disabled={busy || !selected.length}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api("races/create", {
                  options,
                  invitees: selected.map((p) => p.id),
                });
                setSelected([]);
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Send challenge invitations ↗
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="nh-error">
          {error}
        </p>
      )}
      <div className="match-inbox">
        <h3>Your invitations & matches</h3>
        <p>
          Accept an invitation, choose your gadget above, and wait for the host.
          Invitations expire after 30 minutes. Leaving an active match with
          fewer than two players cancels it without rewards.
        </p>
        {matches.length === 0 && (
          <p>No invitations yet. Build your first crew above.</p>
        )}
        {matches.map((m) => (
          <article key={m.id}>
            <div>
              <strong>
                {m.options.mode.toUpperCase()} · {m.options.difficulty} ·{" "}
                {m.options.laps} lap(s)
              </strong>
              <p>
                {m.players
                  .map((p) => `${p.name} ${p.accepted ? "✓" : "…"}`)
                  .join(" / ")}
              </p>
              <small>
                {m.status === "finished"
                  ? `Winner: ${m.players.find((p) => p.id === m.winner)?.name ?? "Draw / no finisher"} · ${m.winner ? "50 coins" : "No reward"}`
                  : m.status}
              </small>
            </div>
            <div>
              {m.status === "lobby" && (
                <>
                  {!m.players.find((p) => p.id === userId)?.accepted && (
                    <button
                      disabled={busy}
                      onClick={() => void action(m.id, "accept")}
                    >
                      Accept & equip
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
                        busy || m.players.filter((p) => p.accepted).length < 2
                      }
                      onClick={() => void action(m.id, "start")}
                    >
                      Start match
                    </button>
                  )}
                </>
              )}
              {m.status === "active" &&
                m.players.find((p) => p.id === userId)?.accepted && (
                  <button onClick={() => onPlay(m.options, m)}>
                    Join race ↗
                  </button>
                )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
