#!/usr/bin/env python3
"""
Compute marginal view deltas for a list of hashtags using the trained model.

Intended to be called from the Node /api/hashtags/impact route.

Example:
  python scripts/hashtag_impact_cli.py \\
    --model models/latest.joblib \\
    --hashtags #nyc #food #fyp \\
    --payload '{"video_duration_s": 20, "hashtags": "", "sound_popularity": 0.7, "posted_at": "...", "region": "NYC"}' \\
    --json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from tiktok_engine.config import project_paths
from tiktok_engine.impact import hashtag_delta, predict_views_single


def main() -> None:
    parser = argparse.ArgumentParser(description="Hashtag impact analysis CLI.")
    parser.add_argument("--model", default="models/latest.joblib", help="Path to model .joblib")
    parser.add_argument(
        "--hashtags",
        nargs="+",
        required=True,
        help="List of hashtags like '#nyc' '#food'",
    )
    parser.add_argument(
        "--payload",
        type=str,
        required=True,
        help="Base payload JSON matching the predict API body.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="If set, emit a JSON object suitable for the web API.",
    )
    args = parser.parse_args()

    paths = project_paths()
    model_path = (paths.root / args.model).resolve()

    try:
        base_payload = json.loads(args.payload)
    except Exception as exc:  # pragma: no cover - defensive
        raise SystemExit(f"Invalid --payload JSON: {exc}") from exc

    base_pred = predict_views_single(model_path, base_payload).predicted_views

    results = []
    for tag in args.hashtags:
        delta = hashtag_delta(model_path, base_payload, tag)
        pct_change = 0.0
        if base_pred:
            pct_change = float(round((delta / base_pred) * 100.0, 1))
        results.append(
            {
                "hashtag": tag,
                "delta": float(delta),
                "pct_change": pct_change,
            }
        )

    if args.json:
        out = {
            "results": results,
            "base_predicted": float(base_pred),
            "is_mock": False,
        }
        print(json.dumps(out))
    else:
        print(f"Base prediction: {base_pred:.1f} views")
        for r in results:
            print(
                f"{r['hashtag']}: delta={r['delta']:+.1f} "
                f"({r['pct_change']:+.1f}% vs. base)"
            )


if __name__ == "__main__":
    main()

