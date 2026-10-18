import { describe, it, expect } from "vitest";
import { commerceService } from "./commerce.mjs";
import { memoryStore } from "./test-store.mjs";
function fixture() {
  const store = memoryStore();
  let payment: any;
  let checkout: any;
  const env = {
    ADMIN_USER_IDS: "admin",
    FLUTTERWAVE_SECRET_KEY: "FLWSECK_TEST-fixture",
    WEB_ORIGIN: "https://game.example",
  };
  const service = commerceService(store, {
    env,
    request: async (_url: string, options: any) => {
      if (options.body) {
        checkout = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            status: "success",
            data: { link: "https://checkout.flutterwave.com/test" },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ status: "success", data: payment }),
      };
    },
  });
  async function call(route: string, body?: any, id = "player") {
    let result: any;
    await service({
      path: "/api/commerce/" + route,
      method: body === undefined ? "GET" : "POST",
      body: body || {},
      user: { id, name: id, email: id + "@example.test", coins: 120 },
      now: 100000,
      send: (status: number, data: any) => {
        result = { status, ...data };
      },
    });
    return result;
  }
  const draft = {
    title: "Lagos Coffee",
    description: "Fresh coffee by the lagoon",
    url: "https://coffee.example",
    theme: "teal",
  };
  async function order() {
    const { ad } = await call("ads", draft);
    await call("review", { id: ad.id, decision: "approved" }, "admin");
    await call("checkout", { id: ad.id });
    return store.ad(ad.id);
  }
  return {
    store,
    env,
    call,
    draft,
    order,
    setPayment: (p: any) => {
      payment = p;
    },
    checkout: () => checkout,
  };
}
describe("advertising and draft economy", () => {
  it("protects administrator settings and rejects stale/invalid updates", async () => {
    const f = fixture();
    const settings = { revision: 0, koboPerCoin: 10, adPriceKobo: 500000 };
    expect((await f.call("settings", settings)).status).toBe(403);
    expect((await f.call("settings", settings, "admin")).status).toBe(200);
    expect((await f.call("settings", settings, "admin")).status).toBe(409);
    expect(
      (
        await f.call(
          "settings",
          { ...settings, revision: 1, koboPerCoin: -1 },
          "admin",
        )
      ).status,
    ).toBe(400);
    expect((await f.call("summary")).payoutEnabled).toBe(false);
  });
  it("requires review, ownership and a safe creative before checkout", async () => {
    const f = fixture();
    expect(
      (await f.call("ads", { ...f.draft, url: "javascript:alert(1)" })).status,
    ).toBe(400);
    const { ad } = await f.call("ads", f.draft);
    expect((await f.call("checkout", { id: ad.id })).status).toBe(409);
    expect(
      (await f.call("review", { id: ad.id, decision: "approved" })).status,
    ).toBe(403);
    await f.call("review", { id: ad.id, decision: "approved" }, "admin");
    expect((await f.call("checkout", { id: ad.id }, "other")).status).toBe(404);
    expect((await f.call("checkout", { id: ad.id })).status).toBe(200);
    expect(f.checkout().amount).toBe(5000);
  });
  it("rejects forged, wrong amount, currency and owner payments", async () => {
    const f = fixture(),
      ad = await f.order();
    const payment = {
      id: 123,
      tx_ref: ad.txRef,
      status: "successful",
      currency: "NGN",
      amount: 5000,
    };
    for (const bad of [
      { ...payment, amount: 1 },
      { ...payment, currency: "USD" },
      { ...payment, status: "failed" },
      { ...payment, id: 456 },
    ]) {
      f.setPayment(bad);
      expect((await f.call("verify", { transactionId: 123 })).status).toBe(409);
    }
    f.setPayment(payment);
    expect(
      (await f.call("verify", { transactionId: 123 }, "other")).status,
    ).toBe(404);
    expect((await f.store.ad(ad.id)).status).toBe("payment_pending");
  });
  it("keeps sandbox payments out of live placements and verifies idempotently", async () => {
    const f = fixture(),
      ad = await f.order();
    f.setPayment({
      id: 123,
      tx_ref: ad.txRef,
      status: "successful",
      currency: "NGN",
      amount: 5000,
    });
    expect((await f.call("verify", { transactionId: 123 })).test).toBe(true);
    const first = await f.store.ad(ad.id);
    expect(first.status).toBe("test_paid");
    expect((await f.call("verify", { transactionId: 123 })).status).toBe(200);
    expect((await f.store.ad(ad.id)).expiresAt).toBe(first.expiresAt);
    expect((await f.call("placements")).ads).toHaveLength(0);
  });
  it("does not activate live charging just because a live key is present", async () => {
    const f = fixture();
    f.env.FLUTTERWAVE_SECRET_KEY = "live-fixture";
    expect((await f.call("summary")).checkoutEnabled).toBe(false);
  });
  it("deduplicates views and excludes the owner and expired adverts", async () => {
    const f = fixture();
    await f.store.createAd({
      id: "ad",
      owner: "owner",
      status: "active",
      expiresAt: 200000,
      impressions: 0,
    });
    await Promise.all(
      Array.from({ length: 5 }, () => f.call("impression", { id: "ad" })),
    );
    await f.call("impression", { id: "ad" }, "owner");
    expect((await f.store.ad("ad")).impressions).toBe(1);
    await f.store.patchAd("ad", {}, { expiresAt: 0 });
    await f.call("impression", { id: "ad" }, "someone");
    expect((await f.store.ad("ad")).impressions).toBe(1);
  });
});
