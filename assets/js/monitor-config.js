// /monitor/assets/js/monitor-config.js
export const monitorConfig = {
  themes: 4,
  themeNames: ["P1 GREEN", "P3 AMBER", "TEAL ICE", "HAZARD RED"],
  pollIntervals: {
    cycleCounterMs: 1600,
    fakeLogMs: 5200,
    issMs: 5000,     // ISS position every 5 s
    quakesMs: 60000  // earthquakes every 60 s
  },
  feeds: ["iss", "quakes"] // tracked for the FEEDS footer counter
};
