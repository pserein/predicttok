import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, RefreshCw, BarChart2, Hash } from "lucide-react";

const FEATURES = [
  {
    Icon: Zap,
    title: "Predict View Counts",
    desc: "Enter your hashtags, video length, and sound. Get a machine learning view estimate and confidence interval in under two seconds.",
    href: "/predict",
    color: "text-signal",
    bg: "bg-signal/10 border-signal/20",
  },
  {
    Icon: BarChart2,
    title: "Sweet Spot Dashboard",
    desc: "Use interactive charts to find the perfect balance between video duration and hashtag density to maximize your reach.",
    href: "/dashboard",
    color: "text-cyan-tik",
    bg: "bg-cyan-tik/10 border-cyan-tik/20",
  },
  {
    Icon: Hash,
    title: "Hashtag Impact Analyzer",
    desc: "See exactly how many views each hashtag adds or subtracts from your total. Results are weighted for the NYC region.",
    href: "/hashtags",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
  {
    Icon: RefreshCw,
    title: "Drift Aware Retraining",
    desc: "The model stays accurate by auto-updating when NYC trends shift by more than 30%. This keeps the prediction strength at 0.85 R² or higher.",
    href: "/metrics",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
];

const STATS = [
  { value: "19K+",  label: "TikTok records" },
  { value: "0.85",  label: "R² target" },
  { value: "<2s",   label: "prediction time" },
  { value: "NYC",   label: "region-weighted" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-24">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-10 pb-4 relative">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-signal/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl">
          <p className="section-label mb-4 animate-fade-up opacity-0 delay-100">
            New York, NY · Portfolio Project · Dec 2026
          </p>

          <h1 className="font-display font-black text-5xl md:text-7xl leading-[0.95] tracking-tight text-white mb-6 animate-fade-up opacity-0 delay-200">
            Stop guessing on <br />
            <span className="text-signal glow-text">TikTok.</span>
          </h1>

          <p className="font-body text-zinc-400 text-lg md:text-xl max-w-xl leading-relaxed mb-10 animate-fade-up opacity-0 delay-300">
            This engine predicts which hashtags, sounds, and durations actually trigger the TikTok algorithm. It is trained on 19K real posts with a 0.85 R² score.
          </p>

          <div className="flex flex-wrap gap-3 animate-fade-up opacity-0 delay-400">
            <button onClick={() => navigate("/predict")} className="btn-primary flex items-center gap-2">
              Try a Prediction <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate("/dashboard")} className="btn-ghost">
              Explore Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up opacity-0 delay-500">
        {STATS.map(({ value, label }) => (
          <div key={label} className="card p-5 text-center">
            <p className="font-display font-black text-3xl text-white mb-1">{value}</p>
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section>
        <p className="section-label mb-3">What's inside</p>
        <h2 className="font-display font-bold text-3xl text-white mb-10">
          The full data lifecycle
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map(({ Icon, title, desc, href, color, bg }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="card p-6 text-left group hover:border-zinc-600 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <h3 className="font-display font-semibold text-white text-lg mb-2">{title}</h3>
              <p className="font-body text-zinc-400 text-sm leading-relaxed">{desc}</p>
              <div className={`flex items-center gap-1 mt-4 text-xs font-mono ${color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Open <ArrowRight size={12} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Tech stack ───────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-750 pt-12">
        <p className="section-label mb-6">Built with</p>
        <div className="flex flex-wrap gap-2">
          {["Python", "NumPy", "Pandas", "Scikit-learn", "XGBoost", "TF-IDF",
            "React", "Tailwind CSS", "Node/Express", "Recharts", "joblib"].map((t) => (
            <span key={t} className="font-mono text-xs text-zinc-400 bg-ink-muted border border-zinc-750 px-3 py-1.5 rounded-lg">
              {t}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
