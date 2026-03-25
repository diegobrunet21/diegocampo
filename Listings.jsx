import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, Building2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DarkCard from "@/components/ui/DarkCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { useBrokerage } from "@/components/hooks/useBrokerage";
import {
  MultiSelect, PriceRangeFilter, DateRangeFilter, LocationFilter,
  SavedFilterSets, useSavedFilters, FilterBadge
} from "@/components/filters/AdvancedFilters";

const ASSET_OPTIONS = [
  "multifamily","retail","office","industrial","mixed_use","hospitality","land","self_storage","medical","other"
].map(a => ({ value: a, label: a.replace(/_/g, " ") }));

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "under_contract", label: "Under Contract" },
  { value: "sold", label: "Sold" },
  { value: "withdrawn", label: "Withdrawn" },
];

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "renovation_needed", label: "Renovation Needed" },
];

const MOTIVATION_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const DEFAULT_FILTERS = {
  assetClasses: [], statuses: [], conditions: [], motivations: [],
  locations: [],
  priceMin: "", priceMax: "",
  capRateMin: "", capRateMax: "",
  dateFrom: "", dateTo: "",
};

export default function Listings() {
  const { user, loading: authLoading, brokerageFilter, agentScopedFilter, isBroker } = useBrokerage();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { saved, save, remove } = useSavedFilters("listings");

  useEffect(() => {
    if (authLoading || !user?.brokerage_id) return;
    async function load() {
      const filter = isBroker ? brokerageFilter() : agentScopedFilter();
      if (!filter) { setLoading(false); return; }
      const data = await base44.entities.Listing.filter(filter, "-created_date");
      setListings(data);
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const activeFilterCount = [
    filters.assetClasses.length, filters.statuses.length, filters.conditions.length,
    filters.motivations.length, filters.locations.length,
    filters.priceMin || filters.priceMax ? 1 : 0,
    filters.capRateMin || filters.capRateMax ? 1 : 0,
    filters.dateFrom || filters.dateTo ? 1 : 0,
  ].reduce((a, b) => a + (b > 0 ? 1 : 0), 0);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const filtered = listings.filter(l => {
    const q = search.toLowerCase();
    if (q && !l.property_name?.toLowerCase().includes(q) && !l.address?.toLowerCase().includes(q) && !l.city?.toLowerCase().includes(q)) return false;
    if (filters.assetClasses.length && !filters.assetClasses.includes(l.asset_class)) return false;
    if (filters.statuses.length && !filters.statuses.includes(l.status)) return false;
    if (filters.conditions.length && !filters.conditions.includes(l.condition)) return false;
    if (filters.motivations.length && !filters.motivations.includes(l.seller_motivation)) return false;
    if (filters.locations.length) {
      const locStr = [l.city, l.state, l.address].filter(Boolean).join(" ").toLowerCase();
      if (!filters.locations.some(fl => locStr.includes(fl.toLowerCase()))) return false;
    }
    if (filters.priceMin && l.asking_price < Number(filters.priceMin)) return false;
    if (filters.priceMax && l.asking_price > Number(filters.priceMax)) return false;
    if (filters.capRateMin && l.cap_rate < Number(filters.capRateMin)) return false;
    if (filters.capRateMax && l.cap_rate > Number(filters.capRateMax)) return false;
    if (filters.dateFrom && new Date(l.created_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(l.created_date) > new Date(filters.dateTo + "T23:59:59")) return false;
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
        <h1 className="text-2xl font-bold text-[var(--dm-text)]">Listings</h1>
        <Link to={createPageUrl("QuickAdd?tab=listing")}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Listing
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dm-text-dim)]" />
          <Input placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]" />
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
              <MultiSelect label="Asset Class" options={ASSET_OPTIONS} value={filters.assetClasses} onChange={v => setF("assetClasses", v)} />
              <MultiSelect label="Status" options={STATUS_OPTIONS} value={filters.statuses} onChange={v => setF("statuses", v)} />
              <MultiSelect label="Condition" options={CONDITION_OPTIONS} value={filters.conditions} onChange={v => setF("conditions", v)} />
              <MultiSelect label="Seller Motivation" options={MOTIVATION_OPTIONS} value={filters.motivations} onChange={v => setF("motivations", v)} />
            </div>
            <div className="flex flex-wrap gap-4 items-start">
              <PriceRangeFilter
                label="Asking Price"
                minValue={filters.priceMin} maxValue={filters.priceMax}
                onMinChange={v => setF("priceMin", v)} onMaxChange={v => setF("priceMax", v)}
              />
              <PriceRangeFilter
                label="Cap Rate %"
                minValue={filters.capRateMin} maxValue={filters.capRateMax}
                onMinChange={v => setF("capRateMin", v)} onMaxChange={v => setF("capRateMax", v)}
              />
              <DateRangeFilter
                label="Listed"
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
        <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading listings...</div>
      ) : filtered.length === 0 ? (
        <DarkCard>
          <div className="text-center py-12">
            <Building2 className="w-10 h-10 text-[var(--dm-text-dim)] mx-auto mb-3" />
            <p className="text-[var(--dm-text-muted)]">No listings found</p>
            <Link to={createPageUrl("QuickAdd?tab=listing")} className="text-blue-400 text-sm hover:underline mt-2 inline-block">Add your first listing →</Link>
          </div>
        </DarkCard>
      ) : (
        <DarkCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dm-border)]">
                  <th className="text-left px-4 py-3">Property</th>
                  <th className="text-left px-4 py-3">Asset Class</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">Cap Rate</th>
                  <th className="text-left px-4 py-3">NOI</th>
                  <th className="text-left px-4 py-3">Units/SqFt</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-[var(--dm-border)] cursor-pointer hover:bg-[var(--dm-surface-2)]" onClick={() => window.location.href = createPageUrl(`ListingDetail?id=${l.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--dm-text)]">{l.property_name}</p>
                      {(l.city || l.state) && <p className="text-xs text-[var(--dm-text-muted)] flex items-center gap-1"><MapPin className="w-3 h-3" />{[l.city, l.state].filter(Boolean).join(", ")}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{l.asset_class?.replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--dm-text)]">{formatPrice(l.asking_price)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--dm-text)]">{l.cap_rate ? `${l.cap_rate}%` : "—"}</td>
                    <td className="px-4 py-3 text-sm text-[var(--dm-text)]">{formatPrice(l.noi)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--dm-text)]">
                      {l.units ? `${l.units} units` : ""}{l.units && l.sqft ? " / " : ""}{l.sqft ? `${l.sqft.toLocaleString()} sf` : ""}
                      {!l.units && !l.sqft && "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={l.status || "active"} /></td>
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