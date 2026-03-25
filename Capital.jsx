import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { DollarSign, Search, Filter, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DarkCard from "@/components/ui/DarkCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { useBrokerage } from "@/components/hooks/useBrokerage";
import {
  MultiSelect, DateRangeFilter, PriceRangeFilter,
  SavedFilterSets, useSavedFilters, FilterBadge
} from "@/components/filters/AdvancedFilters";

const STATUS_ORDER = ["not_reviewed","prequal_requested","prequalified","underwriting","approved","cleared_to_close","closed","not_a_fit"];
const STATUS_LABELS = {
  not_reviewed: "Not Reviewed",
  prequal_requested: "Pre-Qual Requested",
  prequalified: "Pre-Qualified",
  underwriting: "Underwriting",
  approved: "Approved",
  cleared_to_close: "Cleared to Close",
  closed: "Closed",
  not_a_fit: "Not a Fit",
};

export default function Capital() {
  const { user, loading: authLoading, brokerageFilter, isBroker, isLoanOfficer } = useBrokerage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("pipeline");
  const [filters, setFilters] = useState({ statuses: [], dateFrom: "", dateTo: "", loanMin: "", loanMax: "" });
  const { saved, save, remove } = useSavedFilters("capital");

  const STATUS_OPTIONS = STATUS_ORDER.map(s => ({ value: s, label: STATUS_LABELS[s] }));
  const DEFAULT_FILTERS = { statuses: [], dateFrom: "", dateTo: "", loanMin: "", loanMax: "" };
  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const activeFilterCount = [
    filters.statuses.length,
    filters.loanMin || filters.loanMax ? 1 : 0,
    filters.dateFrom || filters.dateTo ? 1 : 0,
  ].reduce((a, b) => a + (b > 0 ? 1 : 0), 0);

  useEffect(() => {
    if (authLoading || !user?.brokerage_id) return;
    async function load() {
      const filter = brokerageFilter();
      if (!filter) return;
      if (isLoanOfficer) {
        filter.assigned_loan_officer_id = user.id;
      }
      const data = await base44.entities.FinancingItem.filter(filter, "-created_date");
      setItems(data);
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    if (q && !i.buyer_name?.toLowerCase().includes(q) && !i.listing_name?.toLowerCase().includes(q)) return false;
    if (filters.statuses.length && !filters.statuses.includes(i.status)) return false;
    if (filters.loanMin && i.estimated_loan_amount < Number(filters.loanMin)) return false;
    if (filters.loanMax && i.estimated_loan_amount > Number(filters.loanMax)) return false;
    if (filters.dateFrom && new Date(i.created_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(i.created_date) > new Date(filters.dateTo + "T23:59:59")) return false;
    return true;
  });

  const groupedByStatus = {};
  STATUS_ORDER.forEach(s => { groupedByStatus[s] = filtered.filter(i => i.status === s); });

  const formatPrice = (v) => {
    if (!v) return "—";
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  if (authLoading || loading) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dm-text)]">Capital Pipeline</h1>
          <p className="text-sm text-[var(--dm-text-muted)]">{items.length} financing items</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setViewMode("pipeline")} className={viewMode === "pipeline" ? "bg-blue-600 text-white" : "bg-[var(--dm-surface)] border border-[var(--dm-border)] text-[var(--dm-text-muted)] hover:bg-[var(--dm-surface-2)]"}>Pipeline</Button>
          <Button onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-blue-600 text-white" : "bg-[var(--dm-surface)] border border-[var(--dm-border)] text-[var(--dm-text-muted)] hover:bg-[var(--dm-surface-2)]"}>List</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dm-text-dim)]" />
          <Input placeholder="Search financing items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]" />
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
              <MultiSelect label="Status" options={STATUS_OPTIONS} value={filters.statuses} onChange={v => setF("statuses", v)} />
              <PriceRangeFilter label="Loan Amount" minValue={filters.loanMin} maxValue={filters.loanMax} onMinChange={v => setF("loanMin", v)} onMaxChange={v => setF("loanMax", v)} />
              <DateRangeFilter label="Created" fromValue={filters.dateFrom} toValue={filters.dateTo} onFromChange={v => setF("dateFrom", v)} onToChange={v => setF("dateTo", v)} />
            </div>
            <div className="border-t border-[var(--dm-border)] pt-3">
              <SavedFilterSets saved={saved} onApply={f => setFilters({ ...DEFAULT_FILTERS, ...f })} onDelete={remove} currentFilters={filters} onSave={save} />
            </div>
          </div>
        </DarkCard>
      )}

      {viewMode === "pipeline" ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: STATUS_ORDER.length * 260 }}>
            {STATUS_ORDER.map(status => (
              <div key={status} className="flex-1 min-w-[240px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--dm-text-muted)]">{STATUS_LABELS[status]}</h3>
                  <span className="text-xs text-[var(--dm-text-dim)] bg-[var(--dm-surface-2)] px-2 py-0.5 rounded-full">{groupedByStatus[status].length}</span>
                </div>
                <div className="space-y-2">
                  {groupedByStatus[status].map(item => (
                    <Link key={item.id} to={createPageUrl(`FinancingDetail?id=${item.id}`)}>
                      <DarkCard className="hover:border-[var(--dm-border-light)] transition-colors cursor-pointer p-4">
                        <p className="text-sm font-medium text-[var(--dm-text)] truncate">{item.buyer_name}</p>
                        <p className="text-xs text-[var(--dm-text-muted)] truncate">→ {item.listing_name}</p>
                        {item.estimated_loan_amount && <p className="text-xs text-amber-400 mt-2 font-medium">{formatPrice(item.estimated_loan_amount)}</p>}
                        {item.assigned_loan_officer_name && <p className="text-[10px] text-[var(--dm-text-dim)] mt-1">LO: {item.assigned_loan_officer_name}</p>}
                      </DarkCard>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DarkCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dm-border)]">
                  <th className="text-left px-4 py-3">Buyer</th>
                  <th className="text-left px-4 py-3">Listing</th>
                  <th className="text-left px-4 py-3">Loan Amount</th>
                  <th className="text-left px-4 py-3">LTV</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Loan Officer</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-[var(--dm-border)] cursor-pointer hover:bg-[var(--dm-surface-2)]" onClick={() => window.location.href = createPageUrl(`FinancingDetail?id=${item.id}`)}>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--dm-text)]">{item.buyer_name}</td>
                    <td className="px-4 py-3 text-sm text-[var(--dm-text)]">{item.listing_name}</td>
                    <td className="px-4 py-3 text-sm text-amber-400 font-medium">{formatPrice(item.estimated_loan_amount)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--dm-text)]">{item.ltv_estimate ? `${item.ltv_estimate}%` : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-sm text-[var(--dm-text-muted)]">{item.assigned_loan_officer_name || "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DarkCard>
      )}
    </div>
  );
}