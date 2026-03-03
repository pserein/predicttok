from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .config import project_paths
from .data import top_hashtags
from .modeling import TrainResult, train_best_model


@dataclass(frozen=True)
class DriftReport:
    train_top: list[str]
    current_top: list[str]
    overlap: float
    retrain_triggered: bool
    retrain_result: TrainResult | None


def hashtag_overlap(train_tags: list[str], current_tags: list[str]) -> float:
    train_set = {t for t in train_tags if t}
    curr_set = {t for t in current_tags if t}
    if not train_set or not curr_set:
        return 0.0
    return len(train_set & curr_set) / float(len(train_set))


def check_drift_and_optionally_retrain(
    train_data: pd.DataFrame,
    trends_csv: str,
    *,
    region: str = "NYC",
    top_k: int = 10,
    min_overlap: float = 0.7,
) -> DriftReport:
    train_region = train_data.copy()
    if "region" in train_region.columns:
        train_region = train_region[train_region["region"].astype(str).str.upper() == region.upper()]
    train_top = top_hashtags(train_region["hashtags"], top_k=top_k)

    trends = pd.read_csv(trends_csv)
    if "region" in trends.columns:
        trends = trends[trends["region"].astype(str).str.upper() == region.upper()]
    if "hashtags" in trends.columns:
        current_top = top_hashtags(trends["hashtags"], top_k=top_k)
    elif "hashtag" in trends.columns:
        current_top = top_hashtags(trends["hashtag"], top_k=top_k)
    else:
        raise ValueError("Trends CSV must have 'hashtags' or 'hashtag' column.")

    ov = hashtag_overlap(train_top, current_top)
    trigger = ov < min_overlap

    retrain_result: TrainResult | None = None
    if trigger:
        retrain_result = train_best_model(train_region)

    paths = project_paths()
    paths.runs_dir.mkdir(parents=True, exist_ok=True)
    log_path = paths.runs_dir / "drift_log.csv"
    row = pd.DataFrame([{
        "train_top": " ".join(train_top),
        "current_top": " ".join(current_top),
        "overlap": ov,
        "retrain_triggered": trigger,
        "region": region,
    }])
    if log_path.exists():
        prev = pd.read_csv(log_path)
        row = pd.concat([prev, row], ignore_index=True)
    row.to_csv(log_path, index=False)

    return DriftReport(
        train_top=train_top,
        current_top=current_top,
        overlap=ov,
        retrain_triggered=trigger,
        retrain_result=retrain_result,
    )
