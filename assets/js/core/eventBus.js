// /monitor/assets/js/core/eventBus.js
export function createEventBus() {
  const listeners = new Map();

  function subscribe(eventName, handler) {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }
    listeners.get(eventName).add(handler);
    return () => listeners.get(eventName)?.delete(handler);
  }

  function publish(eventName, payload) {
    const subs = listeners.get(eventName);
    if (!subs) return;
    for (const handler of subs) {
      try {
        handler(payload);
      } catch (err) {
        console.error("EventBus handler error", eventName, err);
      }
    }
  }

  return { subscribe, publish };
}
