// /monitor/assets/js/panels/panel-substrateBand.js
export function initSubstratePanel({ eventBus, stateStore, scheduler }) {
  const root = document.getElementById("panel-substrate");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  const barWrap = document.createElement("div");
  barWrap.classList.add("substrate-bars");
  inner.appendChild(barWrap);

  const bars = [];
  const barCount = 18;
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.classList.add("substrate-bar");
    barWrap.appendChild(bar);
    bars.push(bar);
  }

  let mouseSpeed = 0;
  let mode = "CALM";

  eventBus.subscribe("mouse:move", ({ speed }) => {
    mouseSpeed = speed;
  });

  stateStore.subscribe((state) => {
    mode = state.mode || "CALM";
  });

  scheduler.registerAnimation((ts) => {
    const t = ts / 1000;
    const baseNoise = 0.35 + 0.15 * Math.sin(t * 0.4);
    const speedFactor = Math.min(mouseSpeed * 25, 1.2);
    const stormBoost = mode === "STORM" ? 0.4 : 0;
    const otherBoost = mode === "OTHER" ? 0.25 : 0;

    bars.forEach((bar, idx) => {
      const phase = idx * 0.37;
      const local = 0.5 + 0.5 * Math.sin(t * (0.9 + speedFactor) + phase);
      const heightFactor =
        baseNoise + local * 0.5 + stormBoost + otherBoost * ((idx % 3) / 3);

      const clamped = Math.max(0.08, Math.min(heightFactor, 1));
      bar.style.setProperty("--height-factor", clamped.toString());
    });
  });
}
