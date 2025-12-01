// /monitor/assets/js/data/data-iss.js
// Simple ISS position fetcher using wheretheiss.at
// Emits: data:iss:update with { latitude, longitude, altitude, velocity }

export function initIssData({ eventBus, scheduler, intervalMs = 5000 }) {
  const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";

  async function fetchIss() {
    try {
      const resp = await fetch(ISS_API);
      if (!resp.ok) return;
      const data = await resp.json();

      const payload = {
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,   // km
        velocity: data.velocity    // km/h
      };

      eventBus.publish("data:iss:update", payload);
    } catch (err) {
      console.error("ISS data fetch error", err);
    }
  }

  // initial call then interval
  fetchIss();
  scheduler.registerPoller("data-iss", fetchIss, intervalMs);
}
