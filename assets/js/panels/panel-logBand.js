// EVENT TRACE — append-only scrolling log. Supports alert lines.
export function initLogPanel({ eventBus }) {
  const root = document.getElementById("panel-log");
  if (!root) return;

  const inner = root.querySelector(".panel-inner");
  inner.innerHTML = "";

  const container = document.createElement("div");
  container.classList.add("log-entries");
  inner.appendChild(container);

  const maxEntries = 60;

  function addEntry(text, isAlert = false) {
    const entry = document.createElement("div");
    entry.classList.add("log-entry", "is-new");
    if (isAlert) entry.classList.add("is-alert");
    entry.textContent = text;
    container.appendChild(entry);

    setTimeout(() => entry.classList.remove("is-new"), 800);

    const children = container.children;
    while (children.length > maxEntries) container.removeChild(children[0]);

    container.scrollTop = container.scrollHeight;
  }

  // Accept either a plain string or { text, alert }
  eventBus.subscribe("log:newEvent", (payload) => {
    if (!payload) return;
    if (typeof payload === "string") return addEntry(payload, false);
    addEntry(payload.text, !!payload.alert);
  });
}
