# Advertising and economy desk

Open **Wallet & adverts** in the dashboard. Players can submit a text advert with an HTTPS destination and select a billboard palette. An administrator must approve the creative before checkout. The default draft seven-day placement price is ₦5,000. Approved adverts rotate on the signed-in dashboard after verified live payment; there is no guaranteed impression count.

## Administrator access

Set `ADMIN_USER_IDS` in Heroku Config Vars to a comma-separated list of existing account IDs. Access is checked on the server; registration never grants admin rights. Obtain the chosen player's immutable `id` from MongoDB `users` after verifying the username with the owner. Do not use an email from an incoming request or automatically promote the first registered account.

The same desk then shows **Economy settings** and the approval queue. Edit the draft **naira per coin** and **seven-day advert price** there. Values are stored as integer kobo with revision checks in `economy_settings`. Existing payment orders retain their quoted price. Rate changes do not convert balances or enable withdrawals.

A planning calculation is `available reward budget / eligible earned coins`. For example, a hypothetical ₦10,000 budget for 100,000 eligible coins is ₦0.10/coin before fees and reserves. This is an illustration, not a recommended payout promise. Current game rewards have not been financially audited. Cash redemption requires a funded policy, eligibility/fraud controls, a payout ledger and a suitable provider. These are not enabled by this release. Betting, staking and wager commissions are not implemented.

## Flutterwave

The supplied Escrosis configuration contains a **test** `FLW_SECRET_KEY`. Naija Hustle uses it as server-only `FLUTTERWAVE_SECRET_KEY`. Do not put it in Vite variables or Git. The integration uses Flutterwave v3 hosted checkout and server-to-server verification. The server checks owner, reference, successful status, transaction ID, exact NGN amount and payment mode before fulfilling an order. A repeated verification cannot extend its expiry. Test payments become `test_paid` and never enter public advertising rotation.

A live key alone does not enable charging: `FLUTTERWAVE_ADS_ENABLED=true` is also required after this merchant/use case is accepted by the provider. `WEB_ORIGIN` supplies the return URL. There is no webhook in this first release: after returning from checkout, use **Verify payment**, or enter the transaction ID later if the browser was closed. Unverified orders remain pending, not published. Failed provider calls do not grant value. Refunds and disputes require operator handling; no automated refund tool is included.

Flutterwave's published policy lists monetisable virtual currency among prohibited businesses. This integration is for advertising only; it must not be repurposed for coin deposits, withdrawals or wagering. Merchant acceptance must cover the actual site/business, not just the checkout label.

## Impression measurement

The browser requests a view after a billboard is at least 50% visible for one second while the tab is visible. The backend counts at most one view per signed-in viewer/ad/UTC day, excludes owner views and ignores expired/non-live placements. MongoDB transactions keep de-duplication records and counts consistent; Atlas supports these transactions. These are authenticated view counts, not verified humans or an audited advertising metric. The endpoint is not proof against determined view fraud. No clicks or guaranteed reach are sold.

Verification: service tests cover authorization, pricing, forged payment rejection, wrong ownership, replay safety, sandbox separation and view de-duplication. `scripts/commerce-review.mjs` uses isolated accounts to verify the mobile UI. The supplied test credentials passed an authenticated read-only provider request and sandbox hosted-checkout creation. No payment was charged; completed sandbox card authorization, real settlement and refunds still require separate end-to-end acceptance. Mocked verification tests are not proof of provider settlement.

References: [Flutterwave Standard](https://developer.flutterwave.com/docs/flutterwave-standard-1), [transaction verification](https://developer.flutterwave.com/docs/transaction-verification), [prohibited businesses](https://www.flutterwave.com/us/support/my-account/businesses-and-services-prohibited-by-flutterwave).

## Release review

The scenery update adds market stalls, produce baskets, palms, lamps, waterfront boats, rooftop music equipment and background neighbours to Festival Rush, plus trackside kiosks, spectator groups, benches, pergolas and a central fountain to Street Kings. Static 3D props participate in the existing material batching. Decorative props do not add collision obstacles. Android-sized Chromium passed movement, control visibility and portrait/landscape checks in both games. These are desktop browser simulations, not physical-device measurements.
