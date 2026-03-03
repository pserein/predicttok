const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const router = express.Router();

const ML_ROOT = path.resolve(process.env.ML_ROOT || path.resolve(__dirname, "../../"));
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

/**
 * POST /api/hashtags/impact
 * Body: { base_payload, hashtags: ["#NYC", "#food", ...] }
 * Returns: { results: [{ hashtag, delta, pct_change }] }
 */
router.post("/impact", (req, res) => {
  const { base_payload, hashtags = [] } = req.body;

  if (!Array.isArray(hashtags) || hashtags.length === 0) {
    return res.status(400).json({ error: "Provide at least one hashtag to analyze" });
  }

  const modelPath = path.join(ML_ROOT, "models", "latest.joblib");
  const scriptPath = path.join(ML_ROOT, "scripts", "hashtag_impact_cli.py");

  const args = [
    scriptPath,
    "--model", modelPath,
    "--hashtags", ...hashtags,
    "--payload", JSON.stringify(base_payload || {}),
    "--json",
  ];

  execFile(PYTHON_BIN, args, { timeout: 20000 }, (err, stdout) => {
    if (err) {
      return res.json(mockImpact(hashtags, base_payload));
    }
    try {
      res.json(JSON.parse(stdout.trim()));
    } catch {
      res.json(mockImpact(hashtags, base_payload));
    }
  });
});

/**
 * GET /api/hashtags/trending
 * Returns top 10 trending hashtags for NYC
 */
router.get("/trending", (_req, res) => {
  const fs = require("fs");
  const { parse } = require("csv-parse/sync");
  const trendsPath = path.join(ML_ROOT, "data", "trends_nyc.csv");

  if (!fs.existsSync(trendsPath)) {
    return res.json({ hashtags: mockTrending(), is_mock: true });
  }

  const content = fs.readFileSync(trendsPath, "utf8");
  const rows = parse(content, { columns: true, skip_empty_lines: true });
  const counts = {};
  for (const row of rows) {
    const tags = (row.hashtags || row.hashtag || "").split(/\s+/);
    for (const t of tags) {
      if (t.startsWith("#")) counts[t] = (counts[t] || 0) + 1;
    }
  }
  const top = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  res.json({ hashtags: top });
});

function mockImpact(hashtags, base_payload) {
  const basePredicted = 18500;
  const results = hashtags.map((tag) => {
    const delta = Math.round((Math.random() - 0.2) * 4000);
    return { hashtag: tag, delta, pct_change: parseFloat(((delta / basePredicted) * 100).toFixed(1)) };
  });
  return { results, base_predicted: basePredicted, is_mock: true };
}

function mockTrending() {
  return [
    { tag: "#NYC", count: 4821 },
    { tag: "#brooklyn", count: 3204 },
    { tag: "#fyp", count: 2987 },
    { tag: "#food", count: 2341 },
    { tag: "#nyclife", count: 1876 },
    { tag: "#manhattan", count: 1543 },
    { tag: "#tech", count: 1321 },
    { tag: "#viral", count: 1198 },
    { tag: "#trending", count: 987 },
    { tag: "#creator", count: 754 },
  ];
}

module.exports = router;
