#!/usr/bin/env python3
"""CLI for single TikTok view prediction and hashtag what-if."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone

from tiktok_engine.config import project_paths
from tiktok_engine.impact import PredictionOutput, hashtag_delta, predict_views_single


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict views and optional hashtag impact.")
    parser.add_argument("--model", default="models/latest.joblib", help="Path to model .joblib")
    parser.add_argument("--video-duration", type=float, required=True, help="Video duration (seconds)")
    parser.add_argument("--hashtags", type=str, default="", help='e.g. "#NYC #food"')
    parser.add_argument("--sound-popularity", type=float, required=True, help="0–1")
    parser.add_argument("--posted-at", type=str, default=None, help="ISO timestamp or omit for now")
    parser.add_argument("--region", type=str, default="NYC")
    parser.add_argument("--what-if-hashtag", type=str, default=None, help="Hashtag to test marginal impact")
    parser.add_argument(
        "--json",
        action="store_true",
        help="If set, emit a single JSON object suitable for the web API.",
    )
    args = parser.parse_args()

    posted_at = args.posted_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
    payload = {
        "video_duration_s": args.video_duration,
        "hashtags": args.hashtags,
        "sound_popularity": args.sound_popularity,
        "posted_at": posted_at,
        "region": args.region,
    }

    paths = project_paths()
    model_path = (paths.root / args.model).resolve()

    pred: PredictionOutput = predict_views_single(model_path, payload)

    if args.json:
        out = {
            "predicted_views": pred.predicted_views,
            "lower_ci": pred.lower_ci,
            "upper_ci": pred.upper_ci,
            "model_name": "random_forest",  # name is stored in joblib meta but not needed here
            "tag_count": len(str(args.hashtags).split()),
            "is_mock": False,
        }
        print(json.dumps(out))
        return

    print(f"Predicted views: {pred.predicted_views:.1f}")
    print(f"Approx. 1-MAE interval: [{pred.lower_ci:.1f}, {pred.upper_ci:.1f}]")

    if args.what_if_hashtag:
        delta = hashtag_delta(model_path, payload, args.what_if_hashtag)
        print(f"Estimated impact of adding {args.what_if_hashtag}: {delta:+.1f} views")


if __name__ == "__main__":
    main()

