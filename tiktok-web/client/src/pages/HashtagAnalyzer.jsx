import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Plus, X, TrendingUp, Zap } from "lucide-react";
import { api } from "../lib/api.js";
import { useApi } from "../hooks/useApi.js";
import { Spinner, Loading, ErrorState, MockBadge, SectionHeader } from "../components/UI.jsx";

export default function HashtagAnalyzer() {
  const [tags, setTags]     = useState(["#NYC", "#fyp", "#brooklyn", "#food", "#nyclife"]);
  const [input, setInput]   = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const trending = useApi(() => api.trendingHashtags());

  const BASE_PAYLOAD = {
    video_duration_s: 20,
    hashtags: "",
    sound_popularity: 0.7,
    posted_at: new Date().toISOString(),
    region: "NYC",
  };

  const addTag = () => {
    const t = input.trim().startsWith("#") ? input.trim() : `#${input.trim()}`;
    if (t.length > 1 && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setInput("");
  };

  const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag));

  const analyze = async () => {
    if (!tags.length) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.hashtagImpact(BASE_PAYLOAD, tags);
      setResults(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const chartData = results?.results
    ?.sort((a, b) => b.delta - a.delta)
    ?.map((r) => ({ ...r, fill: r.delta >= 0 ? "#FE2C55" : "#69C9D0" }));

  return (
    <div className="space-y-10">
      <SectionHeader
        label="Hashtag Impact Analyzer"
        title="How much does each tag actually add?"
        sub="Compare the marginal view count change of any hashtag against your base prediction for the NYC region."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Tag builder ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="card p-5">
            <p className="font-display font-semibold text-white mb-4">Your Tags</p>

            {/* Input */}
            <div className="flex gap-2 mb-4">
              <input
                className="input-field flex-1"
                placeholder="#hashtag"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <button onClick={addTag} className="btn-primary px-3 py-2">
                <Plus size={16} />
              </button>
            </div>

            {/* Tag list */}
            <div className="flex flex-wrap gap-2 min-h-[60px]">
              {tags.map((tag) => (
                <span key={tag} className="tag-pill cursor-default">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {!tags.length && (
                <p className="text-zinc-600 font-mono text-xs">Add at least one hashtag</p>
              )}
            </div>

            <button
              onClick={analyze}
              disabled={loading || !tags.length}
              className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner /> Analyzing…</> : <><Zap size={15} /> Analyze Impact</>}
            </button>
            {error && <p className="text-signal text-xs font-mono mt-2">{error}</p>}
          </div>

          {/* Trending tags */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-signal" />
              <p className="font-display font-semibold text-white text-sm">Trending NYC</p>
              {trending.data?.is_mock && <span className="text-[10px] font-mono text-amber-400">demo</span>}
            </div>

            {trending.loading && <Loading label="Loading trends…" />}
            {trending.data?.hashtags && (
              <div className="space-y-2">
                {trending.data.hashtags.map(({ tag, count }, i) => (
                  <button
                    key={tag}
                    onClick={() => !tags.includes(tag) && setTags((p) => [...p, tag])}
                    className="w-full flex items-center gap-3 group hover:bg-ink-soft rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <span className="font-mono text-xs text-zinc-600 w-4">{i + 1}</span>
                    <span className="font-mono text-sm text-zinc-300 group-hover:text-white flex-1 text-left transition-colors">
                      {tag}
                    </span>
                    <span className="font-mono text-xs text-zinc-600">{count.toLocaleString()}</span>
                    {!tags.includes(tag) && (
                      <Plus size={12} className="text-zinc-600 group-hover:text-signal transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Results chart ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 card p-6">
          {!results && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-signal/10 border border-signal/20 flex items-center justify-center">
                <Zap size={22} className="text-signal" />
              </div>
              <p className="font-display font-semibold text-white">Run an analysis</p>
              <p className="font-body text-zinc-500 text-sm max-w-xs">
                Select hashtags and click Analyze Impact to see which tags help or hurt your reach.
              </p>
            </div>
          )}

          {loading && <Loading label="Computing hashtag deltas…" />}

          {results && chartData && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-display font-semibold text-white">View Delta per Hashtag</p>
                  <p className="font-body text-zinc-500 text-sm">
                    Base prediction: <span className="text-white font-mono">{results.base_predicted?.toLocaleString()}</span> views
                  </p>
                </div>
                {results.is_mock && <MockBadge />}
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 40, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v > 0 ? "+" : ""}${(v / 1000).toFixed(1)}K`} />
                  <YAxis type="category" dataKey="hashtag" width={75} tick={{ fontSize: 12, fontFamily: "DM Mono" }} />
                  <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-ink-muted border border-zinc-750 rounded-xl px-3 py-2 text-xs font-mono">
                          <p className="text-white font-semibold mb-1">{d.hashtag}</p>
                          <p style={{ color: d.delta >= 0 ? "#FE2C55" : "#69C9D0" }}>
                            Delta: {d.delta >= 0 ? "+" : ""}{d.delta.toLocaleString()} views
                          </p>
                          <p className="text-zinc-400">{d.pct_change >= 0 ? "+" : ""}{d.pct_change}%</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="bg-ink-soft border border-zinc-750 rounded-xl p-3 text-center">
                  <p className="font-mono text-xs text-zinc-500 mb-1">Best Tag</p>
                  <p className="font-display font-bold text-signal text-sm">
                    {chartData[0]?.hashtag}
                  </p>
                  <p className="font-mono text-xs text-zinc-600">+{chartData[0]?.delta?.toLocaleString()}</p>
                </div>
                <div className="bg-ink-soft border border-zinc-750 rounded-xl p-3 text-center">
                  <p className="font-mono text-xs text-zinc-500 mb-1">Avg Delta</p>
                  <p className="font-display font-bold text-white text-sm">
                    {Math.round(chartData.reduce((s, d) => s + d.delta, 0) / chartData.length).toLocaleString()}
                  </p>
                </div>
                <div className="bg-ink-soft border border-zinc-750 rounded-xl p-3 text-center">
                  <p className="font-mono text-xs text-zinc-500 mb-1">Tags Analyzed</p>
                  <p className="font-display font-bold text-cyan-tik text-sm">{chartData.length}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
