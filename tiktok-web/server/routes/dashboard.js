const express = require("express");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const router = express.Router();

const ML_ROOT = path.resolve(process.env.ML_ROOT || path.resolve(__dirname, "../../"));

function loadCSV(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  return parse(content, { columns: true, skip_empty_lines: true });
}

/**
 * GET /api/dashboard/sweet-spot
 * Returns grid data for duration × hashtag_count → avg_views contour
 */
router.get("/sweet-spot", (_req, res) => {
  const trainPath = path.join(ML_ROOT, "data", "train.csv");
  const rows = loadCSV(trainPath);

  if (!rows) return res.json(generateMockSweetSpot());

  // Bin by duration (5s buckets) and hashtag_count (1 tag buckets, max 15)
  const buckets = {};
  for (const row of rows) {
    const dur = Math.min(Math.round(Number(row.video_duration_s) / 5) * 5, 60);
    const tagsFromText = String(row.hashtags || "")
      .split(/\s+/)
      .filter((t) => t.startsWith("#")).length;
    const tags = Math.min(Number(row.hashtag_count || tagsFromText || 0), 15);
    const views = Number(row.views) || 0;
    const key = `${dur}_${tags}`;
    if (!buckets[key]) buckets[key] = { dur, tags, total: 0, count: 0 };
    buckets[key].total += views;
    buckets[key].count += 1;
  }

  const points = Object.values(buckets).map((b) => ({
    duration: b.dur,
    hashtag_count: b.tags,
    avg_views: Math.round(b.total / b.count),
  }));

  res.json({ points });
});

/**
 * GET /api/dashboard/correlations
 * Returns scatter data for views vs likes + views vs shares
 */
router.get("/correlations", (_req, res) => {
  const trainPath = path.join(ML_ROOT, "data", "train.csv");
  const rows = loadCSV(trainPath);

  if (!rows) return res.json(generateMockCorrelations());

  // Sample up to 500 points to avoid huge payloads
  const sample = rows
    .sort(() => Math.random() - 0.5)
    .slice(0, 500)
    .map((r) => ({
      views: Number(r.views) || 0,
      likes: Number(r.likes) || 0,
      duration: Number(r.video_duration_s) || 0,
      hashtag_count: Number(r.hashtag_count) || String(r.hashtags || "").split(/\s+/).filter((t) => t.startsWith("#")).length || 0,
    }));

  res.json({ points: sample });
});

// ── Mock data generators ──────────────────────────────────────────────────────
function generateMockSweetSpot() {
  const points = [];
  for (let dur = 5; dur <= 60; dur += 5) {
    for (let tags = 0; tags <= 15; tags++) {
      // Sweet spot around 15-25s and 5-8 tags
      const durPeak = Math.exp(-Math.pow((dur - 20) / 12, 2));
      const tagPeak = Math.exp(-Math.pow((tags - 6) / 3, 2));
      const base = 8000 + 28000 * durPeak * tagPeak;
      points.push({
        duration: dur,
        hashtag_count: tags,
        avg_views: Math.round(base + (Math.random() - 0.5) * 1500),
      });
    }
  }
  return { points, is_mock: true };
}

function generateMockCorrelations() {
  const points = Array.from({ length: 400 }, () => {
    const views = Math.round(Math.abs((Math.random() * 50000) + 500));
    return {
      views,
      likes: Math.round(views * (0.05 + Math.random() * 0.12)),
      duration: Math.round(5 + Math.random() * 55),
      hashtag_count: Math.floor(Math.random() * 15),
    };
  });
  return { points, is_mock: true };
}

module.exports = router;
