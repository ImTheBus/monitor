// /monitor/assets/js/data/data-earthquakes.js
// USGS all earthquakes in the last hour
// Emits: data:quakes:update with { count, maxMag, avgMag }

export function initEarthquakeData({ eventBus, scheduler, intervalMs = 60000 }) {
  const USGS_API =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";

  async function fetchQuakes() {
    try {
      const resp = await fetch(USGS_API);
      if (!resp.ok) return;
      const data = await resp.json();

      const features = Array.isArray(data.features) ? data.features : [];
      const mags = features
        .map((f) =>
          f.properties && typeof f.properties.mag === "number"
            ? f.properties.mag
            : null
        )
        .filter((m) => m != null);

      const count = mags.length;
      const maxMag = mags.length ? Math.max(...mags) : 0;
      const avgMag =
        mags.length ? mags.reduce((a, b) => a + b, 0) / mags.length : 0;

      const payload = { count, maxMag, avgMag };
      eventBus.publish("data:quakes:update", payload);
    } catch (err) {
      console.error("Quake data fetch error", err);
    }
  }

  fetchQuakes();
  scheduler.registerPoller("data-quakes", fetchQuakes, intervalMs);
}
