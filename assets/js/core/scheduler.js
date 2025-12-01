// /monitor/assets/js/core/scheduler.js
export function createScheduler() {
  const pollers = new Map();
  const rafCallbacks = new Set();
  let rafId = null;

  function registerPoller(id, fn, intervalMs) {
    if (pollers.has(id)) {
      clearInterval(pollers.get(id));
    }
    const handle = setInterval(fn, intervalMs);
    pollers.set(id, handle);
  }

  function unregisterPoller(id) {
    const handle = pollers.get(id);
    if (handle) {
      clearInterval(handle);
      pollers.delete(id);
    }
  }

  function registerAnimation(fn) {
    rafCallbacks.add(fn);
  }

  function unregisterAnimation(fn) {
    rafCallbacks.delete(fn);
  }

  function tick(timestamp) {
    for (const fn of rafCallbacks) {
      try {
        fn(timestamp);
      } catch (err) {
        console.error("Animation callback error", err);
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (rafId == null) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function stop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    for (const handle of pollers.values()) {
      clearInterval(handle);
    }
    pollers.clear();
  }

  return {
    registerPoller,
    unregisterPoller,
    registerAnimation,
    unregisterAnimation,
    start,
    stop
  };
}
