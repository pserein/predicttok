import { Loader2 } from "lucide-react";
import clsx from "clsx";

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className }) {
  return <Loader2 className={clsx("animate-spin text-signal", className)} size={20} />;
}

// ── Loading state ─────────────────────────────────────────────────────────────
export function Loading({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Spinner className="w-7 h-7" />
      <p className="text-zinc-500 font-mono text-sm">{label}</p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <p className="text-signal font-mono text-sm">⚠ {message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-xs px-4 py-2">
          Retry
        </button>
      )}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="stat-card">
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">{label}</p>
      <p className={clsx("font-display font-bold text-2xl", accent ? "text-signal glow-text" : "text-white")}>
        {value}
      </p>
      {sub && <p className="text-zinc-600 font-mono text-xs">{sub}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ label, title, sub }) {
  return (
    <div className="mb-8">
      {label && <p className="section-label mb-2">{label}</p>}
      <h2 className="font-display font-bold text-2xl md:text-3xl text-white">{title}</h2>
      {sub && <p className="text-zinc-400 font-body mt-2 max-w-xl">{sub}</p>}
    </div>
  );
}

// ── Mock badge ────────────────────────────────────────────────────────────────
export function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
      ⚡ Demo data. Train the model to see real results.
    </span>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink-muted border border-zinc-750 rounded-xl px-3 py-2 shadow-xl">
      {label && <p className="text-zinc-400 font-mono text-xs mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-xs" style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}
