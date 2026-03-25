import React from "react";

export default function KPICard({ label, value, icon: Icon, color = "blue", trend }) {
  const colorMap = {
    blue: "from-blue-500/20 to-blue-600/5 text-blue-400",
    green: "from-emerald-500/20 to-emerald-600/5 text-emerald-400",
    amber: "from-amber-500/20 to-amber-600/5 text-amber-400",
    purple: "from-purple-500/20 to-purple-600/5 text-purple-400",
    red: "from-red-500/20 to-red-600/5 text-red-400",
    cyan: "from-cyan-500/20 to-cyan-600/5 text-cyan-400"
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--dm-border)] bg-[var(--dm-surface)] p-5">
      <div className="bg-gradient-to-br text-slate-50 opacity-40 absolute inset-0 from-blue-500/20 to-blue-600/5" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-slate-50 text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[var(--dm-text)]">{value}</p>
          {trend && <p className="mt-1 text-xs text-emerald-400">{trend}</p>}
        </div>
        {Icon &&
        <div className={`p-2 rounded-lg bg-black/20 ${c.split(" ").slice(2).join(" ")}`}>
            <Icon className="w-5 h-5" />
          </div>
        }
      </div>
    </div>);

}