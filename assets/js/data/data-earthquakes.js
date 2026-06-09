// USGS all-earthquakes-past-hour (no key, no tracker).
// Emits: data:quakes:update { count, maxMag, avgMag, place }
//        data:feed:status { feed:"quakes", status:"live"|"degraded" }
export function initEarthquakeData({ eventBus, scheduler, intervalMs = 60000 }) {
  const USGS_API =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
  let failures = 0;
  let lastMaxId = null;

  async function fetchQuakes() {
    try {
      const resp = await fetch(USGS_API, { cache: "no-store" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();

      const features = Array.isArray(data.features) ? data.features : [];
      const withMag = features.filter(
        (f) => f.properties && typeof f.properties.mag === "number"
      );
      const mags = withMag.map((f) => f.properties.mag);

      const count = mags.length;
      const maxMag = mags.length ? Math.max(...mags) : 0;
      const avgMag = mags.length ? mags.reduce((a, b) => a + b, 0) / mags.length : 0;

      // Find the strongest event for a place label + log line on change
      let place = "";
      let strongest = null;
      for (const f of withMag) {
        if (!strongest || f.properties.mag > strongest.properties.mag) strongest = f;
      }
      if (strongest) {
        place = strongest.properties.place || "";
        if (strongest.id !== lastMaxId && strongest.properties.mag >= 4) {
          lastMaxId = strongest.id;
          eventBus.publish("log:newEvent", {
            text: `${new Date().toLocaleTimeString("en-GB", { hour12: false })} - SEISMIC SPIKE M${strongest.properties.mag.toFixed(1)} // ${place.toUpperCase()}`,
            alert: strongest.properties.mag >= 5.5
          });
        }
      }

      eventBus.publish("data:quakes:update", { count, maxMag, avgMag, place });
      failures = 0;
      eventBus.publish("data:feed:status", { feed: "quakes", status: "live" });
    } catch (err) {
      failures += 1;
      if (failures >= 2) {
        eventBus.publish("data:feed:status", { feed: "quakes", status: "degraded" });
      }
    }
  }

  fetchQuakes();
  scheduler.registerPoller("data-quakes", fetchQuakes, intervalMs);
}
