import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DarkCard from "@/components/ui/DarkCard";

const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "#3b82f6" },
  { key: "reviewed", label: "Reviewed", color: "#8b5cf6" },
  { key: "contacted", label: "Contacted", color: "#06b6d4" },
  { key: "showing", label: "Showing", color: "#f59e0b" },
  { key: "offer", label: "Offer", color: "#f97316" },
  { key: "under_contract", label: "Under Contract", color: "#10b981" },
  { key: "closed", label: "Closed", color: "#22c55e" },
];

export default function PipelineOverview({ matches }) {
  const stageCounts = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: matches.filter(m => m.status === stage.key && m.status !== "dismissed").length,
  }));

  const active = stageCounts.filter(s => s.key !== "closed" && s.key !== "dismissed");
  const maxCount = Math.max(...active.map(s => s.count), 1);

  return (
    <DarkCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--dm-text)]">Deal Pipeline</h2>
        <Link to={createPageUrl("Matches")} className="text-xs text-blue-400 hover:text-blue-300">
          Manage →
        </Link>
      </div>
      <div className="flex items-end gap-2 h-28">
        {active.map(stage => (
          <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-bold" style={{ color: stage.color }}>
              {stage.count > 0 ? stage.count : ""}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                backgroundColor: stage.color,
                opacity: stage.count === 0 ? 0.15 : 0.75,
                height: stage.count === 0 ? "4px" : `${Math.max((stage.count / maxCount) * 80, 8)}px`,
              }}
            />
            <span className="text-[9px] text-[var(--dm-text-dim)] text-center leading-tight">{stage.label}</span>
          </div>
        ))}
      </div>
    </DarkCard>
  );
}