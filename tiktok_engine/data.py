from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

import numpy as np
import pandas as pd

RE_HASHTAG = re.compile(r"(?:^|\s)#([A-Za-z0-9_]+)")


@dataclass(frozen=True)
class Dataset:
    df: pd.DataFrame
    anomalies: pd.DataFrame


def normalize_hashtags(raw: str | float | None) -> str:
    if raw is None or (isinstance(raw, float) and np.isnan(raw)):
        return ""
    s = str(raw).strip()
    if not s:
        return ""
    tags = [m.group(1).lower() for m in RE_HASHTAG.finditer(s)]
    if not tags and ("," in s or " " in s):
        tokens = re.split(r"[\s,]+", s)
        tags = [t.lstrip("#").lower() for t in tokens if t.strip()]
    tags = [t for t in tags if t]
    return " ".join(f"#{t}" for t in tags)


def top_hashtags(hashtags_series: Iterable[str], top_k: int = 10) -> list[str]:
    counts: dict[str, int] = {}
    for s in hashtags_series:
        s = normalize_hashtags(s)
        for tok in s.split():
            if tok.startswith("#") and len(tok) > 1:
                counts[tok] = counts.get(tok, 0) + 1
    return [t for t, _ in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:top_k]]


def load_dataset_csv(path: str, *, region: str | None = None) -> Dataset:
    df = pd.read_csv(path)

    required = {"views", "video_duration_s", "hashtags", "sound_popularity", "posted_at"}
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Missing required columns: {missing}. Found: {sorted(df.columns)}")

    df["views"] = pd.to_numeric(df["views"], errors="coerce").fillna(0).astype(int)
    if "likes" in df.columns:
        df["likes"] = pd.to_numeric(df["likes"], errors="coerce").fillna(0).astype(int)
    df["video_duration_s"] = pd.to_numeric(df["video_duration_s"], errors="coerce").fillna(0.0).astype(float)
    df["sound_popularity"] = pd.to_numeric(df["sound_popularity"], errors="coerce").fillna(0.0).clip(0.0, 1.0)
    df["posted_at"] = pd.to_datetime(df["posted_at"], errors="coerce", utc=False)
    if df["posted_at"].isna().any():
        raise ValueError("Some posted_at values could not be parsed (use ISO timestamps).")
    df["hashtags"] = df["hashtags"].map(normalize_hashtags)

    if "region" in df.columns:
        df["region"] = df["region"].astype(str)
    elif region is not None:
        df["region"] = str(region)
    else:
        df["region"] = "UNKNOWN"

    if region is not None:
        df = df[df["region"].astype(str).str.upper() == str(region).upper()].copy()

    anomalies = isolate_viral_anomalies(df)
    df_clean = df.loc[~df.index.isin(anomalies.index)].copy()
    return Dataset(df=df_clean, anomalies=anomalies)


def isolate_viral_anomalies(df: pd.DataFrame, sigma: float = 3.0) -> pd.DataFrame:
    views = df["views"].to_numpy(dtype=float)
    mu, sd = float(np.mean(views)), float(np.std(views))
    if sd == 0:
        return df.iloc[0:0].copy()
    thresh = mu + sigma * sd
    mask = df["views"] > thresh
    out = df.loc[mask].copy()
    if not out.empty:
        out["anomaly_reason"] = f"views > mean + {sigma}*std"
        out["anomaly_threshold"] = thresh
    return out


def now_utc_compact() -> str:
    return datetime.utcnow().strftime("%Y%m%d_%H%M%S")
