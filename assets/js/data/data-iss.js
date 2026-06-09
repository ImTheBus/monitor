// ISS position via wheretheiss.at (no key, no tracker).
// Emits: data:iss:update { latitude, longitude, altitude, velocity }
//        data:feed:status { feed:"iss", status:"live"|"degraded" }
export function initIssData({ eventBus, scheduler, intervalMs = 5000 }) {
  const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";
  let failures = 0;

  async function fetchIss() {
    try {
      const resp = await fetch(ISS_API, { cache: "no-store" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();
      eventBus.publish("data:iss:update", {
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude, // km
        velocity: data.velocity  // km/h
      });
      failures = 0;
      eventBus.publish("data:feed:status", { feed: "iss", status: "live" });
    } catch (err) {
      failures += 1;
      if (failures >= 2) {
        eventBus.publish("data:feed:status", { feed: "iss", status: "degraded" });
        eventBus.publish("log:newEvent", {
          text: `${new Date().toLocaleTimeString("en-GB", { hour12: false })} - ORBITAL LINK DEGRADED // OBJECT 25544 LOST`,
          alert: true
        });
      }
    }
  }

  fetchIss();
  scheduler.registerPoller("data-iss", fetchIss, intervalMs);
}
