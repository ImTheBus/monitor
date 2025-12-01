// /monitor/assets/js/panels/panel-orbitalBand.js
export function initOrbitalPanel({ eventBus, stateStore, scheduler }) {
  const root = document.getElementById("panel-orbit");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  const radar = document.createElement("div");
  radar.classList.add("orbit-radar");
  inner.appendChild(radar);

  const sweep = document.createElement("div");
  sweep.classList.add("orbit-sweep");
  radar.appendChild(sweep);

  const object = document.createElement("div");
  object.classList.add("orbit-object");
  radar.appendChild(object);

  const info = document.createElement("div");
  info.classList.add("orbit-info");
  inner.appendChild(info);

  let mouseSpeed = 0;
  let mode = "CALM";
  let lastIss = { altitude: 0, velocity: 0 };

  eventBus.subscribe("mouse:move", ({ speed }) => {
    mouseSpeed = speed;
  });

  stateStore.subscribe((state) => {
    mode = state.mode || "CALM";
  });

  eventBus.subscribe("data:iss:update", (payload) => {
    if (!payload) return;
    lastIss = payload;
    const alt = payload.altitude.toFixed(1);
    const vel = payload.velocity.toFixed(0);
    info.textContent = `OBJECT A: alt ${alt} km | vel ${vel} km/h`;
  });

  scheduler.registerAnimation((ts) => {
    const t = ts / 1000;
    const baseSpeed = 12;
    const speedBoost = Math.min(mouseSpeed * 400, 40);
    const angle = (t * (baseSpeed + speedBoost)) % 360;

    sweep.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    // map altitude to orbital radius (visual only)
    const altNorm = Math.max(0, Math.min(lastIss.altitude / 600, 1)); // 0–600 km
    const radius = 30 + altNorm * 20;

    const objAngleRad = (t * 0.35) % (Math.PI * 2);
    const x = 50 + radius * Math.cos(objAngleRad);
    const y = 50 + radius * Math.sin(objAngleRad);

    object.style.left = `${x}%`;
    object.style.top = `${y}%`;

    let color = "var(--clr-accent)";
    if (mode === "STORM") color = "var(--clr-danger)";
    if (mode === "OTHER") color = "var(--clr-base)";

    radar.style.boxShadow = `0 0 18px color-mix(in srgb, ${color} 30%, transparent)`;
  });
}
