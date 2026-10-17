import { useEffect, useState } from "react";
import { AVATARS, NPCS, type Avatar } from "@naija-hustle/shared";
import { usePlayerStore } from "./stores/playerStore";
import {
  controlCamera,
  interactWorld,
  useWorldStore,
} from "./stores/worldStore";
import { TouchControls } from "./components/TouchControls";
import { Icon, type IconName } from "./components/Icon";
import { CityLife } from "./features/CityLife";
import GameCanvas from "./game/GameCanvas";
export default function App() {
  const {
    progress: p,
    nearby,
    notice,
    saveError,
    start,
    reset,
  } = usePlayerStore();
  const {
    view,
    panel,
    ready,
    setView,
    setPanel,
    street,
    interaction,
    location,
    riding,
    busInfo,
    combat,
  } = useWorldStore();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("emerald");
  const [clean, setClean] = useState(false);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [setPanel]);
  const objective =
    p.mission === "available"
      ? "Meet Mama Bisi"
      : p.mission === "active"
        ? "Deliver to Tunde"
        : p.journeyCompleted
          ? "Your city, your story"
          : "Ride to North Estate";
  return (
    <main className={`app ${view} ${!p.name ? "onboarding" : ""}`}>
      <GameCanvas />
      <CityLife />
      <div className="vignette" />
      <header className="topbar glass">
        <a className="brand" href="./" aria-label="Naija Hustle home">
          <span className="brand-logo">
            n<span>h.</span>
          </span>
          <span>
            Naija Hustle<small>EVERYBODY GET STORY</small>
          </span>
        </a>
        <span className="top-divider" />
        <span className="time-chip">
          <Icon name="sun" />
          <span>
            Golden hour<small>Lagos, Nigeria</small>
          </span>
        </span>
        <span className="session-chip">
          <i /> {p.name ? "Your story" : "A new beginning"}
        </span>
        {p.name ? (
          <button
            className="wallet"
            disabled={combat}
            onClick={() => setPanel(panel === "profile" ? null : "profile")}
          >
            <span className="wallet-icon">₦</span>
            <strong>₦{p.cash.toLocaleString("en-NG")}</strong>
            <Icon name="plus" size={16} />
          </button>
        ) : (
          <span className="free-tag">Make yourself at home</span>
        )}
      </header>
      {p.name && (
        <>
          {!clean && (
            <section className="quest-stack">
              <button
                className="quest-chip glass"
                onClick={() => setPanel(panel === "mission" ? null : "mission")}
              >
                <span className="quest-icon">
                  <Icon name={p.journeyCompleted ? "check" : "briefcase"} />
                </span>
                <span>
                  <b>{objective}</b>
                  <small>
                    {p.mission === "completed"
                      ? p.journeyCompleted
                        ? "Opening chapters complete"
                        : "Danfo trip · ₦300 arrival bonus"
                      : "Your first delivery · ₦1,500 reward"}
                  </small>
                </span>
                <Icon name="arrow" size={16} />
              </button>
              <div className="location-chip">
                <Icon name={view === "home" ? "home" : "city"} size={15} />
                {view === "home" ? "Your apartment · Mainland" : location}
                <span className="live-dot" />
              </div>
            </section>
          )}
          <button className="clean-toggle" onClick={() => setClean(!clean)}>
            {clean ? "Show interface" : "− Hide details"}
          </button>
          <button
            className="street-toggle glass"
            aria-pressed={street}
            onClick={() => useWorldStore.setState({ street: !street })}
          >
            {street ? "Overview" : "Street view"}
          </button>
          {street && (
            <div className="street-crosshair" aria-hidden="true">
              +
            </div>
          )}
          {riding && (
            <div className="ride-info glass" role="status">
              <b>Danfo ride</b>
              <span>{busInfo}</span>
              <small>
                Get off at a stop · E · route pauses while a panel is open
              </small>
            </div>
          )}
          <div className="camera-tools glass" aria-label="Camera controls">
            {(
              [
                ["plus", "in", "Zoom in"],
                ["minus", "out", "Zoom out"],
                ["rotate", "rotate", "Rotate camera"],
                ["locate", "center", "Reset camera"],
              ] as const
            ).map(([icon, action, label]) => (
              <button
                key={action}
                aria-label={label}
                title={label}
                onClick={() => controlCamera(action)}
              >
                <Icon name={icon} />
              </button>
            ))}
          </div>
          {!clean && (
            <div className="scene-caption">
              <span className="eyebrow">
                {view === "home"
                  ? "A PLACE TO CALL YOUR OWN"
                  : "THE CITY IS CALLING"}
              </span>
              <h1>
                {view === "home"
                  ? "Small room. Big dreams."
                  : view === "interior"
                    ? location
                    : "Find your next hustle."}
              </h1>
              <p>
                {view === "home"
                  ? "Every great story starts somewhere."
                  : view === "interior"
                    ? "Explore inside. Your street is just outside."
                    : "New faces, familiar streets. Make your move."}
              </p>
            </div>
          )}
          {!clean && (
            <div className="player-card glass">
              <div className={`portrait ${p.avatar}`}>
                <span className="portrait-head" />
                <span className="portrait-body" />
              </div>
              <div className="player-detail">
                <b>
                  {p.name}
                  <span>Rookie</span>
                </b>
                <div className="vitals">
                  <span title={`Energy ${p.energy} of 100`}>
                    <Icon name="energy" size={14} />
                    <meter
                      aria-label="Energy"
                      min={0}
                      max={100}
                      value={p.energy}
                    />
                  </span>
                  <span title={`Health ${p.health} of 100`}>
                    <Icon name="heart" size={14} />
                    <meter
                      aria-label="Health"
                      min={0}
                      max={100}
                      value={p.health}
                    />
                  </span>
                  <span title={`Reputation ${p.reputation}`}>
                    <Icon name="star" size={14} />
                    {p.reputation}
                  </span>
                </div>
              </div>
            </div>
          )}
          <nav className="dock glass" aria-label="Game navigation">
            {(
              [
                {
                  icon: "home",
                  label: "Home",
                  active: view === "home" && !panel,
                  action: () => setView("home"),
                },
                {
                  icon: "city",
                  label: "City",
                  active: view === "city" && !panel,
                  action: () => setView("city"),
                },
                {
                  icon: "briefcase",
                  label: "Hustles",
                  active: panel === "mission",
                  action: () =>
                    setPanel(panel === "mission" ? null : "mission"),
                },
                {
                  icon: "user",
                  label: "Profile",
                  active: panel === "profile",
                  action: () =>
                    setPanel(panel === "profile" ? null : "profile"),
                },
              ] as {
                icon: IconName;
                label: string;
                active: boolean;
                action: () => void;
              }[]
            ).map((item) => (
              <button
                key={item.label}
                disabled={
                  riding && (item.label === "Home" || item.label === "City")
                }
                onClick={item.action}
                className={item.active ? "active" : ""}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.label === "Hustles" && p.mission !== "completed" && <i />}
              </button>
            ))}
          </nav>
          <button
            className="help-button glass"
            disabled={combat}
            aria-label="How to play"
            onClick={() => setPanel(panel === "help" ? null : "help")}
          >
            <Icon name="help" />
          </button>
          <div className="movement">
            <TouchControls />
          </div>
          {(interaction || (view === "city" && nearby && !riding)) && (
            <button className="interact-button" onClick={interactWorld}>
              <kbd>E</kbd>{" "}
              {interaction ||
                `Talk to ${NPCS.find((n) => n.id === nearby)?.name}`}
              <Icon name="arrow" size={17} />
            </button>
          )}
          {view !== "city" && !clean && (
            <button className="leave-home" onClick={() => setView("city")}>
              Head into the city <Icon name="arrow" size={16} />
            </button>
          )}
          <div className="save-note">
            {saveError
              ? "Saving unavailable this session"
              : "Saved on this device"}
            <span>·</span> Virtual cash
          </div>
          {notice !==
            "Find Mama Bisi by the market to begin your first hustle." &&
            view === "city" &&
            !panel &&
            !riding && (
              <div className="street-toast glass" role="status">
                <span className="toast-icon">
                  <Icon name="briefcase" />
                </span>
                <p>{notice}</p>
              </div>
            )}
        </>
      )}
      {!p.name && (
        <section className="welcome-card glass">
          <span className="eyebrow">YOUR STORY STARTS HERE</span>
          <h1>
            Welcome to your
            <br />
            <em>next chapter.</em>
          </h1>
          <p>
            A little space in Lagos. A city full of possibilities.
            <br />
            Let’s see what you make of it.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(name, avatar);
            }}
          >
            <label htmlFor="name">What should we call you?</label>
            <input
              autoComplete="nickname"
              id="name"
              maxLength={24}
              required
              placeholder="Your street name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <fieldset>
              <legend>Pick your colour</legend>
              <div className="avatars">
                {(Object.keys(AVATARS) as Avatar[]).map((a) => (
                  <button
                    type="button"
                    aria-label={a}
                    aria-pressed={avatar === a}
                    key={a}
                    className={`${a} ${avatar === a ? "selected" : ""}`}
                    onClick={() => setAvatar(a)}
                  >
                    <span />
                    {avatar === a && <Icon name="check" size={14} />}
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="primary" disabled={!name.trim() || !ready}>
              Enter the neighbourhood
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <small>Free to explore · your progress stays on this device</small>
        </section>
      )}
      {panel && panel !== "social" && p.name && (
        <div className="panel-backdrop" onClick={() => setPanel(null)}>
          <section
            className="detail-panel glass"
            role="dialog"
            aria-modal="true"
            aria-label={
              panel === "mission"
                ? "Your hustles"
                : panel === "profile"
                  ? "Player profile"
                  : "How to play"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="panel-close"
              aria-label="Close panel"
              onClick={() => setPanel(null)}
              autoFocus
            >
              <Icon name="close" />
            </button>
            {panel === "mission" ? (
              <>
                <span className="panel-symbol">
                  <Icon name="briefcase" size={28} />
                </span>
                <span className="eyebrow">YOUR HUSTLE BOARD</span>
                <h2>From one room to your own business.</h2>
                <p>
                  You arrived in Lagos with ₦5,000 and a small room. Earn your
                  neighbours’ trust, learn the city, and work toward a business
                  of your own.
                </p>
                <h3>Chapter 1 · A favour for Mama</h3>
                <p>
                  {p.mission === "available"
                    ? "Mama Bisi has a parcel and needs someone she can count on. Find her outside Balogun Market to get started."
                    : p.mission === "active"
                      ? "Parcel collected! Tunde is waiting outside the compound. Take it to him and collect your first pay."
                      : "You made the delivery. A little cash, a little reputation, and a new connection in the neighbourhood."}
                </p>
                <div className="mission-reward">
                  <Icon name="coin" size={26} />
                  <b>
                    ₦1,500<small>Delivery reward</small>
                  </b>
                  <span>+10 reputation</span>
                </div>
                <ol className="mission-steps">
                  <li className={p.mission !== "available" ? "done" : ""}>
                    <span>1</span>Talk to Mama Bisi at the market
                  </li>
                  <li className={p.mission === "completed" ? "done" : ""}>
                    <span>2</span>Deliver the parcel to Tunde
                  </li>
                </ol>
                <h3>Chapter 2 · Learn the route</h3>
                <p>
                  {p.journeyCompleted
                    ? "North Estate reached. Opening chapters complete!"
                    : "After the delivery, board the marked danfo just east of the central crossroads. Ride through East Junction to North Estate. Fare: ₦200; first arrival bonus: ₦300 and 5 reputation."}
                </p>
                <p className="muted">
                  Next planned chapter: saving for and running your first
                  business. Building interiors are explorable; shop and banking
                  services will follow.
                </p>
                <div className="mission-status" role="status">
                  {notice}
                </div>
                <button className="primary" onClick={() => setView("city")}>
                  Explore the city
                  <Icon name="arrow" />
                </button>
              </>
            ) : panel === "profile" ? (
              <>
                <span className="panel-symbol">
                  <Icon name="user" size={28} />
                </span>
                <span className="eyebrow">YOUR LAGOS STORY</span>
                <h2>{p.name}</h2>
                <p>Rookie hustler. Big things start with small steps.</p>
                <div className="profile-grid">
                  <div>
                    <small>Hustle cash</small>
                    <b>₦{p.cash.toLocaleString("en-NG")}</b>
                  </div>
                  <div>
                    <small>Reputation</small>
                    <b>{p.reputation} REP</b>
                  </div>
                  <div>
                    <small>Health</small>
                    <b>{p.health}/100</b>
                  </div>
                  <div>
                    <small>Energy</small>
                    <b>{p.energy}/100</b>
                  </div>
                </div>
                <p className="muted">
                  This is your local game profile. Cash is virtual; accounts and
                  withdrawals are not available.
                </p>
                <button
                  className="reset-button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Start a new story? This clears your local progress.",
                      )
                    ) {
                      reset();
                      setView("home");
                    }
                  }}
                >
                  Start a new story
                </button>
              </>
            ) : (
              <>
                <span className="panel-symbol">
                  <Icon name="help" size={28} />
                </span>
                <span className="eyebrow">MAKE YOURSELF AT HOME</span>
                <h2>Your world. Your pace.</h2>
                <div className="help-rows">
                  <p>
                    <b>Move around</b>
                    <span>
                      WASD, arrow keys or the touch pad. You can also click an
                      open spot on the ground to walk there.
                    </span>
                  </p>
                  <p>
                    <b>Look around</b>
                    <span>
                      Drag to rotate. Scroll or pinch to zoom. Right-drag or use
                      two fingers to pan.
                    </span>
                  </p>
                  <p>
                    <b>Start your first hustle</b>
                    <span>
                      Open City and find Mama Bisi’s green marker. Get close and
                      press E or Talk.
                    </span>
                  </p>
                  <p>
                    <b>Find your bearings</b>
                    <span>
                      Walk toward an ENTER marker and press E or the action
                      button. Exit using the door or Head into the city.
                      Neighbourhoods load as you explore.
                    </span>
                  </p>
                  <p>
                    <b>Street view</b>
                    <span>
                      Use Street view to see through your character’s eyes. Drag
                      to look; WASD or the touch pad moves you. Switch to
                      Overview for click-to-walk.
                    </span>
                  </p>
                  <p>
                    <b>Ride a danfo</b>
                    <span>
                      The marked bus starts east of the central crossroads.
                      Approach and press E to pay ₦200. Get off with E during an
                      eight-second stop. Home and City shortcuts are unavailable
                      during a ride.
                    </span>
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
