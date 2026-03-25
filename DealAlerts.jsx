import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Bell, BellOff } from "lucide-react";
import DarkCard from "@/components/ui/DarkCard";
import TierBadge from "@/components/ui/TierBadge";

function timeAgo(isoDate) {
  if (!isoDate) return "";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DealAlerts({ alerts, userId, onMarkRead }) {
  if (alerts.length === 0) {
    return (
      <DarkCard>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-amber-400" />
          <h2 className="text-lg font-semibold text-[var(--dm-text)]">Deal Alerts</h2>
        </div>
        <div className="text-center py-8">
          <BellOff className="w-8 h-8 text-[var(--dm-text-dim)] mx-auto mb-2" />
          <p className="text-sm text-[var(--dm-text-muted)]">No new deal alerts</p>
          <p className="text-xs text-[var(--dm-text-dim)] mt-1">High-scoring matches (80+) will appear here</p>
        </div>
      </DarkCard>
    );
  }

  return (
    <DarkCard>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-amber-400" />
        <h2 className="text-lg font-semibold text-[var(--dm-text)]">Deal Alerts</h2>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-semibold">
          {alerts.length} unread
        </span>
      </div>
      <div className="space-y-2">
        {alerts.map(m => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--dm-bg)] border border-amber-500/15"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--dm-text)] truncate">
                {m.buyer_name} → {m.listing_name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-amber-400 font-semibold">Score {m.match_score}</span>
                <TierBadge tier={m.match_tier} size="sm" />
                <span className="text-xs text-[var(--dm-text-dim)]">{timeAgo(m.alert_created_date)}</span>
              </div>
            </div>
            <Link
              to={createPageUrl(`MatchDetail?id=${m.id}`)}
              onClick={() => onMarkRead(m)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
            >
              View Match
            </Link>
          </div>
        ))}
      </div>
    </DarkCard>
  );
}