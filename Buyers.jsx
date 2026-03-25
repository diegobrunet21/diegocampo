import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, Users, Phone, Mail, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DarkCard from "@/components/ui/DarkCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { useBrokerage } from "@/components/hooks/useBrokerage";
import {
  MultiSelect, PriceRangeFilter, DateRangeFilter, LocationFilter,
  SavedFilterSets, useSavedFilters, FilterBadge
} from "@/components/filters/AdvancedFilters";

const STAGE_OPTIONS = [
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "under_contract", label: "Under Contract" },
  { value: "closed", label: "Closed" },
  { value: "inactive", label: "Inactive" },
];
const MOTIVATION_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const TIMELINE_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "1_3_months", label: "1–3 Months" },
  { value: "3_6_months", label: "3–6 Months" },
  { value: "6_12_months", label: "6–12 Months" },
  { value: "12_plus_months", label: "12+ Months" },
];
const ASSET_OPTIONS = [
  "Multifamily","Retail","Office","Industrial","Mixed-Use","Hospitality","Land","Self-Storage","Medical","Other"
].map(a => ({ value: a, label: a }));

const DEFAULT_FILTERS = {
  stages: [], motivations: [], timelines: [], assetClasses: [],
  locations: [],
  priceMin: "", priceMax: "",
  dateFrom: "", dateTo: "",
};

export default function Buyers() {
  const { user, loading: authLoading, brokerageFilter, agentScopedFilter, isBroker } = useBrokerage();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { saved, save, remove } = useSavedFilters("buyers");

  useEffect(() => {
    if (authLoading || !user?.brokerage_id) return;
    async function load() {
      const filter = isBroker ? brokerageFilter() : agentScopedFilter();
      if (!filter) { setLoading(false); return; }
      const data = await base44.entities.Buyer.filter(filter, "-created_date");
      setBuyers(data);
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const activeFilterCount = [
    filters.stages.length, filters.motivations.length, filters.timelines.length,
    filters.assetClasses.length, filters.locations.length,
    filters.priceMin || filters.priceMax ? 1 : 0,
    filters.dateFrom || filters.dateTo ? 1 : 0,
  ].reduce((a, b) => a + (b > 0 ? 1 : 0), 0);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const filtered = buyers.filter(b => {
    const q = search.toLowerCase();
    if (q && !b.name?.toLowerCase().includes(q) && !b.email?.toLowerCase().includes(q) && !b.company?.toLowerCase().includes(q)) return false;
    if (filters.stages.length && !filters.stages.includes(b.stage)) return false;
    if (filters.motivations.length && !filters.motivations.includes(b.motivation_level)) return false;
    if (filters.timelines.length && !filters.timelines.includes(b.timeline)) return false;
    if (filters.assetClasses.length && !b.target_asset_classes?.some(ac => filters.assetClasses.includes(ac))) return false;
    if (filters.locations.length && !b.target_locations?.some(loc =>
      filters.locations.some(fl => loc.toLowerCase().includes(fl.toLowerCase()))
    )) return false;
    if (filters.priceMin && b.price_max && b.price_max < Number(filters.priceMin)) return false;
    if (filters.priceMax && b.price_min && b.price_min > Number(filters.priceMax)) return false;
    if (filters.dateFrom && new Date(b.created_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(b.created_date) > new Date(filters.dateTo + "T23:59:59")) return false;
    return true;
  });

  const formatPrice = (v) => {
    if (!v) return "—";
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[var(--dm-text)]">Buyers</h1>
        <Link to={createPageUrl("QuickAdd?tab=buyer")}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Buyer
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dm-text-dim)]" />
          <Input
            placeholder="Search buyers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]"
          />
        </div>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          className="border border-[var(--dm-border)] bg-[var(--dm-surface)] text-[var(--dm-text-muted)] hover:bg-[var(--dm-surface-2)]"
        >
          <Filter className="w-4 h-4 mr-2" /> Filters
          <FilterBadge count={activeFilterCount} />
        </Button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {showFilters && (
        <DarkCard>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-start">
              <MultiSelect label="Stage" options={STAGE_OPTIONS} value={filters.stages} onChange={v => setF("stages", v)} />
              <MultiSelect label="Motivation" options={MOTIVATION_OPTIONS} value={filters.motivations} onChange={v => setF("motivations", v)} />
              <MultiSelect label="Timeline" options={TIMELINE_OPTIONS} value={filters.timelines} onChange={v => setF("timelines", v)} />
              <MultiSelect label="Asset Class" options={ASSET_OPTIONS} value={filters.assetClasses} onChange={v => setF("assetClasses", v)} />
            </div>
            <div className="flex flex-wrap gap-4 items-start">
              <PriceRangeFilter
                label="Budget"
                minValue={filters.priceMin} maxValue={filters.priceMax}
                onMinChange={v => setF("priceMin", v)} onMaxChange={v => setF("priceMax", v)}
              />
              <DateRangeFilter
                label="Added"
                fromValue={filters.dateFrom} toValue={filters.dateTo}
                onFromChange={v => setF("dateFrom", v)} onToChange={v => setF("dateTo", v)}
              />
            </div>
            <LocationFilter value={filters.locations} onChange={v => setF("locations", v)} />
            <div className="border-t border-[var(--dm-border)] pt-3">
              <SavedFilterSets
                saved={saved}
                onApply={f => setFilters({ ...DEFAULT_FILTERS, ...f })}
                onDelete={remove}
                currentFilters={filters}
                onSave={save}
              />
            </div>
          </div>
        </DarkCard>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading buyers...</div>
      ) : filtered.length === 0 ? (
        <DarkCard>
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-[var(--dm-text-dim)] mx-auto mb-3" />
            <p className="text-[var(--dm-text-muted)]">No buyers found</p>
            <Link to={createPageUrl("QuickAdd?tab=buyer")} className="text-blue-400 text-sm hover:underline mt-2 inline-block">Add your first buyer →</Link>
          </div>
        </DarkCard>
      ) : (
        <DarkCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dm-border)]">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Budget</th>
                  <th className="text-left px-4 py-3">Asset Classes</th>
                  <th className="text-left px-4 py-3">Locations</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3">Motivation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-b border-[var(--dm-border)] cursor-pointer hover:bg-[var(--dm-surface-2)]" onClick={() => window.location.href = createPageUrl(`BuyerDetail?id=${b.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--dm-text)]">{b.name}</p>
                      {b.company && <p className="text-xs text-[var(--dm-text-dim)]">{b.company}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {b.email && <span className="text-xs text-[var(--dm-text-muted)] flex items-center gap-1"><Mail className="w-3 h-3" />{b.email}</span>}
                        {b.phone && <span className="text-xs text-[var(--dm-text-muted)] flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--dm-text)]">
                      {formatPrice(b.price_min)} – {formatPrice(b.price_max)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {b.target_asset_classes?.slice(0, 2).map(ac => (
                          <span key={ac} className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">{ac}</span>
                        ))}
                        {b.target_asset_classes?.length > 2 && <span className="text-xs text-[var(--dm-text-dim)]">+{b.target_asset_classes.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {b.target_locations?.slice(0, 2).map((loc, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />{loc}
                          </span>
                        ))}
                        {b.target_locations?.length > 2 && <span className="text-xs text-[var(--dm-text-dim)]">+{b.target_locations.length - 2}</span>}
                        {(!b.target_locations || b.target_locations.length === 0) && <span className="text-xs text-[var(--dm-text-dim)]">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={b.stage || "prospect"} /></td>
                    <td className="px-4 py-3">
                      {b.motivation_level && (
                        <span className={`text-xs font-medium capitalize ${b.motivation_level === "high" ? "text-emerald-400" : b.motivation_level === "medium" ? "text-amber-400" : "text-gray-400"}`}>{b.motivation_level}</span>
                      )}
                    </td>
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