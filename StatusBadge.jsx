import React from "react";

const statusColors = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inactive: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  under_contract: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  sold: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  withdrawn: "bg-red-500/15 text-red-400 border-red-500/30",
  closed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  new: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  reviewed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contacted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  showing: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  offer: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  dismissed: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  prospect: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  not_reviewed: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  prequal_requested: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  prequalified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  underwriting: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cleared_to_close: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  not_a_fit: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function StatusBadge({ status }) {
  const colors = statusColors[status] || statusColors.active;
  const label = (status || "unknown").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {label}
    </span>
  );
}