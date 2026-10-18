import AdvertiseBanner from "./commerce/AdvertiseBanner";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import Commerce, { Billboard } from "./commerce/Commerce";
import ChallengeHub from "./challenges/ChallengeHub";
import {
  DEFAULT_OPTIONS,
  type Options,
  type Match,
} from "../../../packages/shared/src/race-match";
const FestivalChallenge = lazy(() => import("./platform/FestivalChallenge"));
const RacingChallenge = lazy(() => import("./racing/RacingChallenge"));
import { useSessionStore } from "./stores/sessionStore";
import "./portal.css";

const artwork = "/images/naija-racer.webp";
function Brand() {
  return (
    <a className="nh-brand" href="#">
      <span className="nh-mark">
        N<span>H</span>
      </span>
      <span>
        NAIJA<span>HUSTLE</span>
      </span>
    </a>
  );
}
const challenges = [
  {
    icon: "🌇",
    name: "Festival Rush",
    type: "MULTIPLAYER PLATFORM ADVENTURE",
    detail:
      "Leap across Lagos. Collect lantern coins. Bring back the rhythm with your crew.",
    color: "gold",
  },
  {
    icon: "🏎",
    name: "Street Kings",
    type: "KART RACING",
    detail: "Big drifts. Tight corners. A little Lagos energy.",
    color: "lime",
  },
  {
    icon: "🚌",
    name: "Danfo Dash",
    type: "DANFO RACING",
    detail: "Your favourite yellow bus. A whole new kind of rush.",
    color: "gold",
  },
  {
    icon: "🥊",
    name: "The Ring",
    type: "BOXING",
    detail: "Time your moves. Find your rhythm. Own the ring.",
    color: "pink",
  },
  {
    icon: "🏃",
    name: "Street Trials",
    type: "OBSTACLE CHALLENGES",
    detail: "A test of timing, movement and determination.",
    color: "blue",
  },
  {
    icon: "💬",
    name: "The Hangout",
    type: "SOCIAL WORLD",
    detail: "Meet other players and find your people.",
    color: "pink",
  },
  {
    icon: "🏡",
    name: "Your Virtual Life",
    type: "LIFE SIMULATION",
    detail: "Build your identity. Make this world your own.",
    color: "lime",
  },
];
export default function App() {
  const { user, restore, auth, logout, busy, error } = useSessionStore();
  const [raceOptions, setRaceOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [match, setMatch] = useState<Match | undefined>();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState(
    new URLSearchParams(location.search).has("payment") ||
      new URLSearchParams(location.search).has("advertise")
      ? "commerce"
      : "overview",
  );
  useEffect(() => {
    void restore().finally(() => setReady(true));
  }, [restore]);
  function switchMode() {
    setMode(mode === "register" ? "login" : "register");
    setShowPassword(false);
    useSessionStore.setState({ error: "" });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await auth(
      mode,
      String(values.get("username")),
      String(values.get("password")),
      String(values.get("email") ?? ""),
    );
    setTab(
      new URLSearchParams(location.search).has("advertise")
        ? "commerce"
        : "overview",
    );
  }
  if (!ready)
    return (
      <main className="nh-loading">
        <Brand />
        <p role="status">Getting your garage ready…</p>
      </main>
    );
  if (!user)
    return (
      <main className="nh-auth">
        <section className="nh-auth-art">
          <Brand />
          <div className="nh-auth-head">
            <span className="nh-eyebrow">MADE OF NAIJA ENERGY</span>
            <h1>
              Your streets.
              <br />
              Your story.
              <br />
              <em>Your hustle.</em>
            </h1>
            <p>
              A virtual world for friends, challengers and
              <br className="nh-desktop" /> everyday legends. Your journey
              starts here.
            </p>
          </div>
          <img
            className="nh-auth-racer"
            src={artwork}
            alt="Nigerian racer in a green jacket beside a yellow danfo-inspired racing kart"
          />
          <div className="nh-art-caption">
            <span>01 / YOUR VIRTUAL WORLD</span>
            <span>CHARACTER CONCEPT ↗</span>
          </div>
        </section>
        <section className="nh-auth-form">
          <div className="nh-form-top">
            <span className="nh-pill">EARLY ACCESS</span>
            <span>BUILT FOR THE BOLD.</span>
          </div>
          <div className="nh-form-inner">
            <span className="nh-eyebrow">YOUR NEXT CHAPTER</span>
            <h2>
              {mode === "register" ? "Join the hustle." : "Back for more?"}
            </h2>
            <p>
              {mode === "register"
                ? "Create your player profile. Make a name for yourself."
                : "Sign in and pick up where you left off."}
            </p>
            <form key={mode} onSubmit={submit}>
              <label htmlFor="username">
                Username <span>YOUR PLAYER NAME</span>
              </label>
              <input
                id="username"
                name="username"
                placeholder="e.g. LagosLegend"
                autoComplete="username"
                required
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]{3,20}"
                title="3–20 letters, numbers or underscores"
              />
              {mode === "register" && (
                <>
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                  />
                </>
              )}
              <label htmlFor="password">Password</label>
              <div className="nh-password">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 10 characters"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  required
                  minLength={10}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <small className="nh-field-note">
                {mode === "register"
                  ? "Username: 3–20 letters, numbers or underscores. Password: 10+ characters."
                  : "Use the username you registered with."}
              </small>
              {error && (
                <p className="nh-error" role="alert">
                  {error}
                </p>
              )}
              <button className="nh-primary" disabled={busy}>
                {busy
                  ? "One moment…"
                  : mode === "register"
                    ? "Create my player"
                    : "Let's go"}
                <span aria-hidden="true">↗</span>
              </button>
            </form>
            <p className="nh-switch">
              {mode === "register"
                ? "Already part of the crew?"
                : "New to the neighbourhood?"}{" "}
              <button disabled={busy} onClick={switchMode}>
                {mode === "register" ? "Sign in" : "Create an account"}
              </button>
            </p>
            <div className="nh-auth-note">
              <span>✦</span>
              <p>
                One profile. A world of possibilities.
                <br />
                <small>A virtual life. Challenges. Rewards.</small>
              </p>
            </div>
          </div>
          <footer className="nh-form-footer">
            <span>NAIJA HUSTLE © {new Date().getFullYear()}</span>
            <span>PLAY YOUR OWN WAY.</span>
          </footer>
        </section>
      </main>
    );
  if (tab === "festival")
    return (
      <Suspense
        fallback={<main className="nh-loading">Opening Festival Rush…</main>}
      >
        <FestivalChallenge
          userId={user.id}
          name={user.name}
          onExit={() => {
            setTab("overview");
            void restore();
          }}
        />
      </Suspense>
    );
  if (tab === "racing")
    return (
      <Suspense
        fallback={
          <main className="nh-loading">
            <p role="status">Opening Street Kings…</p>
          </main>
        }
      >
        <RacingChallenge
          name={user.name}
          userId={user.id}
          options={raceOptions}
          match={match}
          onExit={() => {
            setTab("overview");
            void restore();
          }}
        />
      </Suspense>
    );
  return (
    <div className="nh-dashboard">
      <aside className="nh-sidebar">
        <Brand />
        <span className="nh-menu-label">YOUR PLAYGROUND</span>
        <nav aria-label="Main navigation">
          <button
            className={tab === "commerce" ? "active" : ""}
            onClick={() => setTab("commerce")}
          >
            <span>◉</span> Wallet & adverts
          </button>
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            <span>◈</span> Overview
          </button>
          <a href="#challenges" onClick={() => setTab("overview")}>
            <span>⚑</span> Challenges <small>NEW</small>
          </a>
          <button
            className={tab === "profile" ? "active" : ""}
            onClick={() => setTab("profile")}
          >
            <span>◎</span> My profile
          </button>
        </nav>
        <div className="nh-sidebar-note">
          <span>✦</span>
          <h3>Day one energy.</h3>
          <p>
            You're here at the beginning. Let's build something worth playing.
          </p>
          <span className="nh-pill">STARTER EDITION</span>
        </div>
        <button
          className="nh-signout"
          disabled={busy}
          onClick={() => void logout()}
        >
          {busy ? "Signing out…" : "↪  Sign out"}
        </button>
      </aside>
      <div className="nh-main">
        <header className="nh-topbar">
          <span>
            THE PLAYGROUND{" "}
            <span className="nh-muted">
              /{" "}
              {tab === "profile"
                ? "MY PROFILE"
                : tab === "commerce"
                  ? "WALLET & ADVERTS"
                  : "OVERVIEW"}
            </span>
          </span>
          <div className="nh-top-player">
            <span className="nh-wallet">
              ◉ {user.coins.toLocaleString()} <small>COINS</small>
            </span>
            <span className="nh-avatar" aria-hidden="true">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <strong>{user.name}</strong>
          </div>
        </header>
        <main className="nh-content">
          {error && (
            <p className="nh-error" role="alert">
              {error}
            </p>
          )}
          {tab === "commerce" ? (
            <Commerce />
          ) : tab === "profile" ? (
            <section className="nh-profile">
              <span className="nh-eyebrow">PLAYER IDENTITY</span>
              <h1>Your name. Your legacy.</h1>
              <div className="nh-profile-card">
                <span className="nh-avatar">
                  {user.name.slice(0, 2).toUpperCase()}
                </span>
                <h2>{user.name}</h2>
                <p>{user.email ?? "Legacy account · no email on file"}</p>
                <dl>
                  <div>
                    <dt>Coins</dt>
                    <dd>{user.coins.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Wins</dt>
                    <dd>{user.wins}</dd>
                  </div>
                  <div>
                    <dt>Challenge level</dt>
                    <dd>{user.level + 1}</dd>
                  </div>
                </dl>
                <p>
                  Your username identifies you above your kart in crew matches.
                </p>
              </div>
              <button className="nh-primary" onClick={() => setTab("overview")}>
                Back to the playground <span>↗</span>
              </button>
            </section>
          ) : (
            <>
              <div className="nh-welcome">
                <div>
                  <span className="nh-eyebrow">GOOD TO HAVE YOU HERE</span>
                  <h1>
                    Welcome, {user.name}
                    <span className="nh-accent">.</span>
                  </h1>
                </div>
                <span className="nh-pill">✦ YOUR STORY STARTS NOW</span>
              </div>
              <AdvertiseBanner />
              <section className="nh-hero">
                <div className="nh-hero-copy">
                  <span className="nh-dark-label">
                    LIVE. CONNECT. PLAY. EARN.
                  </span>
                  <h2>
                    Your world.
                    <br />
                    Your <em>hustle.</em>
                  </h2>
                  <p>
                    Build your virtual life, meet other players and take on
                    challenges in a world full of Nigerian energy.
                  </p>
                  <a className="nh-primary" href="#campaign">
                    Enter the campaign <span>↗</span>
                  </a>
                </div>
                <img
                  src={artwork}
                  alt="Street King racer and yellow danfo-inspired kart concept"
                />
                <span className="nh-hero-tag">
                  A GLIMPSE OF THE WORLD / CONCEPT PREVIEW
                </span>
              </section>
              <ChallengeHub
                userId={user.id}
                onPlay={(options, match) => {
                  setRaceOptions(options);
                  setMatch(match);
                  setTab("racing");
                }}
              />
              <section className="nh-stats" aria-label="Your progress">
                <div>
                  <span className="nh-stat-icon">◉</span>
                  <div>
                    <span>Your coins</span>
                    <strong>
                      {user.coins.toLocaleString()} <small>COINS</small>
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="nh-stat-icon">♜</span>
                  <div>
                    <span>Challenges won</span>
                    <strong>
                      {user.wins} <small>VICTORIES</small>
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="nh-stat-icon">⚑</span>
                  <div>
                    <span>Your journey</span>
                    <strong>
                      {user.wins ? "On the rise" : "Just getting started"}
                    </strong>
                  </div>
                </div>
              </section>
              <section id="challenges" className="nh-challenges">
                <div className="nh-section-title">
                  <div>
                    <span className="nh-eyebrow">MANY WAYS TO PLAY</span>
                    <h2>Find your next challenge.</h2>
                  </div>
                  <span className="nh-muted">
                    Street Kings: crew matches ready
                  </span>
                </div>
                <div className="nh-challenge-grid">
                  {challenges.map((c) => (
                    <article className={`nh-challenge ${c.color}`} key={c.name}>
                      <div className="nh-challenge-art">
                        <span aria-hidden="true">{c.icon}</span>
                        <span className="nh-coming">
                          {["Street Kings", "Festival Rush"].includes(c.name)
                            ? "CREW MATCHES READY"
                            : "COMING SOON"}
                        </span>
                      </div>
                      <div className="nh-challenge-copy">
                        <span className="nh-eyebrow">{c.type}</span>
                        <h3>{c.name}</h3>
                        <p>{c.detail}</p>
                        {c.name === "Festival Rush" && (
                          <button
                            className="nh-primary nh-play-race"
                            onClick={() => setTab("festival")}
                          >
                            Open Festival Rush <span>↗</span>
                          </button>
                        )}
                        {c.name === "Street Kings" && (
                          <button
                            className="nh-primary nh-play-race"
                            onClick={() => {
                              setMatch(undefined);
                              setRaceOptions(DEFAULT_OPTIONS);
                              setTab("racing");
                            }}
                          >
                            Open Street Kings <span>↗</span>
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <Billboard onOpen={() => setTab("commerce")} />
              <section className="nh-about">
                <span className="nh-about-symbol">↗</span>
                <div>
                  <span className="nh-eyebrow">A WORLD OF POSSIBILITIES</span>
                  <h2>Live your story. Make your mark.</h2>
                  <p>
                    Naija Hustle is a browser-based social simulation: a virtual
                    world where you can meet people, build your identity,
                    compete in different challenges and earn rewards. Racing is
                    one of many planned activities, alongside boxing, obstacle
                    courses and social experiences. Accounts are ready now; try
                    the Street Kings 3D test drive while more gameplay and
                    earning features are developed.
                  </p>
                </div>
                <span className="nh-about-stamp">
                  MADE FOR
                  <br />
                  <strong>NAIJA</strong>
                  <br />
                  PLAYED EVERYWHERE
                </span>
              </section>
              <footer className="nh-dashboard-footer">
                You're in early. Accounts and profiles are ready; new game modes
                are coming next.
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
