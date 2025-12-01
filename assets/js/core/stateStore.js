// /monitor/assets/js/core/stateStore.js
export function createStateStore(initial = {}) {
  let state = { ...initial };
  const subscribers = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    const next = { ...state, ...patch };
    state = next;
    for (const sub of subscribers) {
      try {
        sub(next);
      } catch (err) {
        console.error("State subscriber error", err);
      }
    }
  }

  function subscribe(fn) {
    subscribers.add(fn);
    // push initial state
    fn(state);
    return () => subscribers.delete(fn);
  }

  return { getState, setState, subscribe };
}
