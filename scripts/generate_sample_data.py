#!/usr/bin/env python3
"""Generate synthetic TikTok-like engagement data for demo/training."""
from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

from tiktok_engine.config import project_paths

NYC_TAGS = ["#nyc", "#brooklyn", "#manhattan", "#queens", "#bronx", "#newyork", "#newyorkcity"]
GENERIC_TAGS = ["#fyp", "#viral", "#trending", "#dance", "#comedy", "#food", "#travel", "#music"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic TikTok-like engagement data.")
    parser.add_argument("--rows", type=int, default=2000, help="Number of rows to generate.")
    args = parser.parse_args()

    paths = project_paths()
    paths.data_dir.mkdir(parents=True, exist_ok=True)

    n = args.rows
    now = datetime.now(timezone.utc)

    durations = np.random.uniform(5, 60, size=n)
    sound_pop = np.random.beta(2, 3, size=n)
    regions = np.random.choice(["NYC", "LA", "CHI"], size=n, p=[0.5, 0.3, 0.2])
    posted_at = [now - timedelta(hours=random.randint(0, 24 * 14)) for _ in range(n)]

    hashtags = []
    base_views = []
    likes = []
    for i in range(n):
        region = regions[i]
        tags = []
        if region == "NYC":
            tags.extend(random.sample(NYC_TAGS, k=random.randint(1, 3)))
        tags.extend(random.sample(GENERIC_TAGS, k=random.randint(1, 3)))
        hashtags.append(" ".join(tags))

        dur = durations[i]
        sp = sound_pop[i]
        sweet_center = 18.0
        dur_penalty = 1.0 / (1.0 + (dur - sweet_center) ** 2 / 50.0)
        base = 500 + 4000 * dur_penalty + 8000 * sp
        if region == "NYC":
            base *= 1.2
        noise = np.random.normal(0, 400)
        v = max(50, base + noise)
        base_views.append(int(v))
        likes.append(int(v * np.random.uniform(0.05, 0.2)))

    df = pd.DataFrame({
        "views": base_views,
        "likes": likes,
        "video_duration_s": durations,
        "hashtags": hashtags,
        "sound_popularity": sound_pop,
        "posted_at": [t.isoformat(timespec="seconds") for t in posted_at],
        "region": regions,
    })

    for _ in range(max(3, n // 200)):
        idx = random.randrange(0, n)
        df.at[idx, "views"] *= random.randint(5, 15)
        df.at[idx, "likes"] = int(df.at[idx, "views"] * np.random.uniform(0.1, 0.3))

    train_path = paths.data_dir / "train.csv"
    df.to_csv(train_path, index=False)

    nyc_rows = df[df["region"] == "NYC"][["hashtags", "region"]].copy()
    trends_path = paths.data_dir / "trends_nyc.csv"
    nyc_rows.to_csv(trends_path, index=False)

    print(f"Wrote {train_path}")
    print(f"Wrote {trends_path}")


if __name__ == "__main__":
    main()
