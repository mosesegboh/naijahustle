import "./advertise-banner.css";
export default function AdvertiseBanner({ game = false }: { game?: boolean }) {
  return (
    <a
      className={`nh-advertise-banner ${game ? "nh-game-advertise" : ""}`}
      href="/?advertise=1"
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
