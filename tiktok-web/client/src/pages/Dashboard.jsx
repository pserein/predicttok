import { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import { useApi } from "../hooks/useApi.js";
import { api } from "../lib/api.js";
import { Loading, ErrorState, MockBadge, CustomTooltip, SectionHeader } from "../components/UI.jsx";

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

// ── Sweet Spot heatmap (rendered via SVG grid) ─────────────────────────────
function SweetSpotHeatmap({ points }) {
  if (!points?.length) return null;

  const durations = Array.from({ length: 12 }, (_, i) => (i + 1) * 5); // 5s..60s
  const tagCounts = Array.from({ length: 16 }, (_, i) => i); // 0..15 tags
  const maxViews = Math.max(1, ...points.map((p) => Number(p.avg_views) || 0));
  const lookup     = Object.fromEntries(points.map((p) => [`${p.duration}_${p.hashtag_count}`, p.avg_views]));

  const CELL_W = 36;
  const CELL_H = 28;
  const LEFT   = 40;
  const TOP    = 24;

  const heat = (v) => {
    const t = v / maxViews;
    if (t > 0.8) return "#22c55e";
    if (t > 0.6) return "#FE2C55";
    if (t > 0.4) return "#f97316";
    if (t > 0.2) return "#eab308";
    return "#3f3f46";
  };

  const svgW = LEFT + durations.length * CELL_W + 60;
  const svgH = TOP  + tagCounts.length  * CELL_H + 40;

  return (
    <div className="overflow-x-auto">
      <svg width={svgW} height={svgH} className="font-mono">
        {/* Y-axis label */}
        <text x={10} y={svgH / 2} fill="#71717a" fontSize={10} textAnchor="middle"
          transform={`rotate(-90, 10, ${svgH / 2})`}>Hashtags</text>

        {/* X-axis labels (duration) */}
        {durations.map((d, i) => (
          <text key={d} x={LEFT + i * CELL_W + CELL_W / 2} y={svgH - 8}
            fill="#71717a" fontSize={9} textAnchor="middle">{d}s</text>
        ))}

        {/* Y-axis labels (tag count) */}
        {tagCounts.map((t, j) => (
          <text key={t} x={LEFT - 4} y={TOP + j * CELL_H + CELL_H / 2 + 4}
            fill="#71717a" fontSize={9} textAnchor="end">{t}</text>
        ))}

        {/* Cells */}
        {durations.map((d, i) =>
          tagCounts.map((t, j) => {
            const v = lookup[`${d}_${t}`] ?? 0;
            return (
              <g key={`${d}_${t}`}>
                <rect
                  x={LEFT + i * CELL_W} y={TOP + j * CELL_H}
                  width={CELL_W - 1} height={CELL_H - 1}
                  rx={2} fill={heat(v)} opacity={0.85}
                />
                {v > maxViews * 0.75 && (
                  <text x={LEFT + i * CELL_W + CELL_W / 2} y={TOP + j * CELL_H + CELL_H / 2 + 4}
                    fill="white" fontSize={7} textAnchor="middle" fontWeight="600">
                    {fmt(v)}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 ml-10">
        {[["Low", "#3f3f46"], ["Med", "#eab308"], ["High", "#f97316"], ["Peak", "#22c55e"]].map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
            <span className="text-xs font-mono text-zinc-500">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Correlation scatter ────────────────────────────────────────────────────
function CorrelationChart({ points, mode }) {
  const xKey = mode === "likes" ? "likes" : "duration";
  const xLabel = mode === "likes" ? "Likes" : "Video Duration (s)";

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} name={xLabel} type="number"
          label={{ value: xLabel, position: "insideBottom", offset: -10, fill: "#71717a", fontSize: 11 }} />
        <YAxis dataKey="views" name="Views" tickFormatter={fmt}
          label={{ value: "Views", angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 11 }} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-ink-muted border border-zinc-750 rounded-xl px-3 py-2 text-xs font-mono">
                <p className="text-zinc-400">{xLabel}: {d?.[xKey]}</p>
                <p className="text-signal">Views: {d?.views?.toLocaleString()}</p>
              </div>
            );
          }}
        />
        <Scatter data={points} name="Videos">
          {points.map((_, i) => (
            <Cell key={i}
              fill={points[i].views > 30000 ? "#FE2C55" : points[i].views > 10000 ? "#69C9D0" : "#3f3f46"}
              opacity={0.7}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const [mode, setMode] = useState("likes");
  const sweet = useApi(() => api.sweetSpot());
  const corr  = useApi(() => api.correlations());

  return (
    <div className="space-y-10">
      <SectionHeader
        label="Dashboard"
        title="Engagement Sweet Spot"
        sub="Discover the nonlinear relationships between video attributes and total reach across 19K+ records."
      />

      {/* ── Sweet Spot ──────────────────────────────────────────────────── */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-display font-semibold text-white">Sweet Spot Heatmap</p>
            <p className="font-body text-zinc-500 text-sm mt-0.5">
              Duration × Hashtag count → Average views. Green = peak engagement.
            </p>
          </div>
          {sweet.data?.is_mock && <MockBadge />}
        </div>

        {sweet.loading && <Loading label="Building heatmap…" />}
        {sweet.error   && <ErrorState message={sweet.error} onRetry={sweet.refetch} />}
        {sweet.data    && <SweetSpotHeatmap points={sweet.data.points} />}
      </section>

      {/* ── Correlations ────────────────────────────────────────────────── */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="font-display font-semibold text-white">Correlation Explorer</p>
            <p className="font-body text-zinc-500 text-sm mt-0.5">
              Scatter view: identify nonlinear patterns in the raw dataset.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[["likes", "Views vs. Likes"], ["duration", "Views vs. Duration"]].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
                  mode === k
                    ? "bg-signal/15 border-signal/40 text-signal"
                    : "border-zinc-750 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
            {corr.data?.is_mock && <MockBadge />}
          </div>
        </div>

        {corr.loading && <Loading label="Loading scatter data…" />}
        {corr.error   && <ErrorState message={corr.error} onRetry={corr.refetch} />}
        {corr.data    && <CorrelationChart points={corr.data.points} mode={mode} />}

        <div className="flex items-center gap-4 mt-4 justify-end">
          {[["#FE2C55", "30K+ views"], ["#69C9D0", "10K–30K"], ["#3f3f46", "<10K"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-xs font-mono text-zinc-500">{l}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
