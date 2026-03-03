#!/usr/bin/env python3
"""Check NYC hashtag drift and retrain if overlap < 70%."""
from __future__ import annotations

import argparse

from tiktok_engine.data import load_dataset_csv
from tiktok_engine.drift import check_drift_and_optionally_retrain


def main() -> None:
    parser = argparse.ArgumentParser(description="Check drift and optionally retrain.")
    parser.add_argument("--data", default="data/train.csv")
    parser.add_argument("--trends", default="data/trends_nyc.csv")
    parser.add_argument("--region", default="NYC")
    args = parser.parse_args()

    dataset = load_dataset_csv(args.data, region=args.region)
    report = check_drift_and_optionally_retrain(dataset.df, args.trends, region=args.region)

    print("=== Drift report ===")
    print(f"Region: {args.region}")
    print(f"Train top hashtags: {report.train_top}")
    print(f"Current top hashtags: {report.current_top}")
    print(f"Overlap: {report.overlap * 100:.1f}%")
    print(f"Retrain triggered: {report.retrain_triggered}")
    if report.retrain_result:
        r = report.retrain_result
        print(f"New model: {r.model_path}")
        print(f"CV R²: {r.cv_r2:.4f}, Test R²: {r.test_r2:.4f}, MAE: {r.test_mae:.1f}")


if __name__ == "__main__":
    main()
