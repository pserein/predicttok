from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GridSearchCV, KFold, train_test_split
from sklearn.pipeline import Pipeline

from .config import project_paths
from .data import now_utc_compact
from .features import FeatureSpec, build_model_input, build_preprocessor

try:
    from xgboost import XGBRegressor
    _HAS_XGB = True
except Exception:
    XGBRegressor = None  # type: ignore
    _HAS_XGB = False


@dataclass(frozen=True)
class TrainResult:
    model_path: Path
    model_name: str
    timestamp: str
    cv_r2: float
    test_r2: float
    test_mae: float
    n_train: int
    n_test: int


def _candidate_models(random_state: int = 42) -> list[tuple[str, Any, dict[str, list[Any]]]]:
    candidates: list[tuple[str, Any, dict[str, list[Any]]]] = []

    rf = RandomForestRegressor(n_estimators=400, random_state=random_state, n_jobs=-1)
    rf_grid = {
        "reg__max_depth": [None, 12, 24],
        "reg__min_samples_split": [2, 6, 12],
        "reg__min_samples_leaf": [1, 2, 4],
        "reg__max_features": ["sqrt", 0.5],
    }
    candidates.append(("random_forest", rf, rf_grid))

    if _HAS_XGB:
        xgb = XGBRegressor(
            random_state=random_state,
            n_estimators=800,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            max_depth=8,
            reg_lambda=1.0,
            objective="reg:squarederror",
            n_jobs=-1,
        )
        xgb_grid = {
            "reg__max_depth": [5, 8, 10],
            "reg__min_child_weight": [1, 5],
            "reg__subsample": [0.8, 1.0],
            "reg__colsample_bytree": [0.8, 1.0],
        }
        candidates.append(("xgboost", xgb, xgb_grid))

    return candidates


def train_best_model(
    df: pd.DataFrame,
    *,
    feature_spec: FeatureSpec | None = None,
    test_size: float = 0.2,
    random_state: int = 42,
    cv_splits: int = 5,
) -> TrainResult:
    paths = project_paths()
    paths.models_dir.mkdir(parents=True, exist_ok=True)
    paths.runs_dir.mkdir(parents=True, exist_ok=True)
    timestamp = now_utc_compact()

    df_fe = build_model_input(df)
    X = df_fe.copy()
    y = df_fe["views"].to_numpy(dtype=float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    pre = build_preprocessor(feature_spec)
    cv = KFold(n_splits=cv_splits, shuffle=True, random_state=random_state)

    best = None
    best_name = None
    best_gs: GridSearchCV | None = None

    for name, reg, grid in _candidate_models(random_state=random_state):
        pipe = Pipeline([("pre", pre), ("reg", reg)])
        gs = GridSearchCV(
            pipe,
            param_grid=grid,
            scoring="r2",
            cv=cv,
            n_jobs=1,
            verbose=0,
        )
        gs.fit(X_train, y_train)
        if best is None or float(gs.best_score_) > float(best):
            best = float(gs.best_score_)
            best_name = name
            best_gs = gs

    assert best_gs is not None and best_name is not None

    y_pred = best_gs.predict(X_test)
    test_r2 = float(r2_score(y_test, y_pred))
    test_mae = float(mean_absolute_error(y_test, y_pred))

    model_path = paths.models_dir / f"model_{best_name}_{timestamp}.joblib"
    meta = {
        "pipeline": best_gs.best_estimator_,
        "model_name": best_name,
        "timestamp": timestamp,
        "cv_r2": float(best_gs.best_score_),
        "best_params": best_gs.best_params_,
        "feature_spec": (feature_spec or FeatureSpec()).__dict__,
    }
    dump(meta, model_path)

    latest_path = paths.models_dir / "latest.joblib"
    dump(meta, latest_path)

    metrics_path = paths.runs_dir / "metrics.csv"
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    row_df = pd.DataFrame([{
        "timestamp": timestamp,
        "model_name": best_name,
        "cv_r2": float(best_gs.best_score_),
        "test_r2": test_r2,
        "test_mae": test_mae,
        "n_train": int(len(y_train)),
        "n_test": int(len(y_test)),
    }])
    if metrics_path.exists():
        prev = pd.read_csv(metrics_path)
        row_df = pd.concat([prev, row_df], ignore_index=True)
    row_df.to_csv(metrics_path, index=False)

    _export_feature_importance(best_gs.best_estimator_, paths.runs_dir, timestamp)

    return TrainResult(
        model_path=model_path,
        model_name=best_name,
        timestamp=timestamp,
        cv_r2=float(best_gs.best_score_),
        test_r2=test_r2,
        test_mae=test_mae,
        n_train=int(len(y_train)),
        n_test=int(len(y_test)),
    )


def _export_feature_importance(best_estimator: Pipeline, runs_dir: Path, timestamp: str) -> None:
    runs_dir.mkdir(parents=True, exist_ok=True)
    reg = best_estimator.named_steps.get("reg")
    pre = best_estimator.named_steps.get("pre")
    importances = None
    if hasattr(reg, "feature_importances_"):
        importances = np.asarray(reg.feature_importances_, dtype=float)
    elif hasattr(reg, "coef_"):
        importances = np.abs(np.asarray(reg.coef_, dtype=float))
    if importances is None:
        return

    # Try to get human-readable feature names; fall back to structured names
    try:
        names = pre.get_feature_names_out()
    except Exception:
        from .features import FeatureSpec

        spec = FeatureSpec()
        names_list: list[str] = []

        # ColumnTransformer stores (name, transformer, columns)
        for name, transformer, _cols in getattr(pre, "transformers_", []):
            if name == "hashtags_tfidf":
                # Extract TF-IDF vocabulary as readable hashtag features
                tfidf = None
                if isinstance(transformer, Pipeline):
                    tfidf = transformer.named_steps.get("tfidf")
                if tfidf is not None and hasattr(tfidf, "get_feature_names_out"):
                    try:
                        vocab_names = tfidf.get_feature_names_out()
                        names_list.extend([str(v) for v in vocab_names])
                    except Exception:
                        pass
            elif name == "numeric":
                # Use the engineered numeric feature names from FeatureSpec
                names_list.extend(list(spec.numeric_cols))

        if names_list:
            names = np.array(names_list)
        else:
            names = np.array([f"feature_{i}" for i in range(len(importances))])

    n = min(len(importances), len(names))
    df_imp = pd.DataFrame({"feature": names[:n], "importance": importances[:n]}).sort_values(
        "importance", ascending=False
    )
    df_imp.head(200).to_csv(runs_dir / f"feature_importance_{timestamp}.csv", index=False)
