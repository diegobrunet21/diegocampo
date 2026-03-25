import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import DarkCard from "@/components/ui/DarkCard";

const TIER_COLORS = { A: "#10b981", B: "#3b82f6", C: "#f59e0b" };

export default function MatchEngagementChart({ matches }) {
  const engaged = matches.filter(m => !["new", "dismissed"].includes(m.status)).length;
  const newCount = matches.filter(m => m.status === "new").length;
  const dismissed = matches.filter(m => m.status === "dismissed").length;

  const tierData = ["A", "B", "C"].map(tier => ({
    name: `Tier ${tier}`,
    value: matches.filter(m => m.match_tier === tier).length,
    color: TIER_COLORS[tier],
  })).filter(d => d.value > 0);

  const engagementRate = matches.length > 0 ? Math.round((engaged / matches.length) * 100) : 0;

  return (
    <DarkCard>
      <h2 className="text-lg font-semibold text-[var(--dm-text)] mb-4">Match Breakdown</h2>
      <div className="flex items-center gap-6">
        {tierData.length > 0 ? (
          <div className="w-28 h-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="value" strokeWidth={0}>
                  {tierData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111d35", border: "1px solid #1e3050", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="w-28 h-28 shrink-0 flex items-center justify-center rounded-full border-2 border-dashed border-[var(--dm-border)]">
            <span className="text-xs text-[var(--dm-text-dim)]">No data</span>
          </div>
        )}

        <div className="flex-1 space-y-2.5">
          {["A", "B", "C"].map(tier => {
            const count = matches.filter(m => m.match_tier === tier).length;
            return (
              <div key={tier} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TIER_COLORS[tier] }} />
                <span className="text-xs text-[var(--dm-text-muted)] w-12">Tier {tier}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--dm-surface-3)]">
                  <div className="h-full rounded-full" style={{ width: `${matches.length > 0 ? (count / matches.length) * 100 : 0}%`, backgroundColor: TIER_COLORS[tier] }} />
                </div>
                <span className="text-xs font-semibold text-[var(--dm-text)] w-6 text-right">{count}</span>
              </div>
            );
          })}
          <div className="pt-1 border-t border-[var(--dm-border)] mt-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--dm-text-muted)]">Engagement rate</span>
              <span className="font-semibold text-emerald-400">{engagementRate}%</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-[var(--dm-text-muted)]">Unreviewed</span>
              <span className="text-amber-400">{newCount}</span>
            </div>
          </div>
        </div>
      </div>
    </DarkCard>
  );
}