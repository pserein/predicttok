require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const predictRoutes = require("./routes/predict");
const dashboardRoutes = require("./routes/dashboard");
const hashtagRoutes = require("./routes/hashtags");
const metricsRoutes = require("./routes/metrics");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.set("etag", false);
app.use(helmet({ contentSecurityPolicy: false }));
// Allow requests from both local dev and GitHub Pages
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/predict", predictRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/hashtags", hashtagRoutes);
app.use("/api/metrics", metricsRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n🚀  TikTok Engine API running on http://localhost:${PORT}\n`);
});
