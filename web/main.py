"""
TikTok Engagement Analysis Engine — web dashboard.
Run with: uvicorn web.main:app --reload
Set SITE_NAME in the environment to customize the site name (e.g. export SITE_NAME="My TikTok Lab").
"""
from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from tiktok_engine.config import project_paths
from tiktok_engine.impact import (
    PredictionOutput,
    hashtag_delta,
    predict_views_single,
    top_importance_features,
)

# Configurable site name: set SITE_NAME in the environment to customize
SITE_NAME = os.environ.get("SITE_NAME", "Engagement Engine")

paths = project_paths()
app = FastAPI(title=SITE_NAME)

templates_dir = paths.root / "web" / "templates"
templates_dir.mkdir(parents=True, exist_ok=True)
templates = Jinja2Templates(directory=str(templates_dir))

static_dir = paths.root / "web" / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/health")
async def health() -> str:
    """Simple health check so curl gets visible output."""
    return "OK"


def _load_latest_model_path() -> Path:
    m = paths.models_dir / "latest.joblib"
    if not m.exists():
        raise RuntimeError("No model found. Train one first: python scripts/train_model.py --data data/train.csv --region NYC")
    return m


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "site_name": SITE_NAME,
            "prediction": None,
            "payload": None,
            "delta": None,
            "what_if_hashtag": "",
        },
    )


@app.post("/predict", response_class=HTMLResponse)
async def predict(
    request: Request,
    video_duration_s: float = Form(...),
    hashtags: str = Form(""),
    sound_popularity: float = Form(...),
    posted_at: str = Form(""),
    region: str = Form("NYC"),
    what_if_hashtag: Optional[str] = Form(None),
) -> HTMLResponse:
    import datetime as _dt
    if not posted_at:
        posted_at = _dt.datetime.utcnow().isoformat(timespec="seconds")

    payload = {
        "video_duration_s": video_duration_s,
        "hashtags": hashtags,
        "sound_popularity": sound_popularity,
        "posted_at": posted_at,
        "region": region,
    }

    model_path = _load_latest_model_path()
    pred: PredictionOutput = predict_views_single(model_path, payload)

    delta_val: Optional[float] = None
    if what_if_hashtag:
        delta_val = hashtag_delta(model_path, payload, what_if_hashtag)

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "site_name": SITE_NAME,
            "prediction": pred,
            "payload": payload,
            "delta": delta_val,
            "what_if_hashtag": what_if_hashtag or "",
        },
    )


@app.get("/sweet-spot.png")
async def sweet_spot() -> StreamingResponse:
    data_path = paths.data_dir / "train.csv"
    if not data_path.exists():
        raise RuntimeError("Missing data/train.csv. Generate or download data first.")
    df = pd.read_csv(data_path)
    df = df.dropna(subset=["video_duration_s", "hashtags", "views"])

    dur = df["video_duration_s"].to_numpy(dtype=float)
    hash_count = df["hashtags"].fillna("").map(lambda s: len(str(s).split())).to_numpy(dtype=float)
    views = df["views"].to_numpy(dtype=float)

    fig = plt.figure(figsize=(6, 4))
    ax = fig.add_subplot(111)
    sc = ax.scatter(dur, hash_count, c=views, cmap="viridis", alpha=0.6)
    ax.set_xlabel("Video duration (s)")
    ax.set_ylabel("Hashtag count")
    ax.set_title("Sweet Spot: Duration × Hashtag Count × Views")
    fig.colorbar(sc, ax=ax, label="Views")

    buf = io.BytesIO()
    plt.tight_layout()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@app.get("/views-vs-likes.png")
async def views_vs_likes() -> StreamingResponse:
    data_path = paths.data_dir / "train.csv"
    if not data_path.exists():
        raise RuntimeError("Missing data/train.csv.")
    df = pd.read_csv(data_path)
    if "likes" not in df.columns:
        raise RuntimeError("Dataset has no `likes` column.")

    fig = plt.figure(figsize=(6, 4))
    ax = fig.add_subplot(111)
    ax.scatter(df["views"], df["likes"], alpha=0.4)
    ax.set_xlabel("Views")
    ax.set_ylabel("Likes")
    ax.set_title("Views vs. Likes")

    buf = io.BytesIO()
    plt.tight_layout()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@app.get("/hashtag-impact.png")
async def hashtag_impact() -> StreamingResponse:
    runs_dir = paths.runs_dir
    cands = sorted(runs_dir.glob("feature_importance_*.csv"))
    if not cands:
        raise RuntimeError("No feature importance file found. Train a model first.")
    latest = cands[-1]

    top = top_importance_features(latest, k=10)
    labels = [name for name, _score in top]
    values = [score for _name, score in top]

    fig = plt.figure(figsize=(7, 4))
    ax = fig.add_subplot(111)
    y_pos = np.arange(len(labels))
    ax.barh(y_pos, values)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels)
    ax.invert_yaxis()
    ax.set_xlabel("Importance")
    ax.set_title("Top Feature Importances")

    buf = io.BytesIO()
    plt.tight_layout()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
