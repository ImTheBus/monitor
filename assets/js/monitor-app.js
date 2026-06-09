// /monitor/assets/js/monitor-app.js
// ROUGVIE ORBITAL COMMAND — orchestration.
import { createEventBus } from "./core/eventBus.js";
import { createStateStore } from "./core/stateStore.js";
import { createScheduler } from "./core/scheduler.js";
import { initMouseTracker } from "./core/mouseTracker.js";
import { initUiControls } from "./core/uiControls.js";
import { createGlitchEngine } from "./core/glitchEngine.js";
import { createTextEngine } from "./core/textEngine.js";

import { initRealityPanel } from "./panels/panel-realityBand.js";
import { initLogPanel } from "./panels/panel-logBand.js";
import { initOrbitalPanel } from "./panels/panel-orbitalBand.js";
import { initSubstratePanel } from "./panels/panel-substrateBand.js";

import { initIssData } from "./data/data-iss.js";
import { initEarthquakeData } from "./data/data-earthquakes.js";

import { monitorConfig } from "./monitor-config.js";

const REDUCED_MOTION =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const eventBus = createEventBus();
const stateStore = createStateStore({
  aboutMode: false,
  showSourcesOverlay: false,
  themeIndex: 0,
  mode: "CALM",
  cycle: 0
});
const scheduler = createScheduler();
const glitchEngine = createGlitchEngine(eventBus);
const textEngine = createTextEngine();

initMouseTracker(eventBus, document);
initUiControls(eventBus, stateStore);

/* ---- theme cycle -------------------------------------------------- */
eventBus.subscribe("ui:cycleTheme", () => {
  const { themeIndex = 0 } = stateStore.getState();
  const next = (themeIndex + 1) % monitorConfig.themes;
  stateStore.setState({ themeIndex: next });
  document.body.classList.remove("theme-0", "theme-1", "theme-2", "theme-3");
  document.body.classList.add(`theme-${next}`);
  eventBus.publish("log:newEvent",
    `${nowTime()} - phosphor tube swapped // ${monitorConfig.themeNames[next]}`);
});

/* ---- about overlay ------------------------------------------------ */
const ABOUT_TEXT =
  "<strong>ROUGVIE ORBITAL COMMAND</strong><br/><br/>" +
  "An ambient command-monitor art piece. The PRIME panel tracks the " +
  "International Space Station (object 25544) in real time; the flanking " +
  "panels render live global seismic activity and a reactive substrate " +
  "spectrum. No accounts, no trackers, no stored data &mdash; just the " +
  "planet, watched from a darkened room.";

eventBus.subscribe("ui:toggleAbout", () => {
  const { aboutMode = false } = stateStore.getState();
  const next = !aboutMode;
  stateStore.setState({ aboutMode: next });
  const overlay = document.querySelector("#panel-orbit .panel-overlay-about");
  if (!overlay) return;
  if (next) {
    overlay.innerHTML = ABOUT_TEXT;
    overlay.classList.add("panel-overlay-visible");
  } else {
    overlay.classList.remove("panel-overlay-visible");
  }
});

/* ---- sources overlay ---------------------------------------------- */
const SOURCE_TEXT = {
  "panel-orbit":
    "FEED // wheretheiss.at — live ISS state vector (lat, lon, altitude, velocity). Public, keyless.",
  "panel-reality":
    "FEED // USGS earthquake.usgs.gov — all events, past hour, GeoJSON. Public, keyless.",
  "panel-substrate":
    "DERIVED // synthetic substrate carrier, modulated by live ISS + seismic telemetry.",
  "panel-log":
    "DERIVED // event trace synthesised locally from feed transitions and console activity."
};
eventBus.subscribe("ui:toggleSources", () => {
  const { showSourcesOverlay = false } = stateStore.getState();
  const next = !showSourcesOverlay;
  stateStore.setState({ showSourcesOverlay: next });
  document.querySelectorAll(".panel").forEach((panel) => {
    const overlay = panel.querySelector(".panel-overlay-sources");
    if (!overlay) return;
    if (next) {
      overlay.textContent = SOURCE_TEXT[panel.id] || "DERIVED // local synthesis.";
      overlay.classList.add("panel-overlay-visible");
    } else {
      overlay.classList.remove("panel-overlay-visible");
    }
  });
});

/* ---- helpers ------------------------------------------------------ */
function nowTime() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

/* ---- cycle counter + footer clock --------------------------------- */
scheduler.registerPoller("cycleCounter", () => {
  const next = (stateStore.getState().cycle ?? 0) + 1;
  stateStore.setState({ cycle: next });
  const counterEl = document.querySelector("#cycle-counter b");
  if (counterEl) counterEl.textContent = String(next).padStart(6, "0");
}, monitorConfig.pollIntervals.cycleCounterMs);

setInterval(() => {
  const t = document.getElementById("footer-time");
  if (t) t.textContent = nowTime();
}, 1000);

/* ---- synthetic heartbeat log -------------------------------------- */
scheduler.registerPoller("fakeLog", () => {
  const kind = Math.random() > 0.85 ? "mouseSpike" : "heartbeat";
  eventBus.publish("log:newEvent", textEngine.createLogEntry(kind, {}));
}, monitorConfig.pollIntervals.fakeLogMs);

eventBus.subscribe("mouse:click", () => {
  if (Math.random() < 0.18) {
    eventBus.publish("log:newEvent", textEngine.createLogEntry("mouseSpike", {}));
    if (!REDUCED_MOTION) glitchEngine.globalJitter(100);
  }
});

/* ---- feed status -> LEDs, footer counter, anomaly state ----------- */
const feedState = { iss: "init", quakes: "init" };

function ledFor(feed) {
  return document.querySelector(`.panel-led[data-feed="${feed}"]`);
}
function refreshFooterFeeds() {
  const live = monitorConfig.feeds.filter((f) => feedState[f] === "live").length;
  const total = monitorConfig.feeds.length;
  const el = document.querySelector("#footer-feed b");
  if (el) el.textContent = `${live}/${total} LIVE`;
}
function refreshStatus() {
  const anyDegraded = monitorConfig.feeds.some((f) => feedState[f] === "degraded");
  const anyLive = monitorConfig.feeds.some((f) => feedState[f] === "live");
  const ind = document.getElementById("status-indicator");
  const b = ind && ind.querySelector("b");
  if (!ind || !b) return;
  if (anyDegraded) { ind.dataset.state = "anomaly"; b.textContent = "ANOMALY"; setMode("STORM"); }
  else if (anyLive) { ind.dataset.state = "online"; b.textContent = "NOMINAL"; setMode("CALM"); }
}

let currentMode = "CALM";
function setMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;
  stateStore.setState({ mode });
  const f = document.querySelector("#footer-mode b");
  if (f) f.textContent = mode;
  eventBus.publish("log:newEvent", {
    text: textEngine.createLogEntry("modeChange", { mode }),
    alert: mode === "STORM"
  });
}

eventBus.subscribe("data:feed:status", ({ feed, status }) => {
  feedState[feed] = status;
  const led = ledFor(feed);
  if (led) led.dataset.status = status;
  refreshFooterFeeds();
  refreshStatus();
});

// derived-feed LEDs: trace + local substrate are always "live" once running
["trace", "local"].forEach((f) => {
  const led = ledFor(f);
  if (led) led.dataset.status = "live";
});

/* ---- footer noise readout (driven by mouse activity) -------------- */
let noise = 0;
eventBus.subscribe("mouse:move", ({ speed }) => {
  noise = Math.min(1, noise * 0.9 + Math.min(speed * 3, 1) * 0.4);
});
setInterval(() => {
  noise *= 0.85;
  const n = document.querySelector("#footer-noise b");
  if (n) n.textContent = noise.toFixed(2);
}, 600);

/* ---- data feeds --------------------------------------------------- */
initIssData({ eventBus, scheduler, intervalMs: monitorConfig.pollIntervals.issMs });
initEarthquakeData({ eventBus, scheduler, intervalMs: monitorConfig.pollIntervals.quakesMs });

/* ---- panels ------------------------------------------------------- */
initRealityPanel({ eventBus, stateStore, scheduler });
initOrbitalPanel({ eventBus, stateStore, scheduler });
initSubstratePanel({ eventBus, stateStore, scheduler });
initLogPanel({ eventBus, stateStore, scheduler });

scheduler.start();

/* ---- boot sequence ------------------------------------------------ */
const BOOT_LINES = [
  "ROUGVIE ORBITAL COMMAND // BIOS 4.2.7",
  "POST ........................ OK",
  "PHOSPHOR TUBE ............... P1 GREEN",
  "MOUNTING TELEMETRY BUS ...... OK",
  "ACQUIRING OBJECT 25544 ...... LINK",
  "SEISMIC LATTICE ............. ONLINE",
  "SUBSTRATE ARRAY ............. CALIBRATED",
  "OPERATOR CLEARANCE .......... ROUGVIE-1",
  "",
  "ALL SYSTEMS NOMINAL. WELCOME BACK."
];

function runBoot() {
  const screen = document.getElementById("boot-screen");
  const log = document.getElementById("boot-log");
  if (!screen || !log) return;

  // Reduced motion: skip the typewriter, dismiss fast.
  if (REDUCED_MOTION) {
    log.textContent = BOOT_LINES.join("\n");
    setTimeout(() => screen.classList.add("boot-done"), 400);
    finish();
    return;
  }

  let i = 0;
  function nextLine() {
    if (i >= BOOT_LINES.length) {
      setTimeout(() => screen.classList.add("boot-done"), 500);
      return;
    }
    log.textContent += (i ? "\n" : "") + BOOT_LINES[i];
    i += 1;
    setTimeout(nextLine, 130 + Math.random() * 90);
  }
  nextLine();
  finish();
}

function finish() {
  const ind = document.getElementById("status-indicator");
  if (ind) { ind.dataset.state = "online"; const b = ind.querySelector("b"); if (b) b.textContent = "NOMINAL"; }
  refreshFooterFeeds();
}

runBoot();
