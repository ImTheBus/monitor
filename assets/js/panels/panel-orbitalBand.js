// /monitor/assets/js/panels/panel-orbitalBand.js
// Orbital band: central radar + rich console, meters, corner readouts and radar effects.

export function initOrbitalPanel({ eventBus, stateStore, scheduler }) {
  const root = document.getElementById("panel-orbit");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  // --- Central radar shell -------------------------------------------------

  const radar = document.createElement("div");
  radar.classList.add("orbit-radar");
  inner.appendChild(radar);

  const radarFrame = document.createElement("div");
  radarFrame.classList.add("orbit-radar-frame");
  radar.appendChild(radarFrame);

  const radarRipple = document.createElement("div");
  radarRipple.classList.add("orbit-radar-ripple");
  radar.appendChild(radarRipple);

  const sweep = document.createElement("div");
  sweep.classList.add("orbit-sweep");
  radar.appendChild(sweep);

  const object = document.createElement("div");
  object.classList.add("orbit-object");
  radar.appendChild(object);

  // Radar dots (static flickering points, used for sweep interaction)
  const dotCount = 6;
  const dots = [];
  for (let i = 0; i < dotCount; i++) {
    const el = document.createElement("div");
    el.classList.add("orbit-dot");
    radar.appendChild(el);

    dots.push({
      el,
      angleDeg: Math.random() * 360,
      radius: 18 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      lastHit: 0
    });
  }

  // --- Footline telemetry block (bottom-left) ------------------------------

  const info = document.createElement("div");
  info.classList.add("orbit-info");
  inner.appendChild(info);

  const infoPrimary = document.createElement("div");
  infoPrimary.classList.add("orbit-info-line", "orbit-info-primary");
  info.appendChild(infoPrimary);

  const infoExtras = [];
  for (let i = 0; i < 6; i++) {
    const line = document.createElement("div");
    line.classList.add("orbit-info-line");
    line.textContent = "--";
    info.appendChild(line);
    infoExtras.push({ el: line, phase: Math.random() * Math.PI * 2 });
  }

  // --- Corner readouts -----------------------------------------------------

  function createCorner(posClass, label, valueText) {
    const wrap = document.createElement("div");
    wrap.classList.add("orbit-corner", posClass);

    const labelEl = document.createElement("span");
    labelEl.classList.add("orbit-corner-label");
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.classList.add("orbit-corner-value");
    valueEl.textContent = valueText;

    wrap.appendChild(labelEl);
    wrap.appendChild(valueEl);
    inner.appendChild(wrap);
    return { wrap, valueEl };
  }

  const cornerTL = createCorner("orbit-corner-tl", "REGIME", "LEO");
  const cornerTR = createCorner("orbit-corner-tr", "OBJECT", "A");
  const cornerBR = createCorner("orbit-corner-br", "LOCAL RANGE", "-- KM");
  // bottom-left visually covered by info block

  // --- Meters block (top-left, under corner TL) ----------------------------

  const metersBlock = document.createElement("div");
  metersBlock.classList.add("orbit-meters-block");
  inner.appendChild(metersBlock);

  function createMeter(labelText, initial) {
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
    bar.appendChild(fill);

    metersBlock.appendChild(meter);

    const value = Math.max(0, Math.min(initial, 1));
    fill.style.setProperty("--fill", String(value));

    return { meter, fill, value, target: value };
  }

  const meters = {
    stability: createMeter("STABILITY", 0.7),
    coverage: createMeter("COVERAGE", 0.5),
    latency: createMeter("LATENCY", 0.3),
    noise: createMeter("NOISE", 0.2),
    integrity: createMeter("INTEGRITY", 0.8)
  };

  function setMeterTarget(meterObj, target) {
    const v = Math.max(0, Math.min(target, 1));
    meterObj.target = v;
  }

  // --- Side console wrapper (top-right) ------------------------------------

  const consoleEl = document.createElement("div");
  consoleEl.classList.add("orbit-console");
  inner.appendChild(consoleEl);

  // 1) Indicator lights row
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

  // 2) Anomaly tiles grid
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

  // --- Bottom-right alert grid ---------------------------------------------

  const alertGrid = document.createElement("div");
  alertGrid.classList.add("orbit-alert-grid");
  inner.appendChild(alertGrid);

  const alertCells = [];
  const alertCols = 6;
  const alertRows = 4;

  for (let r = 0; r < alertRows; r++) {
    for (let c = 0; c < alertCols; c++) {
      const cell = document.createElement("div");
      cell.classList.add("orbit-alert-cell");
      alertGrid.appendChild(cell);
      alertCells.push({
        el: cell,
        phase: Math.random() * Math.PI * 2,
        lastHot: 0
      });
    }
  }

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

  function angleDiff(a, b) {
    let d = Math.abs(a - b) % 360;
    if (d > 180) d = 360 - d;
    return d;
  }

  eventBus.subscribe("data:iss:update", (payload) => {
    if (!payload) return;

    const now = performance.now();
    const { altitude, velocity, latitude, longitude } = payload;

    const alt = altitude.toFixed(1);
    const vel = velocity.toFixed(0);

    // Primary info line
    infoPrimary.textContent = `OBJECT A: ALT ${alt} KM | VEL ${vel} KM/H`;

    const distLocal = distanceKm(latitude, longitude, LOCAL_LAT, LOCAL_LON);
    cornerTR.valueEl.textContent = "A / 25544";
    cornerBR.valueEl.textContent = `${Math.round(distLocal)} KM`;

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

    const ageSec = dt || 0;

    // Tiles
    const trackLevel = ageSec < 20 ? "ok" : ageSec < 60 ? "warn" : "low";
    const trackText = ageSec < 20 ? "LOCKED" : ageSec < 60 ? "DRIFT" : "OBSCURED";
    updateTile(tiles.track, trackText, trackLevel);

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

    // Meter targets (slow, not too energetic)
    const dragIndex = Math.max(0, Math.min((420 - altitude) / 20, 1));

    setMeterTarget(
      meters.stability,
      Math.max(0.2, 0.85 - motionScore * 0.25 - dragIndex * 0.2)
    );
    setMeterTarget(
      meters.coverage,
      Math.max(0.1, Math.min(1, 1 - distLocal / 5000))
    );
    setMeterTarget(meters.latency, Math.max(0.05, Math.min(0.95, ageSec / 40)));

    // noise: mouse activity plus a little motion
    const noiseLevel = Math.max(
      0.05,
      Math.min(1, 0.15 + mouseSpeed * 3 + motionScore * 0.1)
    );
    setMeterTarget(meters.noise, noiseLevel);

    // integrity: inverse of latency + drag + noise
    const integrityBase = 0.9 - meters.latency.target * 0.4 - dragIndex * 0.2;
    setMeterTarget(meters.integrity, Math.max(0.1, Math.min(1, integrityBase)));

    // Extra info lines: slowly changing, text-focused
    const apogee = (altitude + 6.5).toFixed(1);
    const perigee = (altitude - 6.5).toFixed(1);
    const periodMin = (92 + dragIndex * 4).toFixed(1);
    const visCode = distLocal < 1000 ? "LOCAL" : distLocal < 3000 ? "REGION" : "HORIZON";

    const lines = [
      `APOGEE ${apogee} KM | PERIGEE ${perigee} KM`,
      `RANGE ${Math.round(distLocal)} KM | VIS ${visCode}`,
      `ORBIT PERIOD ${periodMin} MIN`,
      `NODE ROUGVIE | MODE ${mode}`,
      `DRAG INDEX ${(dragIndex * 1.7).toFixed(2)}`,
      `NOISE ${Math.round(noiseLevel * 100)
        .toString()
        .padStart(2, "0")}%`
    ];

    infoExtras.forEach((obj, idx) => {
      obj.el.textContent = lines[idx] || "--";
    });

    // Regime label small change with altitude
    let regime = "LEO";
    if (altitude > 2000) regime = "MEO";
    if (altitude > 35000) regime = "GEO";
    cornerTL.valueEl.textContent = regime;
  });

  // --- Animation loop for radar, meters, alerts and flashing text ----------

  let lastHitTime = 0;

  scheduler.registerAnimation((ts) => {
    const t = ts / 1000;
    const baseSpeed = 12;
    const speedBoost = Math.min(mouseSpeed * 400, 40);
    const angle = (t * (baseSpeed + speedBoost)) % 360;

    // Sweep rotation
    sweep.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    // Object orbit path
    const altNorm = lastIss
      ? Math.max(0, Math.min(lastIss.altitude / 600, 1))
      : 0.7;
    const radius = 30 + altNorm * 20;

    const objAngleRad = (t * 0.35) % (Math.PI * 2);
    const x = 50 + radius * Math.cos(objAngleRad);
    const y = 50 + radius * Math.sin(objAngleRad);

    object.style.left = `${x}%`;
    object.style.top = `${y}%`;

    // Dots: flicker and position; sweep interaction detection
    let anyHit = false;
    const hitThreshold = 3; // degrees

    dots.forEach((d) => {
      const aRad = (d.angleDeg * Math.PI) / 180;
      const dx = 50 + d.radius * Math.cos(aRad);
      const dy = 50 + d.radius * Math.sin(aRad);

      d.el.style.left = `${dx}%`;
      d.el.style.top = `${dy}%`;

      const flicker = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.3 + d.phase));
      d.el.style.opacity = flicker.toFixed(2);

      const diff = angleDiff(angle, d.angleDeg);
      if (diff < hitThreshold) {
        anyHit = true;
        d.lastHit = ts;
      }

      if (ts - d.lastHit < 250) {
        d.el.classList.add("orbit-dot-hit");
      } else {
        d.el.classList.remove("orbit-dot-hit");
      }

      if (Math.random() < 0.0008) {
        d.angleDeg = (d.angleDeg + (Math.random() * 40 - 20) + 360) % 360;
        d.radius = 18 + Math.random() * 22;
      }
    });

    if (anyHit) {
      lastHitTime = ts;
    }

    // Sweep flash + center ripple when hitting a dot
    if (ts - lastHitTime < 220) {
      sweep.classList.add("orbit-sweep-hit");
      radarRipple.classList.add("orbit-radar-ripple-active");
    } else {
      sweep.classList.remove("orbit-sweep-hit");
      radarRipple.classList.remove("orbit-radar-ripple-active");
    }

    // Radar color by mode
    let color = "var(--clr-accent)";
    if (mode === "STORM") color = "var(--clr-danger)";
    if (mode === "OTHER") color = "var(--clr-base)";
    radar.style.boxShadow = `0 0 18px color-mix(in srgb, ${color} 30%, transparent)`;

    // Meters: ease towards target + colour levels
    Object.values(meters).forEach((m) => {
      const lerpFactor = 0.05; // gentle motion
      m.value += (m.target - m.value) * lerpFactor;
      const val = Math.max(0, Math.min(m.value, 1));
      m.fill.style.setProperty("--fill", val.toFixed(3));

      let level = "mid";
      if (val > 0.78) level = "high";
      else if (val < 0.22) level = "low";
      m.meter.dataset.level = level;
    });

    // Alert grid: dim flash everywhere, random bright red flashes
    const hitBoost = ts - lastHitTime < 400;
    alertCells.forEach((cell) => {
      const flicker =
        0.25 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3 + cell.phase));
      cell.el.style.opacity = flicker.toFixed(2);

      const hotChance = hitBoost ? 0.02 : 0.004;
      if (Math.random() < hotChance) {
        cell.lastHot = ts;
      }

      if (ts - cell.lastHot < 220) {
        cell.el.classList.add("orbit-alert-hot");
      } else {
        cell.el.classList.remove("orbit-alert-hot");
      }
    });

    // Info extra lines: subtle colour flashes based on radar activity
    const dtHit = ts - lastHitTime;
    infoExtras.forEach((obj, idx) => {
      const el = obj.el;
      el.classList.remove("orbit-info-hot", "orbit-info-cold");

      if (dtHit < 350 && idx % 2 === 0) {
        el.classList.add("orbit-info-hot"); // red/white pulse
      } else if (dtHit < 1600 && idx % 3 === 0) {
        el.classList.add("orbit-info-cold"); // blue-ish
      }
    });
  });
}
