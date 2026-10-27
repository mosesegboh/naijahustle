import { usePlacement, type Placement } from "./usePlacement";
import "./advertise-banner.css";
export default function AdvertiseBanner({
  game = false,
  placement = "dashboard",
}: {
  game?: boolean;
  placement?: Placement;
}) {
  const { ad, ref } = usePlacement(placement);
  const booking = `/?advertise=1&placement=${placement}`;
  if (game && ad)
    return (
      <section
        ref={ref}
        className={`nh-advertise-banner nh-game-advertise nh-paid-game-ad ${ad.theme}`}
        aria-label="Sponsored in-game advert"
      >
        <span>SPONSORED</span>
        <a
          href={ad.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          title={ad.description}
        >
          <strong>{ad.title} ↗</strong>
          <small>{ad.description}</small>
        </a>
        <a
          className="nh-book-game-ad"
          href={booking}
          target="_blank"
          rel="noopener"
        >
          Advertise here ↗
        </a>
      </section>
    );
  return (
    <a
      className={`nh-advertise-banner ${game ? "nh-game-advertise" : ""}`}
      href={booking}
      target={game ? "_blank" : undefined}
      rel={game ? "noopener" : undefined}
      aria-label={
        game
          ? "Advertise here. Opens advertising desk in a new tab; multiplayer matches continue."
          : "Advertise here. Open the advertising desk."
      }
    >
      <span>YOUR BRAND HERE</span>
      <strong>Advertise here ↗</strong>
      <small>{game ? "Opens new tab" : "Create your billboard"}</small>
    </a>
  );
}
