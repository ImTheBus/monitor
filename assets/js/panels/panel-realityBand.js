// SEISMIC LATTICE — driven by live USGS quake feed.
// A 4x4 phosphor lattice ripples; intensity scales with strongest live quake.
export function initRealityPanel({ eventBus, stateStore, scheduler }) {
  const root = document.getElementById("panel-reality");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  const grid = document.createElement("div");
  grid.classList.add("seismic-grid");
  inner.appendChild(grid);

  const cells = [];
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement("div");
    cell.classList.add("reality-cell");
    grid.appendChild(cell);
    cells.push(cell);
  }

  // Readout row: live event count + strongest magnitude
  const readout = document.createElement("div");
  readout.classList.add("seismic-readout");
  const evtEl = document.createElement("span");
  evtEl.innerHTML = "EVENTS/HR <b>--</b>";
  const magEl = document.createElement("span");
  magEl.innerHTML = "PEAK&nbsp;M <b>--</b>";
  readout.appendChild(evtEl);
  readout.appendChild(magEl);
  inner.appendChild(readout);

  let mouseSpeed = 0;
  let mode = "CALM";
  let quakeIntensity = 0; // 0..1 from maxMag

  eventBus.subscribe("mouse:move", ({ speed }) => { mouseSpeed = speed; });
  stateStore.subscribe((s) => { mode = s.mode || "CALM"; });

  eventBus.subscribe("data:quakes:update", ({ count, maxMag }) => {
    if (typeof maxMag === "number") {
      quakeIntensity = Math.max(0, Math.min(maxMag / 6, 1));
      magEl.querySelector("b").textContent = maxMag.toFixed(1);
      magEl.classList.toggle("is-high", maxMag >= 5);
      if (quakeIntensity > 0.4) {
        root.style.setProperty("--shake", "1");
        root.animate(
          [{ transform: "translateX(-1px)" }, { transform: "translateX(1px)" }, { transform: "translateX(0)" }],
          { duration: 120 }
        );
      }
    }
    if (typeof count === "number") evtEl.querySelector("b").textContent = String(count);
  });

  // Degraded marker — if the feed never reports, the LED stays red (set in data module)
  scheduler.registerAnimation((ts) => {
    const t = ts / 1000;
    const base = Math.min(mouseSpeed * 60, 1.6);
    const quakeBoost = quakeIntensity * 1.2;

    cells.forEach((cell, idx) => {
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      // ripple radiates from grid centre
      const dx = col - 1.5, dy = row - 1.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pulse = 0.5 + 0.5 * Math.sin(t * (0.6 + base + quakeBoost) - dist * 1.1 + quakeBoost * 2);
      const intensity = 0.15 + pulse * (0.55 + quakeBoost * 0.85);

      let color = "var(--clr-base)";
      if (mode === "STORM") color = "var(--clr-danger)";
      if (mode === "OTHER") color = "var(--clr-accent)";

      cell.style.background = `color-mix(in srgb, ${color} ${intensity * 78}%, transparent)`;
      cell.style.boxShadow = `inset 0 0 0 1px color-mix(in srgb, ${color} 18%, transparent), 0 0 8px color-mix(in srgb, ${color} ${intensity * 55}%, transparent)`;
    });
  });
}
