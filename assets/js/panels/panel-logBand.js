// /monitor/assets/js/panels/panel-logBand.js
export function initLogPanel({ eventBus }) {
  const root = document.getElementById("panel-log");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  const container = document.createElement("div");
  container.classList.add("log-entries");
  inner.appendChild(container);

  const maxEntries = 50;

  function addEntry(text) {
    const entry = document.createElement("div");
    entry.classList.add("log-entry", "is-new");
    entry.textContent = text;
    container.appendChild(entry);

    // remove is-new after a short delay
    setTimeout(() => entry.classList.remove("is-new"), 800);

    // trim
    const children = Array.from(container.children);
    if (children.length > maxEntries) {
      container.removeChild(children[0]);
    }
  }

  eventBus.subscribe("log:newEvent", (text) => {
    if (!text) return;
    addEntry(text);
  });
}
