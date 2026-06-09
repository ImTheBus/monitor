// SUBSTRATE SPECTRUM — mirrored spectrum-analyser bars + baseline.
// Idles on a synthetic carrier; live telemetry (ISS velocity drift,
// seismic peak) nudges the envelope so it feels reactive.
export function initSubstratePanel({ eventBus, stateStore, scheduler }) {
  const root = document.getElementById("panel-substrate");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  const barWrap = document.createElement("div");
  barWrap.classList.add("substrate-bars");
  inner.appendChild(barWrap);

  const baseline = document.createElement("div");
  baseline.classList.add("substrate-baseline");
  inner.appendChild(baseline);

  const bars = [];
  const barCount = 22;
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.classList.add("substrate-bar");
    barWrap.appendChild(bar);
    bars.push(bar);
  }

  let mouseSpeed = 0;
  let mode = "CALM";
  let telemetryBoost = 0; // decays over time, pumped by data events

  eventBus.subscribe("mouse:move", ({ speed }) => { mouseSpeed = speed; });
  stateStore.subscribe((s) => { mode = s.mode || "CALM"; });

  eventBus.subscribe("data:iss:update", () => { telemetryBoost = Math.min(telemetryBoost + 0.25, 0.6); });
  eventBus.subscribe("data:quakes:update", ({ maxMag }) => {
    if (typeof maxMag === "number") telemetryBoost = Math.min(telemetryBoost + maxMag / 12, 0.8);
  });

  scheduler.registerAnimation((ts) => {
    const t = ts / 1000;
    telemetryBoost *= 0.992; // gentle decay
    const baseNoise = 0.32 + 0.14 * Math.sin(t * 0.4);
    const speedFactor = Math.min(mouseSpeed * 22, 1.1);
    const stormBoost = mode === "STORM" ? 0.35 : 0;
    const mid = (barCount - 1) / 2;

    bars.forEach((bar, idx) => {
      // mirrored envelope: louder toward the centre
      const fromCentre = 1 - Math.abs(idx - mid) / mid;
      const phase = idx * 0.41;
      const local = 0.5 + 0.5 * Math.sin(t * (0.9 + speedFactor) + phase);
      const h = baseNoise + local * 0.45 * (0.5 + fromCentre * 0.7) + stormBoost + telemetryBoost * fromCentre;
      bar.style.setProperty("--height-factor", Math.max(0.06, Math.min(h, 1)).toFixed(3));
    });
  });
}
