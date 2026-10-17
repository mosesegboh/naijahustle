# Lagos Afterglow — season one

Naija Hustle remains a social simulation and challenge world. Street Kings is its first connected competitive activity. The festival provides a reason to meet, form crews and play, without making the whole world a racing game.

## Story

Mama Bisi is bringing back the neighbourhood night festival. A storm damaged the decorations, deliveries are late, and rival crews all want their names on the festival board. Oga Tunde offers a repaired kart and a simple invitation: help the neighbourhood, learn the streets, and earn your place in the final. The rivalry is playful; weapons are arcade gadgets, with temporary slowdown rather than injury.

1. **The invitation — Festival Gate.** Learn steering, braking, drifting and boosting. Finish a rookie lap. Tunde’s lesson: knowing the road beats holding the accelerator.
2. **Market movers — Market Chicane.** Bisi needs a reliable driver. Weave around barrels, read the openings and use boost lanes. Obstacle mode adds more solid barriers than circuit mode.
3. **Signal trouble — Lagoon Bend.** The festival’s practice targets need clearing. Equip the pulse launcher, aim ahead and score in a 90-second battle. Targets are shared and can only be destroyed once per match.
4. **Crew call — Bridge Approach.** Invite one to three registered players by username. Each invited player chooses a gadget and accepts. The host starts with two or more accepted players; unaccepted invitations are excluded from that race. Everyone joins and loads their scene before a shared three-second countdown. A driver who fails to load within one minute causes cancellation without rewards.
5. **Afterglow qualifiers — Neon Mile.** Choose pro difficulty and three laps. The denser course rewards clean lines, well-timed shields and clever traps.
6. **The festival final — Home Straight.** Win a crew event, earn 50 account coins and take the neighbourhood bragging rights. A draw, cancellation or solo practice pays nothing. Return to the lobby to host a rematch with new rules.

The six briefings are selectable now, not a claim of six separate fully modelled maps or persistent quest progression. All use the Marina circuit with configurable obstacles and rules. Future social quests, boxing and danfo activities can join this festival structure.

## Playable rules

- **Circuit:** first to complete the selected 1–3 laps wins. Twelve ordered checkpoints prevent finish-line shortcuts. Five-minute limit; no finisher means no winner.
- **Obstacle run:** same lap objective with more solid barriers. Touching a barrier slows and pushes the kart away. Boost pads temporarily increase speed.
- **Target battle:** highest score after 90 seconds wins. Target +5, unshielded rival hit +3, completed lap +10. A tie or all-zero score pays nobody.
- **Pulse:** forward projectile; 1.2-second cooldown. Aim the kart at a target or rival.
- **Oil:** a trap behind the kart; five-second cooldown, eight-second lifetime.
- **Shield:** blocks hits for three seconds; eight-second cooldown.
- A successful unshielded hit slows and briefly stuns the rival. Gadgets have no ammunition purchases or paid advantage.

## Match and economy implementation

Accounts, invitations and race snapshots are in MongoDB. Two to four accepted players see independently controlled cameras, interpolated rival karts and optional username labels. Clients submit bounded controls, never positions, scores, wins or reward amounts. The server simulates driving, collisions, weapon hits, ordered checkpoints and results. Match writes use revision checks; the winner’s balance and a match-ID ledger entry are written together with account revision checks, preventing duplicate payouts on retry.

Current transport is short HTTP polling, not a production low-latency multiplayer engine. Stale controls stop after 750 ms; a player stops participating after 20 seconds without inputs. Dropping below two participants cancels the match without rewards. Invitations expire after 30 minutes; match documents expire after a day. Account reward history persists. A signed-in user can discover other usernames, but the picker exposes no emails and does not claim everyone is online.

Entry is free. The server awards a fixed 50 in-game coins, without deducting an opponent’s balance. There are no wagers, purchases, cash rates or withdrawals in this implementation. Before attaching monetary value, add economy administration, abuse prevention and operational review. Scripted play and colluding accounts are not prevented by server-authoritative movement alone.

## Visual direction and next increments

The festival circuit has colourful shops, palms, route sectors, targets, boost pads, barriers and an illuminated next-checkpoint arch. Driver head motion is damped and cornering adds a small body lean. The current imported driver still uses a posed skeleton; custom hand/steering animation and an authored character animation pass remain future art work.

Next: playtest two-to-four players on real hardware and network connections; tune track readability and gadgets; replace polling with a dedicated tick-based race service if latency warrants it; add persistent campaign objectives and additional authored circuits. Keep existing security tests and reward replay checks when changing the transport.
