// /monitor/assets/js/panels/panel-realityBand.js
export function initRealityPanel({ eventBus, stateStore, scheduler }) {
  const root = document.getElementById("panel-reality");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  const cells = [];
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.classList.add("reality-cell");
    inner.appendChild(cell);
    cells.push(cell);
  }

  let mouseSpeed = 0;
  let mode = "CALM";
  let quakeIntensity = 0; // 0–1, derived from maxMag

  eventBus.subscribe("mouse:move", ({ speed }) => {
    mouseSpeed = speed;
  });

  stateStore.subscribe((state) => {
    mode = state.mode || "CALM";
  });

  eventBus.subscribe("data:quakes:update", ({ maxMag }) => {
    if (typeof maxMag === "number") {
      // map mag 0–6+ to 0–1
      const norm = Math.max(0, Math.min(maxMag / 6, 1));
      quakeIntensity = norm;

      // small global flash when we see a stronger quake
      if (norm > 0.4) {
        root.style.transform = "translateY(-1px)";
        setTimeout(() => {
          root.style.transform = "";
        }, 80);
      }
    }
  });

  scheduler.registerAnimation((ts) => {
    const t = ts / 1000;
    const base = Math.min(mouseSpeed * 80, 2.0);
    const quakeBoost = quakeIntensity * 1.2;

    cells.forEach((cell, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const phase = row * 0.7 + col * 0.4;
      const pulse =
        0.5 +
        0.5 *
          Math.sin(
            t * (0.6 + base + quakeBoost) + phase + quakeBoost * 2
          );
      const intensity = 0.2 + pulse * (0.6 + quakeBoost * 0.8);

      let color = "var(--clr-base)";
      if (mode === "STORM") color = "var(--clr-danger)";
      if (mode === "OTHER") color = "var(--clr-accent)";

      cell.style.background = `color-mix(in srgb, ${color} ${intensity *
        80}%, transparent)`;
      cell.style.boxShadow = `0 0 8px color-mix(in srgb, ${color} ${intensity *
        60}%, transparent)`;
    });
  });
}
