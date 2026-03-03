import { useState } from "react";
import { ArrowRight, Clock, Music, Hash, MapPin } from "lucide-react";
import { api } from "../lib/api.js";
import { Spinner, MockBadge } from "../components/UI.jsx";

const QUICK_HASHTAGS = ["#NYC", "#fyp", "#brooklyn", "#food", "#nyclife", "#tech", "#viral", "#trending"];

function ViewMeter({ value, max = 100000 }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct > 70 ? "#22c55e" : pct > 40 ? "#FE2C55" : "#69C9D0";
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function Predict() {
  const [form, setForm] = useState({
    video_duration_s: 18,
    hashtags: "#NYC #fyp #brooklyn",
    sound_popularity: 0.72,
    posted_at: new Date().toISOString().slice(0, 16),
    region: "NYC",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleTag = (tag) => {
    const current = form.hashtags.trim();
    const tags = current ? current.split(/\s+/) : [];
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    set("hashtags", next.join(" "));
  };

  const hasTag = (tag) => form.hashtags.split(/\s+/).includes(tag);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.predict({
        ...form,
        video_duration_s: Number(form.video_duration_s),
        sound_popularity: Number(form.sound_popularity),
        posted_at: new Date(form.posted_at).toISOString(),
      });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <p className="section-label mb-2">Prediction Tool</p>
        <h1 className="font-display font-black text-4xl text-white">
          What will your video <span className="text-signal">reach?</span>
        </h1>
        <p className="text-zinc-400 mt-2">Enter your planned video details to get a machine learning view estimate and confidence interval.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Form ─────────────────────────────────────────────────────── */}
        <div className="card p-6 space-y-6">
          {/* Duration */}
          <div>
            <label className="flex items-center gap-2 text-zinc-300 font-body text-sm mb-3">
              <Clock size={14} className="text-signal" /> Video Duration
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range" min={5} max={180} step={1}
                value={form.video_duration_s}
                onChange={(e) => set("video_duration_s", e.target.value)}
                className="flex-1 accent-signal"
              />
              <span className="font-mono text-signal text-sm w-14 text-right">
                {form.video_duration_s}s
              </span>
            </div>
            <div className="flex justify-between mt-1">
              {[7, 15, 30, 60, 180].map((v) => (
                <button
                  key={v}
                  onClick={() => set("video_duration_s", v)}
                  className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                    Number(form.video_duration_s) === v
                      ? "text-signal bg-signal/10"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {v}s
                </button>
              ))}
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <label className="flex items-center gap-2 text-zinc-300 font-body text-sm mb-3">
              <Hash size={14} className="text-signal" /> Hashtags
            </label>
            <input
              className="input-field mb-3"
              placeholder="#NYC #fyp #brooklyn"
              value={form.hashtags}
              onChange={(e) => set("hashtags", e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_HASHTAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-all ${
                    hasTag(tag)
                      ? "bg-signal/15 border-signal/40 text-signal"
                      : "border-zinc-750 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Sound popularity */}
          <div>
            <label className="flex items-center gap-2 text-zinc-300 font-body text-sm mb-3">
              <Music size={14} className="text-signal" /> Sound Popularity
              <span className="ml-auto font-mono text-signal text-xs">
                {Math.round(Number(form.sound_popularity) * 100)}%
              </span>
            </label>
            <input
              type="range" min={0} max={1} step={0.01}
              value={form.sound_popularity}
              onChange={(e) => set("sound_popularity", e.target.value)}
              className="w-full accent-signal"
            />
            <div className="flex justify-between mt-1 text-xs font-mono text-zinc-600">
              <span>Niche</span><span>Trending</span>
            </div>
          </div>

          {/* Region + Post time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-zinc-300 font-body text-sm mb-2">
                <MapPin size={14} className="text-signal" /> Region
              </label>
              <select
                className="input-field"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
              >
                <option value="NYC">New York City</option>
                <option value="LA">Los Angeles</option>
                <option value="CHI">Chicago</option>
                <option value="MIA">Miami</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-300 font-body text-sm mb-2 block">Post Time</label>
              <input
                type="datetime-local"
                className="input-field"
                value={form.posted_at}
                onChange={(e) => set("posted_at", e.target.value)}
              />
            </div>
          </div>

          <button onClick={submit} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Predicting…</> : <>Predict Views <ArrowRight size={16} /></>}
          </button>

          {error && <p className="text-signal font-mono text-xs text-center">{error}</p>}
        </div>

        {/* ── Result ───────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {result ? (
            <>
              {result.is_mock && <MockBadge />}
              <div className="card p-6 space-y-5">
                <p className="section-label">Predicted Reach</p>
                <div className="text-center py-4">
                  <p className="font-display font-black text-6xl text-white glow-text">
                    {result.predicted_views.toLocaleString()}
                  </p>
                  <p className="font-mono text-zinc-500 text-sm mt-2">estimated views</p>
                </div>

                <ViewMeter value={result.predicted_views} />

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-ink-soft border border-zinc-750 rounded-xl p-3 text-center">
                    <p className="font-mono text-xs text-zinc-500 mb-1">Lower bound</p>
                    <p className="font-display font-bold text-cyan-tik">
                      {result.lower_ci.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-ink-soft border border-zinc-750 rounded-xl p-3 text-center">
                    <p className="font-mono text-xs text-zinc-500 mb-1">Upper bound</p>
                    <p className="font-display font-bold text-cyan-tik">
                      {result.upper_ci.toLocaleString()}
                    </p>
                  </div>
                </div>

                {result.model_name && (
                  <p className="font-mono text-xs text-zinc-600 text-center">
                    Model: {result.model_name}
                  </p>
                )}
              </div>

              {/* Tips */}
              <div className="card p-5 space-y-3">
                <p className="font-display font-semibold text-white text-sm">Optimization Tips</p>
                <ul className="space-y-2">
                  {form.video_duration_s < 15 && (
                    <li className="flex items-start gap-2 text-xs font-body text-zinc-400">
                      <span className="text-amber-400 mt-0.5">→</span>
                      Try a duration between 15 and 25 seconds since the model shows this range peaks for NYC content.
                    </li>
                  )}
                  {form.hashtags.split(/\s+/).filter(t => t).length < 4 && (
                    <li className="flex items-start gap-2 text-xs font-body text-zinc-400">
                      <span className="text-amber-400 mt-0.5">→</span>
                      Adding 4–8 hashtags typically increases predicted views by 15–20%.
                    </li>
                  )}
                  {Number(form.sound_popularity) < 0.5 && (
                    <li className="flex items-start gap-2 text-xs font-body text-zinc-400">
                      <span className="text-amber-400 mt-0.5">→</span>
                      Using a trending sound (50%+ popularity) correlates with higher reach.
                    </li>
                  )}
                  <li className="flex items-start gap-2 text-xs font-body text-zinc-400">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    Post between 6–9pm EST on weekdays for maximum NYC engagement window.
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="card p-10 flex flex-col items-center justify-center text-center gap-4 h-full min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-signal/10 border border-signal/20 flex items-center justify-center">
                <ArrowRight size={24} className="text-signal" />
              </div>
              <p className="font-display font-semibold text-white">Fill in your video details</p>
              <p className="font-body text-zinc-500 text-sm max-w-xs">
                Adjust the sliders and hashtags on the left, then hit Predict to get your estimated view count.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
