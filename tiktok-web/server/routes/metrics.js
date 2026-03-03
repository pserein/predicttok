const express = require("express");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const router = express.Router();

const ML_ROOT = process.env.ML_ROOT || path.resolve(__dirname, "../../");

/**
 * GET /api/metrics
 * Returns training run history + latest model stats + top feature importances
 */
router.get("/", (_req, res) => {
  const metricsPath = path.join(ML_ROOT, "runs", "metrics.csv");
  const driftPath = path.join(ML_ROOT, "runs", "drift_log.csv");

  // Load metrics history
  let runs = [];
  if (fs.existsSync(metricsPath)) {
    const content = fs.readFileSync(metricsPath, "utf8");
    runs = parse(content, { columns: true, skip_empty_lines: true }).map((r) => ({
      timestamp: r.timestamp,
      model_name: r.model_name,
      cv_r2: parseFloat(r.cv_r2),
      test_r2: parseFloat(r.test_r2),
      test_mae: parseFloat(r.test_mae),
      n_train: parseInt(r.n_train),
      n_test: parseInt(r.n_test),
    }));
  }

  // Load latest feature importances
  let importances = [];
  const runsDir = path.join(ML_ROOT, "runs");
  if (fs.existsSync(runsDir)) {
    const impFiles = fs.readdirSync(runsDir)
      .filter((f) => f.startsWith("feature_importance_"))
      .sort()
      .reverse();
    if (impFiles.length > 0) {
      const content = fs.readFileSync(path.join(runsDir, impFiles[0]), "utf8");
      importances = parse(content, { columns: true, skip_empty_lines: true })
        .slice(0, 15)
        .map((r) => ({ feature: r.feature, importance: parseFloat(r.importance) }));
    }
  }

  // Load drift history
  let driftLog = [];
  if (fs.existsSync(driftPath)) {
    const content = fs.readFileSync(driftPath, "utf8");
    driftLog = parse(content, { columns: true, skip_empty_lines: true });
  }

  const latest = runs[runs.length - 1] || null;

  if (!latest) {
    return res.json(mockMetrics());
  }

  res.json({ runs, latest, importances, drift_log: driftLog });
});

function mockMetrics() {
  const runs = [
    { timestamp: "20260101_120000", model_name: "random_forest", cv_r2: 0.81, test_r2: 0.79, test_mae: 523, n_train: 15200, n_test: 3800 },
    { timestamp: "20260115_083000", model_name: "xgboost",       cv_r2: 0.84, test_r2: 0.83, test_mae: 488, n_train: 15200, n_test: 3800 },
    { timestamp: "20260201_091500", model_name: "xgboost",       cv_r2: 0.86, test_r2: 0.85, test_mae: 461, n_train: 15200, n_test: 3800 },
    { timestamp: "20260215_104500", model_name: "xgboost",       cv_r2: 0.87, test_r2: 0.86, test_mae: 443, n_train: 16100, n_test: 4025 },
  ];
  const importances = [
    { feature: "sound_popularity",  importance: 0.231 },
    { feature: "video_duration_s",  importance: 0.198 },
    { feature: "hashtag_count",     importance: 0.154 },
    { feature: "#nyc",              importance: 0.112 },
    { feature: "posted_hour",       importance: 0.089 },
    { feature: "hashtag_density",   importance: 0.071 },
    { feature: "is_weekend",        importance: 0.058 },
    { feature: "#fyp",              importance: 0.047 },
    { feature: "#brooklyn",         importance: 0.023 },
    { feature: "posted_dow",        importance: 0.017 },
  ];
  return { runs, latest: runs[runs.length - 1], importances, drift_log: [], is_mock: true };
}

module.exports = router;
