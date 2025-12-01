// /monitor/assets/js/monitor-app.js
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
import { monitorConfig } from "./monitor-config.js";

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

// mouse tracking
initMouseTracker(eventBus, document);

// header controls
initUiControls(eventBus, stateStore);

// theme cycle
eventBus.subscribe("ui:cycleTheme", () => {
  const { themeIndex = 0 } = stateStore.getState();
  const next = (themeIndex + 1) % monitorConfig.themes;
  stateStore.setState({ themeIndex: next });
  document.body.classList.remove("theme-0", "theme-1", "theme-2", "theme-3");
  document.body.classList.add(`theme-${next}`);
});

// about toggle
eventBus.subscribe("ui:toggleAbout", () => {
  const { aboutMode = false } = stateStore.getState();
  const next = !aboutMode;
  stateStore.setState({ aboutMode: next });

  const panel = document.getElementById("panel-reality");
  if (!panel) return;
  const overlay = panel.querySelector(".panel-overlay-about");
  if (!overlay) return;

  if (next) {
    overlay.classList.add("panel-overlay-visible");
    overlay.innerHTML =
      "<strong>Reality band</strong><br/>Monitoring surface-level disturbances, lattice noise and local operator interference.";
  } else {
    overlay.classList.remove("panel-overlay-visible");
  }
});

// sources overlay toggle
eventBus.subscribe("ui:toggleSources", () => {
  const { showSourcesOverlay = false } = stateStore.getState();
  const next = !showSourcesOverlay;
  stateStore.setState({ showSourcesOverlay: next });

  const panels = document.querySelectorAll(".panel");
  panels.forEach((panel) => {
    const overlay = panel.querySelector(".panel-overlay-sources");
    if (!overlay) return;
    if (next) {
      overlay.classList.add("panel-overlay-visible");
      overlay.textContent =
        "Sources: synthesis of terrestrial, orbital and substrate inputs (simulation phase).";
    } else {
      overlay.classList.remove("panel-overlay-visible");
    }
  });
});

// simple cycle counter and footer clock
scheduler.registerPoller(
  "cycleCounter",
  () => {
    const current = stateStore.getState().cycle ?? 0;
    const next = current + 1;
    stateStore.setState({ cycle: next });

    const counterEl = document.getElementById("cycle-counter");
    if (counterEl) {
      counterEl.textContent = `Cycle: ${String(next).padStart(6, "0")}`;
    }

    const timeEl = document.getElementById("footer-time");
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
    }
  },
  monitorConfig.pollIntervals.cycleCounterMs
);

// fake log events for phase 1
scheduler.registerPoller(
  "fakeLog",
  () => {
    const roll = Math.random();
    let kind = "heartbeat";
    if (roll > 0.8) kind = "mouseSpike";
    const entry = textEngine.createLogEntry(kind, {});
    eventBus.publish("log:newEvent", entry);
  },
  monitorConfig.pollIntervals.fakeLogMs
);

// allow clicks to occasionally cause a log entry
eventBus.subscribe("mouse:click", () => {
  if (Math.random() < 0.2) {
    const entry = textEngine.createLogEntry("mouseSpike", {});
    eventBus.publish("log:newEvent", entry);
    glitchEngine.globalJitter(100);
  }
});

// init panels
initRealityPanel({ eventBus, stateStore, scheduler });
initOrbitalPanel({ eventBus, stateStore, scheduler });
initSubstratePanel({ eventBus, stateStore, scheduler });
initLogPanel({ eventBus, stateStore, scheduler });

// start animation loop
scheduler.start();

// set initial status text
const statusEl = document.getElementById("status-indicator");
if (statusEl) {
  statusEl.textContent = "Status: ONLINE";
}
