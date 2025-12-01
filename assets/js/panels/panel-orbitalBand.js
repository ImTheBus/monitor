// /monitor/assets/js/panels/panel-orbitalBand.js
// Orbital band: central radar + side console of anomaly tiles, lights and meters.

export function initOrbitalPanel({ eventBus, stateStore, scheduler }) {
  const root = document.getElementById("panel-orbit");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  // --- Central radar -------------------------------------------------------

  const radar = document.createElement("div");
  radar.classList.add("orbit-radar");
  inner.appendChild(radar);

  const sweep = document.createElement("div");
  sweep.classList.add("orbit-sweep");
  radar.appendChild(sweep);

  const object = document.createElement("div");
  object.classList.add("orbit-object");
  radar.appendChild(object);

  // --- Footline telemetry --------------------------------------------------

  const info = document.createElement("div");
  info.classList.add("orbit-info");
  inner.appendChild(info);

  // --- Side console wrapper -----------------------------------------------

  const consoleEl = document.createElement("div");
  consoleEl.classList.add("orbit-console");
  inner.appendChild(consoleEl);

  // 1) Indicator lights row (top)
  const lightsRow = document.createElement("div");
  lightsRow.classList.add("orbit-lights-row");
  consoleEl.appendChild(lightsRow);

  const lightLabels = ["LINK", "SYNC", "ALT", "VEC", "GATE", "OTHER"];
  lightLabels.forEach((label) => {
    const light = document.createElement("div");
    light.classList.add("orbit-light");

    const led = document.createElement("div");
    led.classList.add("orbit-light-led");
    light.appendChild(led);

    const text = document.createElement("div");
    text.classList.add("orbit-light-label");
    text.textContent = label;
    light.appendChild(text);

    lightsRow.appendChild(light);
  });

  // 2) Anomaly tiles grid (middle)
  const tilesGrid = document.createElement("div");
  tilesGrid.classList.add("orbit-tiles-grid");
  consoleEl.appendChild(tilesGrid);

  function createTile(key, labelText) {
    const tile = document.createElement("div");
    tile.classList.add("orbit-tile");
    tile.dataset.level = "low";

    const header = document.createElement("div");
    header.classList.add("orbit-tile-header");
    header.textContent = labelText;
    tile.appendChild(header);

    const body = document.createElement("div");
    body.classList.add("orbit-tile-body");
    tile.appendChild(body);

    const iconWrap = document.createElement("div");
    iconWrap.classList.add("orbit-icon");
    body.appendChild(iconWrap);

    const value = document.createElement("div");
    value.classList.add("orbit-tile-value");
    value.textContent = "--";
    body.appendChild(value);

    tilesGrid.appendChild(tile);

    return { tile, value, iconWrap };
  }

  const tiles = {
    track: createTile("track", "TRACK"),
    pass: createTile("pass", "PASS WINDOW"),
    drag: createTile("drag", "DRAG"),
    motion: createTile("motion", "MOTION")
  };

  function updateTile(tileRef, text, level) {
    if (!tileRef) return;
    tileRef.value.textContent = text;
    tileRef.tile.dataset.level = level || "low";
  }

  // 3) Meters row (bottom)
  const metersRow = document.createElement("div");
  metersRow.classList.add("orbit-meters-row");
  consoleEl.appendChild(metersRow);

  function createMeter(labelText, fillFraction) {
    const meter = document.createElement("div");
    meter.classList.add("orbit-meter");

    const label = document.createElement("div");
    label.classList.add("orbit-meter-label");
    label.textContent = labelText;
    meter.appendChild(label);

    const bar = document.createElement("div");
    bar.classList.add("orbit-meter-bar");
    meter.appendChild(bar);

    const fill = document.createElement("div");
    fill.classList.add("orbit-meter-fill");
    fill.style.setProperty("--fill", String(Math.max(0, Math.min(fillFraction, 1))));
    bar.appendChild(fill);

    metersRow.appendChild(meter);

    return { meter, fill };
  }

  // For now these are mostly decorative; we can wire the fills later
  const meters = {
    stability: createMeter("STABILITY", 0.7),
    coverage: createMeter("COVERAGE", 0.5),
    latency: createMeter("LATENCY", 0.3)
  };

  // --- State & data --------------------------------------------------------

  let mouseSpeed = 0;
  let mode = "CALM";

  let lastIss = null;
  let lastIssTime = null;

  eventBus.subscribe("mouse:move", ({ speed }) => {
    mouseSpeed = speed;
  });

  stateStore.subscribe((state) => {
    mode = state.mode || "CALM";
  });

  // rough position for Edinburgh for "local" pass logic
  const LOCAL_LAT = 55.95;
  const LOCAL_LON = -3.2;

  function toRad(v) {
    return (v * Math.PI) / 180;
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  eventBus.subscribe("data:iss:update", (payload) => {
    if (!payload) return;

    const now = performance.now();
    const { altitude, velocity, latitude, longitude } = payload;

    // Telemetry line
    const alt = altitude.toFixed(1);
    const vel = velocity.toFixed(0);
    info.textContent = `OBJECT A: ALT ${alt} KM | VEL ${vel} KM/H`;

    // Derive simple anomaly-ish metrics
    let dAlt = 0;
    let dVel = 0;
    let dt = 0;

    if (lastIss && lastIssTime != null) {
      dAlt = Math.abs(altitude - lastIss.altitude);
      dVel = Math.abs(velocity - lastIss.velocity);
      dt = (now - lastIssTime) / 1000; // seconds
    }

    lastIss = payload;
    lastIssTime = now;

    const distLocal = distanceKm(latitude, longitude, LOCAL_LAT, LOCAL_LON);

    // TRACK tile: based on recency of data
    const ageSec = dt || 0;
    const trackLevel = ageSec < 20 ? "ok" : ageSec < 60 ? "warn" : "low";
    const trackText = ageSec < 20 ? "LOCKED" : ageSec < 60 ? "DRIFT" : "OBSCURED";
    updateTile(tiles.track, trackText, trackLevel);

    // PASS WINDOW tile: how close to local point
    let passText = "IDLE";
    let passLevel = "low";
    if (distLocal < 800) {
      passText = "LOCAL";
      passLevel = "high";
    } else if (distLocal < 2000) {
      passText = "REGION";
      passLevel = "ok";
    }
    updateTile(tiles.pass, passText, passLevel);

    // DRAG tile: simple heuristic from altitude
    let dragText = "LOW";
    let dragLevel = "ok";
    if (altitude < 410) {
      dragText = "HIGH";
      dragLevel = "high";
    } else if (altitude < 420) {
      dragText = "MED";
      dragLevel = "warn";
    }
    updateTile(tiles.drag, dragText, dragLevel);

    // MOTION tile: mix of change in alt/vel over time
    const motionScore = dt > 0 ? (dAlt + dVel / 200) / dt : 0;
    let motionText = "STEADY";
    let motionLevel = "low";
    if (motionScore > 1.0) {
      motionText = "AGITATED";
      motionLevel = "high";
    } else if (motionScore > 0.3) {
      motionText = "SHIFTING";
      motionLevel = "warn";
    }
    updateTile(tiles.motion, motionText, motionLevel);

    // Very light touch on meters for now, just to show some motion.
    // We can replace this with real mapping later.
    meters.stability.fill.style.setProperty(
      "--fill",
      String(Math.max(0.3, Math.min(0.9, 0.8 - motionScore * 0.2)))
    );
    meters.coverage.fill.style.setProperty(
      "--fill",
      String(Math.max(0.2, Math.min(1, 1 - distLocal / 5000)))
    );
    meters.latency.fill.style.setProperty(
      "--fill",
      String(Math.max(0.1, Math.min(0.9, ageSec / 40)))
    );
  });

  // --- Animation loop for radar -------------------------------------------

  scheduler.registerAnimation((ts) => {
    const t = ts / 1000;
    const baseSpeed = 12;
    const speedBoost = Math.min(mouseSpeed * 400, 40);
    const angle = (t * (baseSpeed + speedBoost)) % 360;

    sweep.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    const altNorm = lastIss
      ? Math.max(0, Math.min(lastIss.altitude / 600, 1))
      : 0.7;
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
