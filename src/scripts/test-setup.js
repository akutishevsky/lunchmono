// Date handling is deliberately local-time, so the suite pins a timezone to
// stay deterministic wherever it runs. Node applies a TZ change from this
// point on. Europe/Kyiv is the one the app is actually used in, and being
// ahead of UTC it exposes the bug the local-date handling fixes.
process.env.TZ = "Europe/Kyiv";
