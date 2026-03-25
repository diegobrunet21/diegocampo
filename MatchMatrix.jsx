import React from "react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import TierBadge from "@/components/ui/TierBadge";
import CrossAgentBadge from "@/components/ui/CrossAgentBadge";

function AgentTag({ agentId, agentMap }) {
  const name = agentMap[agentId];
  if (!name) return null;
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--dm-bg)] border border-[var(--dm-border)] text-[var(--dm-text-muted)]" title={name}>
      <span className="w-3.5 h-3.5 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center text-[8px] font-bold">{initials}</span>
      {name.split(" ")[0]}
    </span>
  );
}

function ScoreCell({ match, onClick }) {
  if (!match) {
    return <div className="w-full h-full flex items-center justify-center text-[var(--dm-border)]">—</div>;
  }

  const tierColors = {
    A: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30",
    B: "bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30",
    C: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
  };
  const scoreColors = {
    A: "text-emerald-400",
    B: "text-blue-400",
    C: "text-amber-400",
  };

  return (
    <button
      onClick={() => onClick(match.id)}
      className={`w-full h-full flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors cursor-pointer p-1 ${tierColors[match.match_tier]}`}
      title={match.match_reasons}
    >
      <span className={`text-sm font-bold leading-none ${scoreColors[match.match_tier]}`}>{match.match_score}</span>
      <span className={`text-[9px] font-semibold ${scoreColors[match.match_tier]}`}>Tier {match.match_tier}</span>
      {match.is_cross_agent && <span className="text-[8px] text-purple-400">✕ agent</span>}
    </button>
  );
}

export default function MatchMatrix({ matches, buyers, listings, agentMap }) {
  const navigate = useNavigate();

  // Index matches by buyer_id → listing_id
  const matchIndex = {};
  for (const m of matches) {
    if (!matchIndex[m.buyer_id]) matchIndex[m.buyer_id] = {};
    matchIndex[m.buyer_id][m.listing_id] = m;
  }

  // Only show buyers/listings that have at least one match
  const buyerIds = buyers.map(b => b.id).filter(id => matchIndex[id]);
  const listingIds = listings.map(l => l.id).filter(id =>
    buyers.some(b => matchIndex[b.id]?.[id])
  );

  if (buyerIds.length === 0 || listingIds.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--dm-text-muted)]">
        No matches to display in matrix view. Generate matches first.
      </div>
    );
  }

  const buyerMap = Object.fromEntries(buyers.map(b => [b.id, b]));
  const listingMap = Object.fromEntries(listings.map(l => [l.id, l]));

  const CELL_W = 80;
  const ROW_LABEL_W = 200;
  const COL_LABEL_H = 110;
  const CELL_H = 56;

  return (
    <div className="overflow-auto rounded-xl border border-[var(--dm-border)]">
      <table className="border-collapse" style={{ minWidth: ROW_LABEL_W + listingIds.length * CELL_W }}>
        <thead>
          {/* Column header row */}
          <tr>
            <th className="sticky left-0 z-20 bg-[var(--dm-surface)] border-b border-r border-[var(--dm-border)]" style={{ width: ROW_LABEL_W, minWidth: ROW_LABEL_W, height: COL_LABEL_H }}>
              <div className="px-3 text-left">
                <p className="text-[10px] text-[var(--dm-text-dim)] uppercase tracking-wide">Buyers ↓ / Listings →</p>
              </div>
            </th>
            {listingIds.map(lid => {
              const l = listingMap[lid];
              return (
                <th key={lid} className="border-b border-r border-[var(--dm-border)] bg-[var(--dm-surface)] p-2" style={{ width: CELL_W, minWidth: CELL_W, height: COL_LABEL_H }}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-[var(--dm-text)] leading-tight text-center line-clamp-2">{l?.property_name || lid}</span>
                    <span className="text-[9px] text-[var(--dm-text-dim)] capitalize">{l?.asset_class?.replace(/_/g, " ")}</span>
                    {l?.agent_id && <AgentTag agentId={l.agent_id} agentMap={agentMap} />}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {buyerIds.map(bid => {
            const b = buyerMap[bid];
            return (
              <tr key={bid} className="border-b border-[var(--dm-border)]">
                <td className="sticky left-0 z-10 bg-[var(--dm-surface)] border-r border-[var(--dm-border)] px-3 py-2" style={{ width: ROW_LABEL_W }}>
                  <p className="text-xs font-semibold text-[var(--dm-text)] truncate">{b?.name || bid}</p>
                  {b?.company && <p className="text-[10px] text-[var(--dm-text-dim)] truncate">{b.company}</p>}
                  {b?.agent_id && <AgentTag agentId={b.agent_id} agentMap={agentMap} />}
                </td>
                {listingIds.map(lid => (
                  <td key={lid} className="border-r border-[var(--dm-border)] p-1" style={{ width: CELL_W, height: CELL_H }}>
                    <ScoreCell match={matchIndex[bid]?.[lid]} onClick={id => navigate(createPageUrl(`MatchDetail?id=${id}`))} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}