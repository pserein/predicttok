from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Paths:
    root: Path

    @property
    def data_dir(self) -> Path:
        return self.root / "data"

    @property
    def models_dir(self) -> Path:
        return self.root / "models"

    @property
    def runs_dir(self) -> Path:
        return self.root / "runs"


def project_paths() -> Paths:
    root = Path(__file__).resolve().parents[1]
    return Paths(root=root)
