# Festival Rush: The Missing Rhythm

An original Nigerian-inspired side-scrolling platform challenge for Naija Hustle.
This is a first playable 2D challenge, not a Mario reskin: original characters,
shopfronts, festival bunting, music-themed story and a Lagos evening palette.

## Story and course

A storm has scattered Mama Bisi's festival lanterns. Her neighbourhood crew races
to restore the celebration before the rooftop band packs up. The first course has
three connected chapters: Market Morning, Across the Canal, and Rooftop Reunion.
Reach three checkpoint flags and the festival arch within 150 seconds. Jump over
wandering storm crabs, gaps and elevated walkways. A fall returns you to your last
flag; you keep collected tokens. Each player has their own set of 20 tokens, so a
fast player cannot take all rewards away from newcomers. Players cannot push each
other off the course. Username labels and progress indicators identify opponents.

## Recommended reward experiment

- Each finisher: 10 coins plus their collected tokens, capped at 20.
- First finisher: an extra 30 coins. Maximum total: 60.
- A simultaneous server-step finish is a tie: no champion bonus.
- Leaving or failing to finish: zero. Solo practice: zero wallet credit.
- Finishers wait for all players or the timer before rewards are credited.

This rewards skill and gives a losing player a reason to finish. Winner-only
rewards can discourage beginners, especially when learning on a phone. These
numbers are a play-test starting point, not a settled cash economy. The service
verifies movement, collectibles and finishes; credits use the existing revisioned
MongoDB account and unique match ledger entry, making retries idempotent.

Coins have no cash-conversion or withdrawal functionality in this release. Before
any cash-linked launch, define funding, exchange rates, eligibility, earning caps,
anti-collusion controls and the withdrawal process. Do not treat these prototype
matches as secure for cash payouts: clients still supply directional input and
can automate it. Entry is free; there are no wagers.

## Multiplayer and testing

Open Festival Rush from the dashboard. Search usernames, select 1–3 players and
send an invitation. Everyone accepts; only the host can start. Guests select
Enter run within 30 seconds. All loaded players share a three-second countdown.
Each browser follows its own avatar. Keyboard: A/D or arrows to move, Space/W/up
to jump. Phone: hold a direction and tap Jump with another finger.

The first version uses the existing HTTP API and MongoDB match storage, tagged
`game: festival` and excluded from kart endpoints. It polls authoritative state
at roughly 10 Hz with visual smoothing; it is not a dedicated low-latency game
server. Future work: more courses, character choices, sound, moving platforms,
and a dedicated real-time transport. No production-performance claim is made.
