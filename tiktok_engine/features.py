from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

from .data import normalize_hashtags


@dataclass(frozen=True)
class FeatureSpec:
    text_col: str = "hashtags"
    numeric_cols: tuple[str, ...] = (
        "video_duration_s",
        "hashtag_count",
        "hashtag_density",
        "sound_popularity",
        "posted_hour",
        "posted_dow",
        "is_weekend",
        "is_nyc",
    )


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["hashtags"] = out["hashtags"].map(normalize_hashtags)
    out["hashtag_count"] = out["hashtags"].fillna("").map(
        lambda s: len([t for t in str(s).split() if t.startswith("#")])
    )
    out["hashtag_density"] = out["hashtag_count"] / np.maximum(out["video_duration_s"].astype(float), 1.0)

    posted = pd.to_datetime(out["posted_at"], errors="coerce")
    out["posted_hour"] = posted.dt.hour.astype(int)
    out["posted_dow"] = posted.dt.dayofweek.astype(int)
    out["is_weekend"] = posted.dt.dayofweek.isin([5, 6]).astype(int)
    out["is_nyc"] = (out.get("region", "UNKNOWN").astype(str).str.upper() == "NYC").astype(int)

    if "time_to_peak_h" in out.columns:
        out["time_to_peak_h"] = pd.to_numeric(out["time_to_peak_h"], errors="coerce").fillna(
            out["time_to_peak_h"].median()
        )
    return out


def select_single_column(X: pd.DataFrame, col: str) -> pd.Series:
    if isinstance(X, pd.DataFrame):
        return X[col]
    return pd.Series(X)


def select_numeric_columns(X: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    if isinstance(X, pd.DataFrame):
        return X[list(cols)]
    return X


def build_preprocessor(spec: FeatureSpec | None = None) -> ColumnTransformer:
    spec = spec or FeatureSpec()

    hashtag_tfidf = Pipeline(
        steps=[
            (
                "select",
                FunctionTransformer(
                    select_single_column,
                    kw_args={"col": spec.text_col},
                    validate=False,
                ),
            ),
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    token_pattern=r"#\w+",
                    ngram_range=(1, 2),
                    min_df=2,
                    max_features=5000,
                ),
            ),
        ]
    )

    numeric = Pipeline(
        steps=[
            (
                "select",
                FunctionTransformer(
                    select_numeric_columns,
                    kw_args={"cols": list(spec.numeric_cols)},
                    validate=False,
                ),
            ),
            ("scale", StandardScaler(with_mean=False)),
        ]
    )

    return ColumnTransformer(
        transformers=[
            ("hashtags_tfidf", hashtag_tfidf, spec.text_col),
            ("numeric", numeric, list(spec.numeric_cols)),
        ],
        remainder="drop",
        sparse_threshold=0.3,
    )


def build_model_input(df: pd.DataFrame) -> pd.DataFrame:
    return add_engineered_features(df)
