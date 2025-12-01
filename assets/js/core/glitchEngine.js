// /monitor/assets/js/core/glitchEngine.js
// Phase 1 stub - hooks for later use
export function createGlitchEngine(eventBus) {
  function flashPanel(panelId, intensity = 1) {
    const root = document.getElementById(panelId);
    if (!root) return;
    const original = root.style.filter;
    root.style.filter = "contrast(1.4) brightness(1.2)";
    setTimeout(() => {
      root.style.filter = original;
    }, 80 + intensity * 40);
  }

  function globalJitter(durationMs = 120) {
    const frame = document.getElementById("monitor-frame");
    if (!frame) return;
    frame.classList.add("glitch-jitter");
    setTimeout(() => {
      frame.classList.remove("glitch-jitter");
    }, durationMs);
  }

  // simple reactions for now
  eventBus.subscribe("mouse:click", () => {
    if (Math.random() < 0.05) {
      globalJitter(120);
    }
  });

  return { flashPanel, globalJitter };
}
