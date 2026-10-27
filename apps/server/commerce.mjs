import { randomUUID } from "node:crypto";
export const DEFAULT_ECONOMY = {
  revision: 0,
  koboPerCoin: 0,
  adPriceKobo: 500000,
  racingAdPriceKobo: 500000,
  festivalAdPriceKobo: 500000,
};
export function commerceService(
  store,
  { env = process.env, request = fetch } = {},
) {
  const admin = (u) => (env.ADMIN_USER_IDS || "").split(",").includes(u.id);
  const mode = () =>
    !env.FLUTTERWAVE_SECRET_KEY
      ? "unconfigured"
      : env.FLUTTERWAVE_SECRET_KEY.includes("TEST")
        ? "test"
        : "live";
  // Production charging requires an explicit, separate merchant activation.
  const enabled = () =>
    mode() === "test" ||
    (mode() === "live" && env.FLUTTERWAVE_ADS_ENABLED === "true");
  async function flutter(path, body) {
    const r = await request("https://api.flutterwave.com/v3/" + path, {
      method: body ? "POST" : "GET",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await r.json();
    if (!r.ok || data.status !== "success")
      throw new Error(
        "Payment provider unavailable. Retry from your advertising desk.",
      );
    return data.data;
  }
  const publicAd = ({ id, title, description, url, theme, expiresAt }) => ({
    expiresAt,
    id,
    title,
    description,
    url,
    theme,
  });
  return async ({ path, method, body, user, now, send }) => {
    if (!path.startsWith("/api/commerce/")) return false;
    const settings = { ...DEFAULT_ECONOMY, ...(await store.economy()) };
    const placements = ["dashboard", "racing", "festival"];
    const price = (placement) =>
      settings[
        placement === "racing"
          ? "racingAdPriceKobo"
          : placement === "festival"
            ? "festivalAdPriceKobo"
            : "adPriceKobo"
      ];
    const reply = (code, data) => {
      send(code, data);
      return true;
    };
    if (path === "/api/commerce/summary" && method === "GET")
      return reply(200, {
        settings,
        admin: admin(user),
        coins: user.coins,
        payoutEnabled: false,
        paymentMode: mode(),
        checkoutEnabled: enabled(),
        ads: await store.ownedAds(user.id),
        review: admin(user) ? await store.reviewAds() : [],
      });
    if (path === "/api/commerce/settings" && method === "POST") {
      if (!admin(user))
        return reply(403, { error: "Administrator access required." });
      const extra = {
        racingAdPriceKobo: body.racingAdPriceKobo ?? settings.racingAdPriceKobo,
        festivalAdPriceKobo:
          body.festivalAdPriceKobo ?? settings.festivalAdPriceKobo,
      };
      if (
        !Object.values(extra).every(
          (v) => Number.isSafeInteger(v) && v >= 10000 && v <= 100000000,
        ) ||
        ![body.koboPerCoin, body.adPriceKobo, body.revision].every(
          Number.isSafeInteger,
        ) ||
        body.koboPerCoin < 0 ||
        body.koboPerCoin > 10000 ||
        body.adPriceKobo < 10000 ||
        body.adPriceKobo > 100000000
      )
        return reply(400, {
          error: "Use whole kobo: rate 0–10,000; ad price ₦100–₦1,000,000.",
        });
      const ok = await store.saveEconomy({
        ...extra,
        koboPerCoin: body.koboPerCoin,
        adPriceKobo: body.adPriceKobo,
        revision: body.revision,
        updatedBy: user.id,
        updatedAt: now,
      });
      return reply(
        ok ? 200 : 409,
        ok
          ? { ok: true }
          : { error: "Settings changed. Refresh and try again." },
      );
    }
    if (path === "/api/commerce/ads" && method === "POST") {
      const title = String(body.title || "").trim(),
        description = String(body.description || "").trim();
      let url;
      try {
        url = new URL(body.url);
      } catch {
        return reply(400, { error: "Enter a valid HTTPS website." });
      }
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        !url.hostname.includes(".") ||
        title.length < 3 ||
        title.length > 55 ||
        description.length < 5 ||
        description.length > 160 ||
        !["gold", "teal", "pink"].includes(body.theme) ||
        !placements.includes(body.placement ?? "dashboard")
      )
        return reply(400, {
          error:
            "Use a title (3–55 characters), message (5–160), and HTTPS website.",
        });
      if (
        (await store.ownedAds(user.id)).filter((a) => a.status === "review")
          .length >= 5
      )
        return reply(409, {
          error: "You already have five adverts waiting for review.",
        });
      const ad = {
        id: randomUUID(),
        owner: user.id,
        title,
        description,
        url: url.href,
        theme: body.theme,
        placement: body.placement ?? "dashboard",
        status: "review",
        created: now,
        impressions: 0,
        test: mode() !== "live",
      };
      await store.createAd(ad);
      return reply(201, { ad });
    }
    if (path === "/api/commerce/review" && method === "POST") {
      if (!admin(user))
        return reply(403, { error: "Administrator access required." });
      if (!["approved", "rejected"].includes(body.decision))
        return reply(400, { error: "Choose approve or reject." });
      const ok = await store.patchAd(
        String(body.id),
        { status: "review" },
        { status: body.decision, reviewedBy: user.id, reviewedAt: now },
      );
      return reply(
        ok ? 200 : 409,
        ok ? { ok: true } : { error: "Advert already reviewed." },
      );
    }
    if (path === "/api/commerce/checkout" && method === "POST") {
      if (!enabled())
        return reply(503, {
          error: "Advertising checkout has not been activated.",
        });
      let ad = await store.ad(String(body.id));
      if (!ad || ad.owner !== user.id)
        return reply(404, { error: "Advert not found." });
      if (!["approved", "payment_pending"].includes(ad.status))
        return reply(409, { error: "Only approved adverts can be paid for." });
      if (!user.email)
        return reply(400, {
          error: "An account email is required for checkout.",
        });
      if (ad.status === "approved") {
        const fields = {
          status: "payment_pending",
          amountKobo: price(ad.placement),
          txRef: "nh-ad-" + ad.id,
          test: mode() === "test",
        };
        if (!(await store.patchAd(ad.id, { status: "approved" }, fields)))
          return reply(409, {
            error: "Checkout already started. Refresh your advert.",
          });
        ad = { ...ad, ...fields };
      }
      if (ad.test !== (mode() === "test"))
        return reply(409, {
          error: "Payment mode changed. Create a new advert.",
        });
      if (ad.checkoutUrl) return reply(200, { url: ad.checkoutUrl });
      try {
        const payment = await flutter("payments", {
          tx_ref: ad.txRef,
          amount: ad.amountKobo / 100,
          currency: "NGN",
          redirect_url: env.WEB_ORIGIN + "/?payment=advert",
          customer: { email: user.email, name: user.name },
          customizations: {
            title: "Naija Hustle advertising",
            description: `Seven-day ${ad.placement ?? "dashboard"} placement`,
          },
        });
        const link = new URL(payment.link);
        if (
          link.protocol !== "https:" ||
          !(
            link.hostname === "checkout.flutterwave.com" ||
            link.hostname.endsWith(".flutterwave.com")
          )
        )
          throw new Error("Unexpected checkout address.");
        await store.patchAd(
          ad.id,
          { status: "payment_pending" },
          { checkoutUrl: link.href },
        );
        return reply(200, { url: link.href });
      } catch (e) {
        return reply(502, { error: e.message });
      }
    }
    if (path === "/api/commerce/verify" && method === "POST") {
      if (!enabled() || !/^\d{1,30}$/.test(String(body.transactionId)))
        return reply(400, {
          error: "A valid payment transaction ID is required.",
        });
      try {
        const payment = await flutter(
          "transactions/" + body.transactionId + "/verify",
        );
        const ad = await store.adByReference(payment.tx_ref);
        if (!ad || ad.owner !== user.id)
          return reply(404, {
            error: "This payment does not belong to your advert.",
          });
        if (
          ad.test !== (mode() === "test") ||
          payment.status !== "successful" ||
          payment.currency !== "NGN" ||
          !Number.isFinite(Number(payment.amount)) ||
          Math.round(Number(payment.amount) * 100) !== ad.amountKobo ||
          String(payment.id) !== String(body.transactionId)
        )
          return reply(409, {
            error:
              "Payment does not match this order. No placement was activated.",
          });
        if (["active", "test_paid"].includes(ad.status))
          return reply(200, { ok: true, test: ad.test });
        if (
          !(await store.patchAd(
            ad.id,
            { status: "payment_pending" },
            {
              status: ad.test ? "test_paid" : "active",
              transactionId: String(payment.id),
              paidAt: now,
              expiresAt: now + 7 * 86400000,
            },
          ))
        )
          return reply(409, { error: "Order changed. Refresh and try again." });
        return reply(200, { ok: true, test: ad.test });
      } catch {
        return reply(502, {
          error:
            "Could not verify payment. Retry verification; do not pay again.",
        });
      }
    }
    if (
      (path === "/api/commerce/placements" ||
        path.startsWith("/api/commerce/placements/")) &&
      method === "GET"
    ) {
      const placement =
        path === "/api/commerce/placements"
          ? "dashboard"
          : path.split("/").at(-1);
      if (!placements.includes(placement))
        return reply(400, { error: "Unknown advertising placement." });
      return reply(200, {
        ads: (await store.activeAds(now, placement))
          .filter((a) => (a.placement ?? "dashboard") === placement)
          .map(publicAd),
      });
    }
    if (path === "/api/commerce/impression" && method === "POST") {
      const ad = await store.ad(String(body.id));
      if (
        !ad ||
        ad.status !== "active" ||
        ad.expiresAt <= now ||
        ad.owner === user.id ||
        (ad.placement ?? "dashboard") !== (body.placement ?? "dashboard")
      )
        return reply(200, { ok: true });
      await store.impression(ad.id, user.id, Math.floor(now / 86400000));
      return reply(200, { ok: true });
    }
    return reply(404, { error: "Not found" });
  };
}
