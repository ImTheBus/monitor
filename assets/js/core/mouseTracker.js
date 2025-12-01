// /monitor/assets/js/core/mouseTracker.js
export function initMouseTracker(eventBus, rootElement = document) {
  let lastMoveTime = performance.now();
  let lastPos = { x: 0, y: 0 };

  function onMove(e) {
    const now = performance.now();
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    const dt = now - lastMoveTime || 1;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;

    lastPos = { x: e.clientX, y: e.clientY };
    lastMoveTime = now;

    eventBus.publish("mouse:move", {
      x: e.clientX,
      y: e.clientY,
      speed,
      ts: now
    });
  }

  function onClick(e) {
    eventBus.publish("mouse:click", {
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      ts: performance.now()
    });
  }

  rootElement.addEventListener("mousemove", onMove);
  rootElement.addEventListener("click", onClick);
}
