import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { GitCompare, Users, Building2 } from "lucide-react";
import DarkCard from "@/components/ui/DarkCard";
import TierBadge from "@/components/ui/TierBadge";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentActivityFeed({ matches, buyers, listings }) {
  // Build a unified activity feed sorted by recency
  const activities = [
    ...matches.slice(0, 6).map(m => ({
      id: m.id,
      type: "match",
      label: `${m.buyer_name} ↔ ${m.listing_name}`,
      sub: `Tier ${m.match_tier} · Score ${m.match_score}`,
      tier: m.match_tier,
      date: m.created_date,
      href: createPageUrl(`MatchDetail?id=${m.id}`),
    })),
    ...buyers.slice(0, 3).map(b => ({
      id: b.id,
      type: "buyer",
      label: b.name,
      sub: b.company || b.stage || "New buyer",
      date: b.created_date,
      href: createPageUrl(`BuyerDetail?id=${b.id}`),
    })),
    ...listings.slice(0, 3).map(l => ({
      id: l.id,
      type: "listing",
      label: l.property_name,
      sub: [l.city, l.state].filter(Boolean).join(", ") || "New listing",
      date: l.created_date,
      href: createPageUrl(`ListingDetail?id=${l.id}`),
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  const icons = {
    match: <GitCompare className="w-3.5 h-3.5 text-blue-400" />,
    buyer: <Users className="w-3.5 h-3.5 text-violet-400" />,
    listing: <Building2 className="w-3.5 h-3.5 text-emerald-400" />,
  };

  return (
    <DarkCard>
      <h2 className="text-lg font-semibold text-[var(--dm-text)] mb-4">Recent Activity</h2>
      {activities.length === 0 ? (
        <p className="text-sm text-[var(--dm-text-muted)] text-center py-4">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {activities.map(a => (
            <Link
              key={`${a.type}-${a.id}`}
              to={a.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--dm-surface-2)] transition-colors"
            >
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.12)" }}>
                {icons[a.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--dm-text)] truncate">{a.label}</p>
                <p className="text-[11px] text-[var(--dm-text-dim)]">{a.sub}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.tier && <TierBadge tier={a.tier} />}
                <span className="text-[10px] text-[var(--dm-text-dim)]">{timeAgo(a.date)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DarkCard>
  );
}