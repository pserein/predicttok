from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd
from joblib import load

from .data import normalize_hashtags
from .features import add_engineered_features


@dataclass(frozen=True)
class PredictionOutput:
    predicted_views: float
    lower_ci: float
    upper_ci: float


def _load_model(model_path: str | Path):
    obj = load(model_path)
    return obj["pipeline"], obj


def predict_views_single(model_path: str | Path, payload: dict) -> PredictionOutput:
    pipeline, meta = _load_model(model_path)
    df = pd.DataFrame([payload])
    df["hashtags"] = df["hashtags"].map(normalize_hashtags)
    df = add_engineered_features(df)

    y_pred = pipeline.predict(df)[0]
    mae = float(meta.get("test_mae", meta.get("cv_mae", 500.0))) if isinstance(meta, dict) else 500.0
    lower = float(max(y_pred - 1.0 * mae, 0.0))
    upper = float(max(y_pred + 1.0 * mae, 0.0))
    return PredictionOutput(predicted_views=float(y_pred), lower_ci=lower, upper_ci=upper)


def hashtag_delta(model_path: str | Path, payload: dict, hashtag: str) -> float:
    hashtag_norm = normalize_hashtags(hashtag)
    if not hashtag_norm:
        return 0.0
    tag = hashtag_norm.split()[0]

    base_pred = predict_views_single(model_path, dict(payload)).predicted_views

    with_tag = dict(payload)
    current = normalize_hashtags(with_tag.get("hashtags", ""))
    tokens = current.split()
    if tag not in tokens:
        tokens.append(tag)
    with_tag["hashtags"] = " ".join(tokens)
    added = predict_views_single(model_path, with_tag).predicted_views
    return float(added - base_pred)


def top_importance_features(importances_csv: str | Path, k: int = 3) -> list[tuple[str, float]]:
    df = pd.read_csv(importances_csv)
    df_sorted = df.sort_values("importance", ascending=False).head(k)
    return list(zip(df_sorted["feature"].tolist(), df_sorted["importance"].astype(float).tolist()))
