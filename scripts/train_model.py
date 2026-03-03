#!/usr/bin/env python3
"""Train TikTok engagement model and save versioned .joblib."""
from __future__ import annotations

import argparse

from tiktok_engine.data import load_dataset_csv
from tiktok_engine.modeling import train_best_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Train TikTok engagement model.")
    parser.add_argument("--data", default="data/train.csv", help="Path to training CSV.")
    parser.add_argument("--region", default="NYC", help="Region filter (e.g. NYC).")
    args = parser.parse_args()

    dataset = load_dataset_csv(args.data, region=args.region)
    print(f"Loaded {len(dataset.df)} rows for region={args.region} (excluding {len(dataset.anomalies)} anomalies).")

    result = train_best_model(dataset.df)
    print("=== Training complete ===")
    print(f"Model: {result.model_name}")
    print(f"Saved as: {result.model_path}")
    print(f"CV R²: {result.cv_r2:.4f}")
    print(f"Test R²: {result.test_r2:.4f}")
    print(f"Test MAE: {result.test_mae:.1f} views")


if __name__ == "__main__":
    main()
