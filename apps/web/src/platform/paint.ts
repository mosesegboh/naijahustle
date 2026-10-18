import { festivalScenery } from "./scenery";
import {
  platforms,
  coins,
  hazards,
  hazardX,
  checkpoints,
  FINISH,
  type FestivalMatch,
} from "../../../../packages/shared/src/platform";
const colors = ["#ffcc42", "#40e2c1", "#f68ba6", "#a895ff"];
export function paint(
  ctx: CanvasRenderingContext2D,
  m: FestivalMatch,
  userId: string,
  now: number,
) {
  const me = m.players.find((p) => p.id === userId)!;
  const view = ctx.canvas.width;
  const camera = Math.max(0, Math.min(3700 - view, me.x - view * 0.32));
  const time = m.waiting ? 0 : Math.max(0, (now - m.starts) / 1000);
  const sky = ctx.createLinearGradient(0, 0, 0, 540);
  sky.addColorStop(0, "#563d83");
  sky.addColorStop(0.65, "#ed9b9c");
  sky.addColorStop(1, "#ffc78b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view, 540);
  ctx.fillStyle = "#ffe6a8";
  ctx.beginPath();
  ctx.arc(view * 0.77 - camera * 0.08, 110, 54, 0, Math.PI * 2);
  ctx.fill();
  for (let i = -1; i < Math.ceil(view / 100) + 2; i++) {
    const x = i * 100 - ((camera * 0.25) % 100),
      h = 65 + (i % 4) * 24;
    ctx.fillStyle = "#654a85";
    ctx.fillRect(x, 300 - h, 76, h + 100);
    ctx.fillStyle = "#e6c0a1";
    for (let y = 315 - h; y < 290; y += 23)
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 12 + k * 19, y, 7, 11);
  }
  ctx.fillStyle = "#3d8298";
  ctx.fillRect(0, 458, view, 82);
  ctx.strokeStyle = "#73bdcb";
  ctx.lineWidth = 2;
  for (let i = 0; i < Math.ceil(view / 76) + 2; i++) {
    const x = (i * 76 + time * 18) % (view + 40);
    ctx.beginPath();
    ctx.moveTo(x, 485 + (i % 3) * 17);
    ctx.lineTo(x + 30, 485 + (i % 3) * 17);
    ctx.stroke();
  }
  // Soft clouds and distant birds add depth without obscuring the course.
  ctx.fillStyle = "#fff0df70";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 220 - camera * 0.12 + 1200) % (view + 250)) - 100;
    ctx.beginPath();
    ctx.ellipse(x, 75 + (i % 2) * 35, 60, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 16, 63 + (i % 2) * 35, 29, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(-camera, 0);
  // Original festival bunting and shopfronts: three distinct neighbourhoods.
  for (let i = 0; i < 17; i++) {
    const x = i * 240;
    const roofY = 205 + (i % 4) * 13;
    ctx.fillStyle = ["#ce718c", "#d5a34d", "#628d83"][Math.floor(x / 1250)];
    ctx.beginPath();
    ctx.roundRect(x, roofY, 180, 440 - roofY, [14, 14, 0, 0]);
    ctx.fill();
    const shade = ctx.createLinearGradient(x, 0, x + 180, 0);
    shade.addColorStop(0, "#ffffff15");
    shade.addColorStop(1, "#28203350");
    ctx.fillStyle = shade;
    ctx.fillRect(x, roofY + 10, 180, 430 - roofY);
    ctx.fillStyle = "#ffe7bd";
    ctx.fillRect(x - 4, roofY - 2, 188, 8);
    ctx.fillStyle = "#604362";
    ctx.fillRect(x + 15, roofY - 12, 150, 10);
    if (i % 3 === 0) {
      ctx.fillStyle = "#526073";
      ctx.beginPath();
      ctx.ellipse(x + 125, roofY - 25, 19, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + 120, roofY - 25, 3, 19);
    }
    ctx.fillStyle = "#f4d59f55";
    for (let stripe = 0; stripe < 6; stripe++)
      ctx.fillRect(x + stripe * 30, roofY + 10, 2, 430 - roofY);
    ctx.fillStyle = "#392f56";
    ctx.fillRect(x + 25, 310, 48, 130);
    ctx.fillRect(x + 100, 285, 46, 55);
    ctx.fillStyle = "#ffdf8b";
    ctx.fillRect(x + 105, 290, 16, 43);
    ctx.fillRect(x + 126, 290, 15, 43);
    ctx.fillStyle = "#efd09d";
    ctx.fillRect(x + 95, 337, 57, 7);
    // Flower boxes and patterned doors distinguish the streets.
    ctx.fillStyle = "#b96951";
    ctx.fillRect(x + 98, 343, 50, 12);
    for (let f = 0; f < 4; f++) {
      ctx.fillStyle = "#478e79";
      ctx.beginPath();
      ctx.ellipse(x + 105 + f * 12, 338, 5, 10, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors[(i + f) % colors.length];
      ctx.beginPath();
      ctx.arc(x + 105 + f * 12, 330, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#ecc18e";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 31, 320, 35, 102);
    for (let j = 0; j < 6; j++) {
      ctx.fillStyle = j % 2 ? "#fff1bd" : "#dc5765";
      ctx.fillRect(x + j * 30, 270, 30, 23);
    }
    ctx.fillStyle = "#fff3d0";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(
      [
        "BISI’S MARKET",
        "EKO TAILORS",
        "ZOBŌ & CO",
        "SUYA JUNCTION",
        "RECORD HOUSE",
        "LAGOON CAFE",
        "CANAL WALK",
        "BOAT WORKS",
        "MARINA BOOKS",
        "FRESH CATCH",
        "PALM TERRACE",
        "ROOFTOP RHYTHM",
        "MUSIC YARD",
        "SKY GARDEN",
        "DRUM CLUB",
        "SUNSET STUDIO",
        "FESTIVAL HALL",
      ][i],
      x + 10,
      260,
    );
    ctx.strokeStyle = "#412f65";
    ctx.beginPath();
    ctx.moveTo(x, 160);
    ctx.quadraticCurveTo(x + 120, 200, x + 240, 160);
    ctx.stroke();
    for (let j = 0; j < 6; j++) {
      ctx.fillStyle = colors[j % 4];
      ctx.beginPath();
      ctx.moveTo(x + j * 40, 172);
      ctx.lineTo(x + j * 40 + 28, 178);
      ctx.lineTo(x + j * 40 + 10, 200);
      ctx.fill();
    }
  }
  festivalScenery(ctx, camera, view, time);
  for (const [x, y, w] of platforms) {
    ctx.fillStyle = "#50354c";
    ctx.fillRect(x, y, w, y === 440 ? 120 : 20);
    ctx.fillStyle = "#ffcf89";
    ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = "#fff1bd";
    ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = "#ba745a";
    for (let bx = x + 10; bx < x + w - 15; bx += 35)
      ctx.fillRect(bx, y + 14, 25, 8);
  }
  checkpoints.slice(1).forEach((x, i) => {
    ctx.fillStyle = "#fff3cb";
    ctx.fillRect(x, 352, 4, 88);
    ctx.fillStyle = me.checkpoint > i ? "#45ebbd" : "#fff3cb";
    ctx.beginPath();
    ctx.moveTo(x + 4, 352);
    ctx.lineTo(x + 44, 366);
    ctx.lineTo(x + 4, 383);
    ctx.fill();
  });
  for (const c of coins) {
    if (me.collected.includes(c.id)) continue;
    ctx.fillStyle = "#ffe780";
    ctx.shadowColor = "#ffbe45";
    ctx.shadowBlur = 13;
    ctx.beginPath();
    ctx.ellipse(
      c.x,
      c.y + Math.sin(time * 3 + c.id) * 3,
      10,
      13,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#b46e39";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("₦", c.x - 5, c.y + 5);
  }
  for (const base of hazards) {
    const x = hazardX(base, time);
    ctx.fillStyle = "#df666b";
    ctx.beginPath();
    ctx.roundRect(x - 20, 414, 40, 26, 12);
    ctx.fill();
    ctx.fillStyle = "#fff9e5";
    ctx.beginPath();
    ctx.arc(x - 9, 418, 7, 0, Math.PI * 2);
    ctx.arc(x + 9, 418, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#302443";
    ctx.beginPath();
    ctx.arc(x - 8, 419, 3, 0, Math.PI * 2);
    ctx.arc(x + 10, 419, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffd65b";
  ctx.fillRect(FINISH, 280, 12, 160);
  ctx.fillRect(FINISH + 120, 280, 12, 160);
  ctx.fillRect(FINISH, 280, 132, 35);
  ctx.fillStyle = "#513466";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("FESTIVAL!", FINISH + 17, 304);
  // Oversized heads, patterned outfits and animated running limbs.
  m.players.forEach((p, i) => {
    if (p.left) return;
    const swing = p.input.move && !p.finished ? Math.sin(time * 18) * 8 : 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.immunity > time) ctx.globalAlpha = 0.65;
    ctx.strokeStyle = "#4c2d37";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 6, -18);
      ctx.lineTo(side * (7 + swing), -4);
      ctx.stroke();
    }
    ctx.fillStyle = colors[i % 4];
    ctx.beginPath();
    ctx.roundRect(-13, -38, 26, 24, 7);
    ctx.fill();
    ctx.fillStyle = "#fff0cf";
    ctx.fillRect(-3, -35, 6, 17);
    ctx.fillStyle = "#75462d";
    ctx.beginPath();
    ctx.arc(0, -49, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#292232";
    ctx.beginPath();
    ctx.ellipse(0, -59, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff8e4";
    ctx.beginPath();
    ctx.arc(-5, -49, 3, 0, Math.PI * 2);
    ctx.arc(6, -49, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#332b41";
    ctx.fillRect(-5, -50, 2, 3);
    ctx.fillRect(6, -50, 2, 3);
    ctx.strokeStyle = "#f4c496";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1, -45, 5, 0.15, 2.8);
    ctx.stroke();
    ctx.font = "bold 13px sans-serif";
    const width = ctx.measureText(p.name).width + 20;
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.id === userId ? "#fff5cf" : "#372953";
    ctx.beginPath();
    ctx.roundRect(-width / 2, -90, width, 23, 10);
    ctx.fill();
    ctx.fillStyle = p.id === userId ? "#372953" : "#fff5cf";
    ctx.textAlign = "center";
    ctx.fillText(p.name, 0, -74);
    ctx.restore();
  });
  ctx.restore();
}
