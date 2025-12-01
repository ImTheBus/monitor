// /monitor/assets/js/panels/panel-orbitalBand.js
export function initOrbitalPanel({ eventBus, stateStore, scheduler }) {
  const root = document.getElementById("panel-orbit");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  // Radar container
  const radar = document.createElement("div");
  radar.classList.add("orbit-radar");
  inner.appendChild(radar);

  const sweep = document.createElement("div");
  sweep.classList.add("orbit-sweep");
  radar.appendChild(sweep);

  const object = document.createElement("div");
  object.classList.add("orbit-object");
  radar.appendChild(object);

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
    const baseSpeed = 12; // deg per second
    const speedBoost = Math.min(mouseSpeed * 400, 40);
    const angle = (t * (baseSpeed + speedBoost)) % 360;

    sweep.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    // orbiting object
    const radius = 40;
    const objAngleRad = (t * 0.5) % (Math.PI * 2);
    const x = 50 + radius * Math.cos(objAngleRad);
    const y = 50 + radius * Math.sin(objAngleRad);

    object.style.left = `${x}%`;
    object.style.top = `${y}%`;

    // brightness by mode
    let color = "var(--clr-accent)";
    if (mode === "STORM") color = "var(--clr-danger)";
    if (mode === "OTHER") color = "var(--clr-base)";

    radar.style.boxShadow = `0 0 18px color-mix(in srgb, ${color} 30%, transparent)`;
  });
}
