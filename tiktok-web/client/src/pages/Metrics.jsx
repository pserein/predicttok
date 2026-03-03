import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useApi } from "../hooks/useApi.js";
import { api } from "../lib/api.js";
import { Loading, ErrorState, MockBadge, StatCard, SectionHeader } from "../components/UI.jsx";
import { CheckCircle, RefreshCw } from "lucide-react";

const PIPELINE_STEPS = [
  { step: "01", label: "Load & Validate CSV",   desc: "19K+ records, schema checks, type coercion" },
  { step: "02", label: "Anomaly Isolation",      desc: "Viral outliers (>3σ) removed before training" },
  { step: "03", label: "Feature Engineering",   desc: "Hashtag density, TF-IDF, posting time, NYC flag" },
  { step: "04", label: "GridSearchCV Tuning",   desc: "XGBoost vs RF, 5-fold K-Fold, best params saved" },
  { step: "05", label: "Model Versioning",       desc: "joblib timestamped snapshots + latest.joblib" },
  { step: "06", label: "Drift Detection",        desc: "Weekly NYC hashtag overlap check (>30% → retrain)" },
];

function formatTs(ts) {
  if (!ts) return "";
  const s = String(ts);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(9, 11)}:${s.slice(11, 13)}`;
}

export default function Metrics() {
  const { data, loading, error, refetch } = useApi(() => api.metrics());

  return (
    <div className="space-y-10">
      <SectionHeader
        label="Model Metrics"
        title="Performance & MLOps"
        sub="Live training history, feature importances, and drift detection log for Predicttok."
      />

      {loading && <Loading label="Loading metrics…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <>
          {data.is_mock && <MockBadge />}

          {/* ── Key stats ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Latest R²"
              value={data.latest?.test_r2?.toFixed(3) ?? ""}
              sub={`CV R²: ${data.latest?.cv_r2?.toFixed(3)}`}
              accent
            />
            <StatCard
              label="Test MAE"
              value={`±${Math.round(data.latest?.test_mae ?? 0).toLocaleString()}`}
              sub="views accuracy"
            />
            <StatCard
              label="Training Set"
              value={(data.latest?.n_train ?? 0).toLocaleString()}
              sub={`${(data.latest?.n_test ?? 0).toLocaleString()} test`}
            />
            <StatCard
              label="Best Model"
              value={data.latest?.model_name === "xgboost" ? "XGBoost" : "RF"}
              sub={formatTs(data.latest?.timestamp)}
            />
          </div>

          {/* ── R² history chart ─────────────────────────────────────────── */}
          <section className="card p-6">
            <p className="font-display font-semibold text-white mb-1">R² Over Training Runs</p>
            <p className="font-body text-zinc-500 text-sm mb-6">
              Each point is a full GridSearchCV run with K-Fold Cross-Validation.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.runs} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={(t) => `${String(t).slice(4, 6)}/${String(t).slice(6, 8)}`} />
                <YAxis domain={[0.7, 1]} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-ink-muted border border-zinc-750 rounded-xl px-3 py-2 text-xs font-mono">
                        <p className="text-zinc-400 mb-1">{formatTs(d.timestamp)}</p>
                        <p className="text-signal">Test R²: {d.test_r2?.toFixed(4)}</p>
                        <p className="text-cyan-tik">CV R²: {d.cv_r2?.toFixed(4)}</p>
                        <p className="text-zinc-400">MAE: ±{Math.round(d.test_mae)}</p>
                        <p className="text-zinc-500">{d.model_name}</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="test_r2" name="Test R²" stroke="#FE2C55" strokeWidth={2} dot={{ fill: "#FE2C55", r: 4 }} />
                <Line type="monotone" dataKey="cv_r2"   name="CV R²"   stroke="#69C9D0" strokeWidth={2} dot={{ fill: "#69C9D0", r: 4 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-end">
              {[["#FE2C55", "Test R²"], ["#69C9D0", "CV R²"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5" style={{ backgroundColor: c }} />
                  <span className="text-xs font-mono text-zinc-500">{l}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Feature importances ───────────────────────────────────────── */}
          {data.importances?.length > 0 && (
            <section className="card p-6">
              <p className="font-display font-semibold text-white mb-1">Top Feature Importances</p>
              <p className="font-body text-zinc-500 text-sm mb-6">
                Which variables most drive the model's predictions.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.importances.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 140, right: 30, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
                  <YAxis type="category" dataKey="feature" width={130}
                    tick={{ fontSize: 11, fontFamily: "DM Mono", fill: "#a1a1aa" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-ink-muted border border-zinc-750 rounded-xl px-3 py-2 text-xs font-mono">
                          <p className="text-white mb-1">{d.feature}</p>
                          <p className="text-signal">{(d.importance * 100).toFixed(2)}% importance</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {data.importances.slice(0, 10).map((_, i) => (
                      <Cell key={i}
                        fill={i === 0 ? "#FE2C55" : i < 3 ? "#f97316" : "#3f3f46"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* ── ML Pipeline steps ─────────────────────────────────────────── */}
          <section className="card p-6">
            <p className="font-display font-semibold text-white mb-6">ML Pipeline Architecture</p>
            <div className="grid md:grid-cols-2 gap-3">
              {PIPELINE_STEPS.map(({ step, label, desc }) => (
                <div key={step} className="flex items-start gap-4 p-4 bg-ink-soft border border-zinc-750 rounded-xl">
                  <span className="font-mono text-xs text-signal bg-signal/10 border border-signal/20 px-2 py-1 rounded-lg shrink-0">
                    {step}
                  </span>
                  <div>
                    <p className="font-display font-semibold text-white text-sm">{label}</p>
                    <p className="font-body text-zinc-500 text-xs mt-0.5">{desc}</p>
                  </div>
                  <CheckCircle size={14} className="text-emerald-400 shrink-0 ml-auto mt-0.5" />
                </div>
              ))}
            </div>
          </section>

          {/* ── Drift log ────────────────────────────────────────────────── */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw size={16} className="text-signal" />
              <p className="font-display font-semibold text-white">Drift Detection Log</p>
            </div>
            {data.drift_log?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-750 text-zinc-500">
                      <th className="text-left py-2 pr-4">Region</th>
                      <th className="text-left py-2 pr-4">Overlap</th>
                      <th className="text-left py-2 pr-4">Retrain?</th>
                      <th className="text-left py-2">Current Top Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.drift_log.slice(-5).map((row, i) => (
                      <tr key={i} className="border-b border-zinc-800">
                        <td className="py-2 pr-4 text-zinc-300">{row.region}</td>
                        <td className="py-2 pr-4" style={{ color: parseFloat(row.overlap) < 0.7 ? "#FE2C55" : "#22c55e" }}>
                          {(parseFloat(row.overlap) * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            row.retrain_triggered === "true" || row.retrain_triggered === true
                              ? "bg-signal/15 text-signal"
                              : "bg-emerald-400/10 text-emerald-400"
                          }`}>
                            {(row.retrain_triggered === "true" || row.retrain_triggered === true) ? "Triggered" : "Stable"}
                          </span>
                        </td>
                        <td className="py-2 text-zinc-500 truncate max-w-[200px]">{row.current_top}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="font-mono text-zinc-600 text-xs">
                No drift checks run yet. Run <code className="text-signal">scripts/check_drift_and_retrain.py</code> to populate this log.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
