// /monitor/assets/js/core/uiControls.js
export function initUiControls(eventBus, stateStore) {
  const strip = document.getElementById("control-strip");
  if (!strip) return;

  const buttons = Array.from(strip.querySelectorAll(".control-light"));

  strip.addEventListener("click", (e) => {
    const btn = e.target.closest(".control-light");
    if (!btn) return;
    const action = btn.dataset.action;
    if (!action) return;

    switch (action) {
      case "toggle-about":
        eventBus.publish("ui:toggleAbout");
        break;
      case "cycle-theme":
        eventBus.publish("ui:cycleTheme");
        break;
      case "toggle-sources":
        eventBus.publish("ui:toggleSources");
        break;
    }
  });

  // reflect state to buttons
  stateStore.subscribe((state) => {
    const { aboutMode = false, showSourcesOverlay = false, themeIndex = 0 } = state;

    for (const btn of buttons) {
      btn.classList.remove("is-active");
    }

    const aboutBtn = buttons.find((b) => b.dataset.action === "toggle-about");
    const sourcesBtn = buttons.find((b) => b.dataset.action === "toggle-sources");
    const themeBtn = buttons.find((b) => b.dataset.action === "cycle-theme");

    if (aboutBtn && aboutMode) aboutBtn.classList.add("is-active");
    if (sourcesBtn && showSourcesOverlay) sourcesBtn.classList.add("is-active");

    if (themeBtn) {
      themeBtn.dataset.themeIndex = String(themeIndex ?? 0);
    }
  });
}
