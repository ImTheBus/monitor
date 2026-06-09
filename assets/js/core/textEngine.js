// Villain-console log line generator. Cinematic, terse, non-repeating.
export function createTextEngine() {
  const recent = [];

  function pushRecent(text) {
    recent.unshift(text);
    if (recent.length > 24) recent.pop();
  }
  function isTooSimilar(text) {
    return recent.some((t) => t === text);
  }

  function createLogEntry(kind = "heartbeat", payload = {}) {
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });

    const templates = {
      heartbeat: [
        `${time} - global lattice nominal`,
        `${time} - thermal envelope within tolerance`,
        `${time} - relay grid holding`,
        `${time} - subsystem sweep complete`,
        `${time} - power rails steady at 0.998`,
        `${time} - deep-field array idle`,
        `${time} - encryption handshake renewed`
      ],
      mouseSpike: [
        `${time} - OPERATOR PRESENCE DETECTED`,
        `${time} - manual override flagged`,
        `${time} - console input burst logged`,
        `${time} - surface agitation spiked`,
        `${time} - intruder vector recalculated`
      ],
      modeChange: [
        `${time} - regime shifted to ${payload.mode}`,
        `${time} - defence posture: ${payload.mode}`,
        `${time} - envelope realigned // ${payload.mode}`
      ]
    };

    const set = templates[kind] || templates.heartbeat;
    let candidate = set[Math.floor(Math.random() * set.length)];
    let guard = 0;
    while (isTooSimilar(candidate) && guard < 6) {
      candidate = set[Math.floor(Math.random() * set.length)];
      guard += 1;
    }
    pushRecent(candidate);
    return candidate;
  }

  return { createLogEntry };
}
