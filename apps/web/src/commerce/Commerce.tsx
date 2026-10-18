import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../stores/sessionStore";
import "./commerce.css";
type Ad = {
  id: string;
  title: string;
  description: string;
  url: string;
  theme: string;
  status: string;
  impressions: number;
  expiresAt?: number;
  amountKobo?: number;
};
type Summary = {
  admin: boolean;
  coins: number;
  settings: { revision: number; koboPerCoin: number; adPriceKobo: number };
  paymentMode: string;
  checkoutEnabled: boolean;
  ads: Ad[];
  review: Ad[];
};
const naira = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
    kobo / 100,
  );
export function Billboard({ onOpen }: { onOpen: () => void }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const ad = ads[index % Math.max(1, ads.length)];
  useEffect(() => {
    void api("commerce/placements")
      .then((d) => setAds(d.ads))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => i + 1), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ad || !ref.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5)
          timer = setTimeout(() => {
            if (document.visibilityState === "visible")
              void api("commerce/impression", { id: ad.id }).catch(() => {});
          }, 1000);
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [ad]);
  return (
    <section
      ref={ref}
      className={`nh-billboard ${ad?.theme || "teal"}`}
      aria-label="Advertising space"
    >
      <div>
        <span className="nh-eyebrow">
          {ad
            ? "SPONSORED • COMMUNITY BILLBOARD"
            : "YOUR BRAND. THE WHOLE CITY."}
        </span>
        <h2>{ad?.title || "Put your hustle on the map."}</h2>
        <p>
          {ad?.description ||
            "Reserve a seven-day spot on the playground dashboard."}
        </p>
      </div>
      {ad ? (
        <a href={ad.url} target="_blank" rel="noopener noreferrer sponsored">
          Visit advertiser ↗
        </a>
      ) : (
        <button onClick={onOpen}>Advertise here ↗</button>
      )}
      {ad && (
        <button className="nh-ad-small" onClick={onOpen}>
          Place your advert
        </button>
      )}
    </section>
  );
}
export default function Commerce() {
  const [data, setData] = useState<Summary>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => setData(await api("commerce/summary"));
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, []);
  async function action(path: string, body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = await api("commerce/" + path, body);
      await load();
      return result;
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("payment") === "advert") {
      if (p.get("transaction_id"))
        setMessage(
          "Checkout returned. Verify transaction " +
            p.get("transaction_id") +
            " below to complete your order.",
        );
      else
        setMessage(
          "Checkout returned without a transaction ID. You can retry from your advert below.",
        );
    }
  }, []);
  if (!data)
    return (
      <section className="nh-commerce">
        <h1>Wallet & advertising</h1>
        <p role="status">{message || "Loading your desk…"}</p>
      </section>
    );
  async function createAd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (await action("ads", fields)) {
      form.reset();
      setMessage(
        "Advert submitted. An administrator reviews it before checkout.",
      );
    }
  }
  return (
    <section className="nh-commerce">
      <span className="nh-eyebrow">THE HUSTLE EXCHANGE</span>
      <h1>Your rewards. Your reach.</h1>
      {message && (
        <p className="nh-commerce-message" role="status">
          {message}
        </p>
      )}
      <div className="nh-commerce-grid">
        <article className="nh-commerce-card">
          <span className="nh-eyebrow">EARNED IN THE PLAYGROUND</span>
          <h2>◉ {data.coins.toLocaleString()} coins</h2>
          <p>
            Earn rewards through free challenges. Coins currently have no
            redeemable cash value.
          </p>
          <dl>
            <dt>Draft exchange rate</dt>
            <dd>
              {data.settings.koboPerCoin
                ? `${naira(data.settings.koboPerCoin)} per coin`
                : "Not set"}
            </dd>
            <dt>Illustrative value only</dt>
            <dd>{naira(data.coins * data.settings.koboPerCoin)}</dd>
          </dl>
          <button disabled>Cash withdrawals unavailable</button>
          <small>
            The draft rate is a planning estimate, not a cash balance or payout
            promise. Deposits and wagering are not available.
          </small>
        </article>
        <article className="nh-commerce-card">
          <span className="nh-eyebrow">COMMUNITY BILLBOARD</span>
          <h2>Seven days in the spotlight.</h2>
          <p>
            {naira(data.settings.adPriceKobo)} per approved advert. Placements
            rotate on the signed-in dashboard for seven days from verified
            payment.
          </p>
          <p>
            Payment mode: <strong>{data.paymentMode.toUpperCase()}</strong>.{" "}
            {data.paymentMode === "test"
              ? "Test payments do not charge money or publish adverts."
              : "No guaranteed number of impressions."}
          </p>
          <small>
            Impressions count signed-in viewers after at least one second at 50%
            visibility, once per viewer per day. Your own views are excluded.
          </small>
        </article>
      </div>
      <form className="nh-commerce-card" onSubmit={createAd}>
        <h2>Create an advert</h2>
        <div className="nh-commerce-grid">
          <label>
            Headline
            <input
              name="title"
              required
              minLength={3}
              maxLength={55}
              placeholder="Your next favourite Lagos brand"
            />
          </label>
          <label>
            Website
            <input
              name="url"
              type="url"
              required
              placeholder="https://your-business.com"
            />
          </label>
        </div>
        <label>
          Your message
          <textarea name="description" required minLength={5} maxLength={160} />
        </label>
        <label>
          Billboard palette
          <select name="theme">
            <option value="teal">Lagoon teal</option>
            <option value="gold">Lagos gold</option>
            <option value="pink">Festival pink</option>
          </select>
        </label>
        <button disabled={busy}>Submit for approval</button>
      </form>
      <article className="nh-commerce-card">
        <h2>Your advertising orders</h2>
        {!data.ads.length && <p>Your first billboard starts here.</p>}
        {data.ads.map((ad) => (
          <div className="nh-ad-order" key={ad.id}>
            <div>
              <strong>{ad.title}</strong>
              <p>
                {ad.status.replaceAll("_", " ")} · {ad.impressions} impressions
                {ad.expiresAt
                  ? ` · ends ${new Date(ad.expiresAt).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
            {["approved", "payment_pending"].includes(ad.status) && (
              <button
                disabled={busy || !data.checkoutEnabled}
                onClick={async () => {
                  const r = await action("checkout", { id: ad.id });
                  if (r?.url) location.assign(r.url);
                }}
              >
                {data.paymentMode === "test"
                  ? "Test checkout"
                  : `Pay ${naira(ad.amountKobo || data.settings.adPriceKobo)}`}
              </button>
            )}
          </div>
        ))}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const r = await action("verify", {
              transactionId: f.get("transactionId"),
            });
            if (r) {
              setMessage(
                r.test
                  ? "Test payment verified. No money was charged and no live advert was published."
                  : "Payment verified. Your seven-day placement is active.",
              );
              history.replaceState(null, "", location.pathname);
            }
          }}
        >
          <label>
            Verify a completed payment
            <input
              name="transactionId"
              inputMode="numeric"
              pattern="[0-9]+"
              required
              defaultValue={
                new URLSearchParams(location.search).get("transaction_id") || ""
              }
              placeholder="Flutterwave transaction ID"
            />
          </label>
          <button disabled={busy || !data.checkoutEnabled}>
            Verify payment
          </button>
          <small>
            You can retry verification safely if you closed checkout or lost
            connection. Do not pay again.
          </small>
        </form>
      </article>
      {data.admin && (
        <>
          <form
            className="nh-commerce-card"
            key={data.settings.revision}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await action("settings", {
                  revision: data.settings.revision,
                  koboPerCoin: Math.round(Number(f.get("rate")) * 100),
                  adPriceKobo: Math.round(Number(f.get("price")) * 100),
                })
              )
                setMessage("Settings saved. Cash redemption remains disabled.");
            }}
          >
            <span className="nh-eyebrow">ADMINISTRATOR</span>
            <h2>Economy settings</h2>
            <div className="nh-commerce-grid">
              <label>
                Draft naira per coin
                <input
                  name="rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  defaultValue={data.settings.koboPerCoin / 100}
                />
              </label>
              <label>
                Seven-day advert price (NGN)
                <input
                  name="price"
                  type="number"
                  min="100"
                  max="1000000"
                  step="0.01"
                  required
                  defaultValue={data.settings.adPriceKobo / 100}
                />
              </label>
            </div>
            <p>
              Choose a draft rate from the cash budget available for rewards
              divided by the number of eligible coins. Reserve for fees and
              fraud; re-evaluate before payouts are enabled. Changing this field
              does not enable withdrawals.
            </p>
            <button disabled={busy}>Save settings</button>
          </form>
          <article className="nh-commerce-card">
            <h2>Advert review queue</h2>
            {!data.review.length && <p>No adverts waiting.</p>}
            {data.review.map((ad) => (
              <div className="nh-ad-order" key={ad.id}>
                <div>
                  <strong>{ad.title}</strong>
                  <p>{ad.description}</p>
                  <a href={ad.url} rel="noopener noreferrer" target="_blank">
                    {ad.url}
                  </a>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action("review", { id: ad.id, decision: "approved" })
                  }
                >
                  Approve
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action("review", { id: ad.id, decision: "rejected" })
                  }
                >
                  Reject
                </button>
              </div>
            ))}
          </article>
        </>
      )}
    </section>
  );
}
