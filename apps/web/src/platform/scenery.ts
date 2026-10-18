// Decorative layers stay behind collision surfaces and players.
export function festivalScenery(
  ctx: CanvasRenderingContext2D,
  camera: number,
  width: number,
  time: number,
) {
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    r = 0,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const line = (
    x: number,
    y: number,
    xx: number,
    yy: number,
    color: string,
    w = 2,
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(xx, yy);
    ctx.stroke();
  };
  for (let i = 0; i < 20; i++) {
    const x = i * 200 + 90;
    if (x < camera - 220 || x > camera + width + 180) continue;
    // Branching palms frame the streets; individual leaflets break up the silhouette.
    if (i % 3 === 0) {
      line(x + 32, 437, x + 22, 215, "#765346", 10);
      for (let k = 0; k < 5; k++)
        line(x + 23 + k, 250 + k * 30, x + 30 + k, 246 + k * 30, "#ab7c55", 3);
      for (let leaf = 0; leaf < 7; leaf++) {
        const angle = (leaf * Math.PI) / 6 + Math.PI;
        const dx = Math.cos(angle) * 65,
          dy = Math.sin(angle) * 40;
        ctx.strokeStyle = leaf % 2 ? "#32857a" : "#3b9b80";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(x + 22, 215);
        ctx.quadraticCurveTo(
          x + 22 + dx * 0.55,
          180 + dy,
          x + 22 + dx,
          222 + dy,
        );
        ctx.stroke();
        for (let n = 1; n < 5; n++)
          line(
            x + 22 + (dx * n) / 5,
            200 + (dy * n) / 5,
            x + 20 + (dx * n) / 5 - 8,
            218 + (dy * n) / 5,
            "#4da48a",
            3,
          );
      }
    }
    if (x < 1250) {
      // Produce stalls, striped scalloped canopies, stacked woven baskets.
      rect(x - 40, 363, 100, 10, "#65435a", 3);
      rect(x - 35, 373, 6, 66, "#765147");
      rect(x + 48, 373, 6, 66, "#765147");
      rect(x - 47, 316, 114, 9, "#f7d594", 4);
      for (let j = 0; j < 8; j++)
        rect(
          x - 47 + j * 14,
          325,
          15,
          25,
          j % 2 ? "#fff0bf" : "#e87072",
          [4][0],
        );
      rect(x - 40, 397, 100, 37, "#b47453", 5);
      for (let j = 0; j < 5; j++) {
        line(x - 35, 405 + j * 5, x + 55, 405 + j * 5, "#d89d69");
        for (let k = 0; k < 3; k++)
          ellipse(
            x - 26 + j * 17,
            388 - k * 9,
            8,
            7,
            ["#e8b649", "#e98652", "#79a954"][j % 3],
          );
      }
      rect(x - 22, 419, 64, 17, "#493c53", 3);
      ctx.fillStyle = "#ffe3a2";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(i % 2 ? "FRESH FRUIT" : "SUYA SPOT", x - 18, 431);
    } else if (x < 2500) {
      // Quayside bollards, mooring ropes, pirogues and white sails.
      const bob = Math.sin(time * 1.3 + i) * 2;
      ctx.fillStyle = i % 2 ? "#efb35f" : "#d27867";
      ctx.beginPath();
      ctx.moveTo(x - 60, 480 + bob);
      ctx.quadraticCurveTo(x, 527 + bob, x + 66, 480 + bob);
      ctx.closePath();
      ctx.fill();
      line(x, 485 + bob, x, 385 + bob, "#b8916b", 4);
      ctx.fillStyle = "#f8e6b7";
      ctx.beginPath();
      ctx.moveTo(x - 5, 390 + bob);
      ctx.lineTo(x - 5, 466 + bob);
      ctx.lineTo(x - 49, 466 + bob);
      ctx.closePath();
      ctx.fill();
      rect(x + 56, 410, 10, 30, "#4b5260", 4);
      ellipse(x + 61, 410, 12, 5, "#d4c4a1");
      line(x + 61, 414, x + 115, 424, "#d8c195", 3);
      ellipse(x + 10, 517, 58, 2, "#8ed5c277");
    } else {
      // Rooftop music equipment and terraces.
      rect(x - 35, 368, 35, 68, "#343048", 5);
      ellipse(x - 18, 388, 10, 10, "#62576f");
      ellipse(x - 18, 414, 12, 12, "#171e35");
      rect(x + 8, 388, 39, 42, "#d98658", 5);
      ellipse(x + 27, 387, 23, 7, "#f4d5aa");
      for (let k = 0; k < 5; k++)
        line(x + 11 + k * 7, 393, x + 15 + k * 7, 426, "#f5c483");
      line(x + 70, 438, x + 70, 367, "#526071", 3);
      ellipse(x + 70, 367, 18, 4, "#eed37f");
      line(x - 55, 287, x + 95, 287, "#ead7b0", 3);
      for (let k = 0; k < 8; k++)
        line(x - 55 + k * 21, 287, x - 55 + k * 21, 317, "#ead7b0", 3);
    }
    // Animated background neighbours, small enough to remain distinct from players.
    const nx = x + 110,
      sway = Math.sin(time * 2 + i) * 2;
    ellipse(nx, 438, 14, 3, "#342d4a44");
    line(nx - 4, 431, nx - 6, 439, "#483849", 4);
    line(nx + 4, 431, nx + 6, 439, "#483849", 4);
    rect(
      nx - 10,
      402 + sway,
      20,
      30,
      "#" + ["46a995", "b475be", "e8ad57"][i % 3],
      6,
    );
    ellipse(nx, 394 + sway, 9, 11, "#805137");
    ellipse(nx, 385 + sway, 11, 5, "#392c3f");
    line(nx - 9, 409 + sway, nx - 16, 419 + sway, "#805137", 4);
    line(nx + 9, 409 + sway, nx + 17, 400 + sway, "#805137", 4);
    // Brass street lamps with warm lanterns.
    if (i % 2) {
      line(x + 84, 440, x + 84, 276, "#504759", 4);
      rect(x + 74, 277, 20, 25, "#ffe0a2", 5);
      rect(x + 71, 272, 26, 7, "#504759", 4);
    }
  }
}
