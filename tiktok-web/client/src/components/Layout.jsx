import { NavLink } from "react-router-dom";
import { BarChart2, Home, Hash, TrendingUp, Activity } from "lucide-react";

const NAV = [
  { to: "/",          label: "Home",      Icon: Home },
  { to: "/predict",   label: "Predict",   Icon: TrendingUp },
  { to: "/dashboard", label: "Dashboard", Icon: BarChart2 },
  { to: "/hashtags",  label: "Hashtags",  Icon: Hash },
  { to: "/metrics",   label: "Metrics",   Icon: Activity },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-750 bg-ink/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-signal flex items-center justify-center shadow-[0_0_12px_rgba(254,44,85,0.5)]">
              <span className="font-display font-black text-white text-xs leading-none">TE</span>
            </div>
            <span className="font-display font-bold text-white text-sm tracking-tight">
              Predict<span className="text-signal">tok</span>
            </span>
          </NavLink>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active text-white" : ""}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right badge */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              NYC Region
            </span>
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-750 py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-zinc-600 font-mono text-xs">
            Predicttok · Portfolio Project
          </p>
          <p className="text-zinc-700 font-mono text-xs">
            Scikit-learn · XGBoost · React · Node/Express
          </p>
        </div>
      </footer>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-zinc-750 bg-ink/95 backdrop-blur-md z-50">
        <div className="flex items-center justify-around py-2 px-4">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors
                 ${isActive ? "text-signal" : "text-zinc-600"}`
              }
            >
              <Icon size={18} />
              <span className="text-[10px] font-mono">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
