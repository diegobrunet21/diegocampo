import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { GitCompare, Search, Filter, RefreshCw, Loader2, LayoutGrid, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DarkCard from "@/components/ui/DarkCard";
import TierBadge from "@/components/ui/TierBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import CrossAgentBadge from "@/components/ui/CrossAgentBadge";
import MatchMatrix from "@/components/matches/MatchMatrix";
import { useBrokerage } from "@/components/hooks/useBrokerage";
import { generateMatchesForBrokerage } from "@/components/helpers/matchScoring";
import {
  MultiSelect, DateRangeFilter, SavedFilterSets, useSavedFilters, FilterBadge
} from "@/components/filters/AdvancedFilters";

function AgentTag({ agentId, agentMap }) {
  const name = agentMap[agentId];
  if (!name) return null;
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--dm-bg)] border border-[var(--dm-border)] text-[var(--dm-text-muted)]" title={name}>
      <span className="w-3.5 h-3.5 rounded-full bg-blue-500/30 text-blue-400 flex items-center justify-center text-[8px] font-bold flex-shrink-0">{initials}</span>
      {name.split(" ")[0]}
    </span>
  );
}

export default function Matches() {
  const { user, loading: authLoading, brokerageFilter, isBroker } = useBrokerage();
  const [matches, setMatches] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [listings, setListings] = useState([]);
  const [agentMap, setAgentMap] = useState({}); // id → full_name
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("matrix");
  const [filters, setFilters] = useState({ tiers: [], statuses: [], crossAgent: false, dateFrom: "", dateTo: "", scoreMin: "", scoreMax: "" });
  const { saved, save, remove } = useSavedFilters("matches");

  const TIER_OPTIONS = [{ value: "A", label: "Tier A (75+)" }, { value: "B", label: "Tier B (45–74)" }, { value: "C", label: "Tier C (<45)" }];
  const STATUS_OPTIONS = ["new","reviewed","contacted","showing","offer","under_contract","closed","dismissed"].map(s => ({ value: s, label: s.replace(/_/g, " ") }));
  const DEFAULT_FILTERS = { tiers: [], statuses: [], crossAgent: false, dateFrom: "", dateTo: "", scoreMin: "", scoreMax: "" };
  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const activeFilterCount = [
    filters.tiers.length, filters.statuses.length, filters.crossAgent ? 1 : 0,
    filters.scoreMin || filters.scoreMax ? 1 : 0,
    filters.dateFrom || filters.dateTo ? 1 : 0,
  ].reduce((a, b) => a + (b > 0 ? 1 : 0), 0);

  // Regression: navigate to Matches, verify it loads (not stuck). Generate Matches, verify list populates.
  const loadAll = async () => {
    try {
      const filter = brokerageFilter();
      if (!filter) return;
      const [m, b, l] = await Promise.all([
        base44.entities.Match.filter(filter, "-match_score"),
        base44.entities.Buyer.filter(filter),
        base44.entities.Listing.filter(filter),
      ]);
      setMatches(m);
      setBuyers(b);
      setListings(l);

      // FIX #19: filter by brokerage instead of listing all users globally
      const agentIds = [...new Set([
        ...b.map(x => x.agent_id),
        ...l.map(x => x.agent_id),
      ].filter(Boolean))];
      if (agentIds.length > 0) {
        const users = await base44.entities.User.filter({ brokerage_id: user.brokerage_id });
        const map = {};
        for (const u of users) {
          map[u.id] = u.full_name || u.email || u.id;
        }
        setAgentMap(map);
      }
    } finally {
      setLoading(false);
    }
  };

  // FIX #4: guard against missing brokerage_id to prevent infinite loading
  useEffect(() => {
    if (authLoading) return;
    if (!user?.brokerage_id) { setLoading(false); return; }
    loadAll();
  }, [authLoading, user]);

  const handleGenerateMatches = async () => {
    setGenerating(true);
    await generateMatchesForBrokerage(base44, user.brokerage_id);
    await loadAll();
    setGenerating(false);
  };

  const filtered = matches.filter(m => {
    const q = search.toLowerCase();
    if (q && !m.buyer_name?.toLowerCase().includes(q) && !m.listing_name?.toLowerCase().includes(q)) return false;
    if (filters.tiers.length && !filters.tiers.includes(m.match_tier)) return false;
    if (filters.statuses.length && !filters.statuses.includes(m.status)) return false;
    if (filters.crossAgent && !m.is_cross_agent) return false;
    if (filters.scoreMin && m.match_score < Number(filters.scoreMin)) return false;
    if (filters.scoreMax && m.match_score > Number(filters.scoreMax)) return false;
    if (filters.dateFrom && new Date(m.created_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(m.created_date) > new Date(filters.dateTo + "T23:59:59")) return false;
    return true;
  });

  const tierCounts = {
    A: matches.filter(m => m.match_tier === "A").length,
    B: matches.filter(m => m.match_tier === "B").length,
    C: matches.filter(m => m.match_tier === "C").length,
  };

  const filteredBuyers = buyers.filter(b => filtered.some(m => m.buyer_id === b.id));
  const filteredListings = listings.filter(l => filtered.some(m => m.listing_id === l.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dm-text)]">Matches</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-emerald-400 font-medium">{tierCounts.A} Tier A</span>
            <span className="text-xs text-blue-400 font-medium">{tierCounts.B} Tier B</span>
            <span className="text-xs text-amber-400 font-medium">{tierCounts.C} Tier C</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[var(--dm-surface)] rounded-lg p-0.5 border border-[var(--dm-border)]">
            <button
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "matrix" ? "bg-blue-500/20 text-blue-400" : "text-[var(--dm-text-muted)] hover:text-[var(--dm-text)]"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Matrix
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "list" ? "bg-blue-500/20 text-blue-400" : "text-[var(--dm-text-muted)] hover:text-[var(--dm-text)]"}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>

          {(isBroker || user?.app_role === "agent") && (
            <Button onClick={handleGenerateMatches} disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white">
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {generating ? "Generating..." : "Generate Matches"}
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dm-text-dim)]" />
          <Input
            placeholder="Search buyer or listing..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]"
          />
        </div>
        <Button onClick={() => setShowFilters(!showFilters)} className="border border-[var(--dm-border)] bg-[var(--dm-surface)] text-[var(--dm-text-muted)] hover:bg-[var(--dm-surface-2)]">
          <Filter className="w-4 h-4 mr-2" /> Filters
          <FilterBadge count={activeFilterCount} />
        </Button>
        {activeFilterCount > 0 && (
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {showFilters && (
        <DarkCard>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <MultiSelect label="Tier" options={TIER_OPTIONS} value={filters.tiers} onChange={v => setF("tiers", v)} />
              <MultiSelect label="Status" options={STATUS_OPTIONS} value={filters.statuses} onChange={v => setF("statuses", v)} />
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--dm-text-dim)]">Score:</span>
                <Input type="number" placeholder="Min" value={filters.scoreMin} onChange={e => setF("scoreMin", e.target.value)} className="w-20 h-9 text-xs bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]" />
                <span className="text-xs text-[var(--dm-text-dim)]">–</span>
                <Input type="number" placeholder="Max" value={filters.scoreMax} onChange={e => setF("scoreMax", e.target.value)} className="w-20 h-9 text-xs bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.crossAgent} onChange={e => setF("crossAgent", e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                <span className="text-xs text-[var(--dm-text-muted)]">Cross-Agent only</span>
              </label>
            </div>
            <DateRangeFilter label="Created" fromValue={filters.dateFrom} toValue={filters.dateTo} onFromChange={v => setF("dateFrom", v)} onToChange={v => setF("dateTo", v)} />
            <div className="border-t border-[var(--dm-border)] pt-3">
              <SavedFilterSets saved={saved} onApply={f => setFilters({ ...DEFAULT_FILTERS, ...f })} onDelete={remove} currentFilters={filters} onSave={save} />
            </div>
          </div>
        </DarkCard>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading matches...</div>
      ) : filtered.length === 0 ? (
        <DarkCard>
          <div className="text-center py-12">
            <GitCompare className="w-10 h-10 text-[var(--dm-text-dim)] mx-auto mb-3" />
            <p className="text-[var(--dm-text-muted)]">No matches found</p>
            <p className="text-xs text-[var(--dm-text-dim)] mt-1">Add buyers and listings, then click "Generate Matches"</p>
          </div>
        </DarkCard>
      ) : viewMode === "matrix" ? (
        <MatchMatrix
          matches={filtered}
          buyers={filteredBuyers}
          listings={filteredListings}
          agentMap={agentMap}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map(m => (
            <Link key={m.id} to={createPageUrl(`MatchDetail?id=${m.id}`)}>
              <DarkCard className="hover:border-[var(--dm-border-light)] transition-colors cursor-pointer">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Score */}
                    <div className="text-center w-10 flex-shrink-0">
                      <div className="text-2xl font-bold text-[var(--dm-text)] leading-none">{m.match_score}</div>
                      <div className="text-[10px] text-[var(--dm-text-dim)] uppercase">Score</div>
                    </div>
                    <div className="w-px h-10 bg-[var(--dm-border)] flex-shrink-0" />
                    {/* Parties */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-blue-400 truncate">{m.buyer_name}</span>
                          {m.buyer_agent_id && <AgentTag agentId={m.buyer_agent_id} agentMap={agentMap} />}
                        </div>
                        <span className="text-[var(--dm-text-dim)]">→</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-emerald-400 truncate">{m.listing_name}</span>
                          {m.listing_agent_id && m.listing_agent_id !== m.buyer_agent_id && (
                            <AgentTag agentId={m.listing_agent_id} agentMap={agentMap} />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--dm-text-muted)] mt-0.5 truncate">{m.match_reasons}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TierBadge tier={m.match_tier} />
                    {m.is_cross_agent && <CrossAgentBadge />}
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              </DarkCard>
            </Link>
          ))}
        </div>
      )}

      {/* Scoring legend */}
      <div className="flex items-center gap-4 text-[10px] text-[var(--dm-text-dim)] flex-wrap">
        <span className="font-medium text-[var(--dm-text-muted)]">Score guide:</span>
        <span className="text-emerald-400">■ Tier A = 75–100</span>
        <span className="text-blue-400">■ Tier B = 45–74</span>
        <span className="text-amber-400">■ Tier C = 20–44</span>
        <span>Core criteria: Price fit (30 pts) + Asset class (30 pts)</span>
      </div>
    </div>
  );
}