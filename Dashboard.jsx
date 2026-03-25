import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Users, Building2, GitCompare, CalendarClock, ArrowRight, AlertCircle, TrendingUp } from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import DarkCard from "@/components/ui/DarkCard";
import TierBadge from "@/components/ui/TierBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import CrossAgentBadge from "@/components/ui/CrossAgentBadge";
import { useBrokerage } from "@/components/hooks/useBrokerage";
import PipelineOverview from "@/components/dashboard/PipelineOverview";
import MatchEngagementChart from "@/components/dashboard/MatchEngagementChart";
import RecentActivityFeed from "@/components/dashboard/RecentActivityFeed";
import BrokerInviteKey from "@/components/dashboard/BrokerInviteKey";
import DealAlerts from "@/components/dashboard/DealAlerts";

export default function Dashboard() {
  const { user, brokerage, loading: authLoading, brokerageFilter, agentScopedFilter, isBroker } = useBrokerage();
  const [buyers, setBuyers] = useState([]);
  const [listings, setListings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Regression: log in without brokerage → should NOT stick on loading. Log in with brokerage → dashboard loads.
  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // still loading user
    if (!user?.brokerage_id) {
      // User has no brokerage — redirect to onboarding
      window.location.replace(createPageUrl("Onboarding"));
      return;
    }
    async function load() {
      const bFilter = brokerageFilter();
      const aFilter = agentScopedFilter();
      if (!bFilter) return;
      const [b, l, m] = await Promise.all([
        base44.entities.Buyer.filter(isBroker ? bFilter : aFilter),
        base44.entities.Listing.filter(isBroker ? bFilter : aFilter),
        base44.entities.Match.filter(bFilter, "-created_date", 100),
      ]);
      setBuyers(b);
      setListings(l);
      setMatches(m);
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-[var(--dm-text-muted)]">Loading dashboard...</div></div>;
  }

  const activeBuyers = buyers.filter(b => b.status === "active").length;
  const activeListings = listings.filter(l => l.status === "active").length;
  const tierAMatches = matches.filter(m => m.match_tier === "A").length;
  const totalMatches = matches.length;

  const today = new Date().toISOString().split("T")[0];
  const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const actionsDueWeek = matches.filter(m => m.action_due_date && m.action_due_date >= today && m.action_due_date <= weekFromNow).length;

  const activeDeals = matches.filter(m => ["showing", "offer", "under_contract"].includes(m.status)).length;
  const highConvictionMatches = matches.filter(m => m.match_tier === "A").slice(0, 5);

  const alertMatches = matches
    .filter(m => m.alert_created_date && !(m.alert_read_by_user_ids || []).includes(user?.id))
    .sort((a, b) => new Date(b.alert_created_date) - new Date(a.alert_created_date))
    .slice(0, 10);

  const handleMarkAlertRead = async (match) => {
    const already = (match.alert_read_by_user_ids || []).includes(user.id);
    if (already) return;
    const updated = [...(match.alert_read_by_user_ids || []), user.id];
    await base44.entities.Match.update(match.id, { alert_read_by_user_ids: updated });
    setMatches(prev => prev.map(m => m.id === match.id ? { ...m, alert_read_by_user_ids: updated } : m));
  };
  const actionItems = matches
    .filter(m => m.action_due_date && m.action_due_date <= weekFromNow && !["dismissed", "closed"].includes(m.status))
    .slice(0, 5);

  return (
    <div className="text-slate-50 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dm-text)]">Dashboard</h1>
          <p className="text-sm text-[var(--dm-text-muted)]">{brokerage?.name || "Your Brokerage"}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Link to={createPageUrl("Buyers")} className="block hover:opacity-90 transition-opacity">
          <KPICard label="Active Buyers" value={activeBuyers} icon={Users} color="blue" />
        </Link>
        <Link to={createPageUrl("Listings")} className="block hover:opacity-90 transition-opacity">
          <KPICard label="Active Listings" value={activeListings} icon={Building2} color="green" />
        </Link>
        <Link to={createPageUrl("Matches")} className="block hover:opacity-90 transition-opacity">
          <KPICard label="Total Matches" value={totalMatches} icon={GitCompare} color="purple" />
        </Link>
        <Link to={createPageUrl("Matches")} className="block hover:opacity-90 transition-opacity">
          <KPICard label="Tier A Matches" value={tierAMatches} icon={TrendingUp} color="amber" />
        </Link>
        <Link to={createPageUrl("Matches")} className="block hover:opacity-90 transition-opacity">
          <KPICard label="Active Deals" value={activeDeals} icon={CalendarClock} color="red" />
        </Link>
      </div>

      {/* Pipeline + Engagement */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PipelineOverview matches={matches} />
        <MatchEngagementChart matches={matches} />
      </div>

      {/* Action Items + High Conviction */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DarkCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--dm-text)]">Action Items This Week</h2>
            <Link to={createPageUrl("Matches")} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {actionItems.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-[var(--dm-text-dim)] mx-auto mb-2" />
              <p className="text-sm text-[var(--dm-text-muted)]">No upcoming actions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionItems.map(m => (
                <Link key={m.id} to={createPageUrl(`MatchDetail?id=${m.id}`)} className="flex items-center justify-between p-3 rounded-lg bg-[var(--dm-bg)] hover:bg-[var(--dm-surface-2)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--dm-text)] truncate">{m.buyer_name} → {m.listing_name}</p>
                    <p className="text-xs text-[var(--dm-text-muted)]">Due: {m.action_due_date}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <TierBadge tier={m.match_tier} />
                    <StatusBadge status={m.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DarkCard>

        <DarkCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--dm-text)]">High Conviction Matches</h2>
            <Link to={createPageUrl("Matches")} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {highConvictionMatches.length === 0 ? (
            <div className="text-center py-8">
              <GitCompare className="w-8 h-8 text-[var(--dm-text-dim)] mx-auto mb-2" />
              <p className="text-sm text-[var(--dm-text-muted)]">No Tier A matches yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {highConvictionMatches.map(m => (
                <Link key={m.id} to={createPageUrl(`MatchDetail?id=${m.id}`)} className="flex items-center justify-between p-3 rounded-lg bg-[var(--dm-bg)] hover:bg-[var(--dm-surface-2)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--dm-text)] truncate">{m.buyer_name} → {m.listing_name}</p>
                    <p className="text-xs text-[var(--dm-text-muted)]">Score: {m.match_score}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <TierBadge tier="A" />
                    {m.is_cross_agent && <CrossAgentBadge />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DarkCard>
      </div>

      {/* Deal Alerts */}
      <DealAlerts alerts={alertMatches} userId={user?.id} onMarkRead={handleMarkAlertRead} />

      {/* Recent Activity */}
      <RecentActivityFeed matches={matches} buyers={buyers} listings={listings} />

      {/* Broker Invite Key */}
      {isBroker && <BrokerInviteKey brokerage={brokerage} />}
    </div>
  );
}