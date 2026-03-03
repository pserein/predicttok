const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const router = express.Router();

/**
 * POST /api/predict
 * Body: { video_duration_s, hashtags, sound_popularity, posted_at, region? }
 * Returns: { predicted_views, lower_ci, upper_ci, delta_suggestions }
 */
router.post("/", (req, res) => {
  const {
    video_duration_s = 30,
    hashtags = "",
    sound_popularity = 0.5,
    posted_at = new Date().toISOString(),
    region = "NYC",
  } = req.body;

  // Validation
  if (video_duration_s < 1 || video_duration_s > 600) {
    return res.status(400).json({ error: "video_duration_s must be between 1 and 600" });
  }
  if (sound_popularity < 0 || sound_popularity > 1) {
    return res.status(400).json({ error: "sound_popularity must be between 0 and 1" });
  }

  const mlRoot = path.resolve(process.env.ML_ROOT || path.resolve(__dirname, "../../"));
  const modelPath = path.join(mlRoot, "models", "latest.joblib");
  const scriptPath = path.join(mlRoot, "scripts", "predict_cli.py");
  const pythonBin = process.env.PYTHON_BIN || "python3";

  const args = [
    scriptPath,
    "--model", modelPath,
    "--video-duration", String(video_duration_s),
    "--hashtags", hashtags,
    "--sound-popularity", String(sound_popularity),
    "--posted-at", posted_at,
    "--region", region,
    "--json",
  ];

  execFile(pythonBin, args, { timeout: 15000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("predict_cli error:", stderr);
      // Fall back to mock data if model not yet trained
      return res.json(mockPrediction(video_duration_s, hashtags, sound_popularity));
    }
    try {
      const result = JSON.parse(stdout.trim());
      res.json(result);
    } catch {
      res.json(mockPrediction(video_duration_s, hashtags, sound_popularity));
    }
  });
});

// ── Mock prediction used before model is trained ──────────────────────────────
function mockPrediction(duration, hashtags, soundPop) {
  const tagList = hashtags.split(/\s+/).filter((t) => t.startsWith("#"));
  const base = 12000 + duration * 180 + soundPop * 8000;
  const tagBonus = tagList.length * 950;
  const predicted_views = Math.round(base + tagBonus + (Math.random() - 0.5) * 2000);
  const mae = 500;
  return {
    predicted_views,
    lower_ci: Math.max(0, predicted_views - mae),
    upper_ci: predicted_views + mae,
    model_name: "mock (train model first)",
    tag_count: tagList.length,
    is_mock: true,
  };
}

module.exports = router;
