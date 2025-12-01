// /monitor/assets/js/core/textEngine.js
// Phase 1 - very simple occult-ish message generator
export function createTextEngine() {
  const recent = [];

  function pushRecent(text) {
    recent.unshift(text);
    if (recent.length > 20) recent.pop();
  }

  function isTooSimilar(text) {
    return recent.some((t) => t === text);
  }

  function createLogEntry(kind = "heartbeat", payload = {}) {
    const now = new Date();
    const time = now.toLocaleTimeString("en-GB", { hour12: false });

    const templates = {
      heartbeat: [
        `${time} - field baseline steady`,
        `${time} - low noise in outer band`,
        `${time} - substrate hum within tolerance`
      ],
      mouseSpike: [
        `${time} - operator interference detected`,
        `${time} - surface agitation spiked`,
        `${time} - local input burst recorded`
      ],
      modeChange: [
        `${time} - regime shifted to ${payload.mode}`,
        `${time} - envelope realigned (${payload.mode})`
      ]
    };

    const set = templates[kind] || templates.heartbeat;
    let candidate = set[Math.floor(Math.random() * set.length)];

    let guard = 0;
    while (isTooSimilar(candidate) && guard < 5) {
      candidate = set[Math.floor(Math.random() * set.length)];
      guard += 1;
    }

    pushRecent(candidate);
    return candidate;
  }

  return { createLogEntry };
}
