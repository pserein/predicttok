#!/usr/bin/env python3
"""
Convert the Kaggle TikTok dataset into the engine's training format.

Input:
  data/kaggle_train.csv  (columns like: video_duration_sec, video_view_count, ...)

Output:
  data/train.csv         (columns: views, likes, video_duration_s, hashtags,
                                   sound_popularity, posted_at, region)
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def build_hashtags(text: str, max_tags: int = 5) -> str:
  if not isinstance(text, str):
    return ""
  # Basic tokenization: words of length >= 4
  tokens = re.findall(r"[A-Za-z]{4,}", text.lower())
  if not tokens:
    return ""
  # Deduplicate in order and take first N as pseudo-hashtags
  seen = set()
  tags: list[str] = []
  for t in tokens:
    if t not in seen:
      seen.add(t)
      tags.append(f"#{t}")
      if len(tags) >= max_tags:
        break
  return " ".join(tags)


def main() -> None:
  kaggle_path = DATA_DIR / "kaggle_train.csv"
  if not kaggle_path.exists():
    raise SystemExit(f"Missing {kaggle_path}. Copy your Kaggle CSV there first.")

  df = pd.read_csv(kaggle_path)

  required_cols = {
    "video_duration_sec",
    "video_view_count",
    "video_like_count",
    "video_share_count",
    "video_download_count",
    "video_transcription_text",
  }
  missing = sorted(required_cols - set(df.columns))
  if missing:
    raise SystemExit(f"Kaggle CSV is missing required columns: {missing}")

  # Core numeric targets
  views = pd.to_numeric(df["video_view_count"], errors="coerce").fillna(0).astype(int)
  likes = pd.to_numeric(df["video_like_count"], errors="coerce").fillna(0).astype(int)
  durations = pd.to_numeric(df["video_duration_sec"], errors="coerce").fillna(0.0).astype(float)

  # Build synthetic hashtags from the transcription text so hashtag_count varies
  hashtags = df["video_transcription_text"].map(build_hashtags)

  # Approximate "sound_popularity" as a 0..1 score based on engagement volume
  engagement = (
    pd.to_numeric(df["video_like_count"], errors="coerce").fillna(0).astype(float)
    + pd.to_numeric(df["video_share_count"], errors="coerce").fillna(0).astype(float)
    + pd.to_numeric(df["video_download_count"], errors="coerce").fillna(0).astype(float)
  )
  denom = float(engagement.max() or 1.0)
  sound_popularity = (engagement / denom).clip(0.0, 1.0)

  # Synthesize posted_at timestamps over a recent 30‑day window
  n = len(df)
  now = datetime.now(timezone.utc)
  start = now - timedelta(days=30)
  # Spread rows evenly over the 30 days
  offsets = np.linspace(0, 30 * 24 * 60, num=n, endpoint=False)  # minutes
  posted_at = [
    (start + timedelta(minutes=float(m))).isoformat(timespec="seconds")
    for m in offsets
  ]

  out = pd.DataFrame(
    {
      "views": views,
      "likes": likes,
      "video_duration_s": durations,
      "hashtags": hashtags,
      "sound_popularity": sound_popularity,
      "posted_at": posted_at,
      "region": "NYC",
    }
  )

  DATA_DIR.mkdir(parents=True, exist_ok=True)
  out_path = DATA_DIR / "train.csv"
  out.to_csv(out_path, index=False)
  print(f"Wrote {len(out)} rows to {out_path}")


if __name__ == "__main__":
  main()

