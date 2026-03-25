import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Users, Building2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DarkCard from "@/components/ui/DarkCard";
import { useBrokerage } from "@/components/hooks/useBrokerage";
import { generateMatchesForBrokerage } from "@/components/helpers/matchScoring";

export default function QuickAdd() {
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get("tab") || "buyer";
  const { user, loading: authLoading } = useBrokerage();
  const [tab, setTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Buyer fields
  const [buyerData, setBuyerData] = useState({
    name: "", email: "", phone: "", company: "",
    target_asset_classes: [], target_locations: [],
    price_min: "", price_max: "", financing_type: "conventional",
    motivation_level: "medium", timeline: "1_3_months", stage: "prospect",
  });
  const [locationInput, setLocationInput] = useState("");

  // Listing fields
  const [listingData, setListingData] = useState({
    property_name: "", address: "", city: "", state: "", zip: "",
    asset_class: "multifamily", asking_price: "", cap_rate: "", noi: "",
    units: "", sqft: "", condition: "good", occupancy: "", status: "active",
  });

  const assetClasses = ["Multifamily","Retail","Office","Industrial","Mixed-Use","Hospitality","Land","Self-Storage","Medical","Other"];

  const toggleAssetClass = (ac) => {
    setBuyerData(d => ({
      ...d,
      target_asset_classes: d.target_asset_classes.includes(ac)
        ? d.target_asset_classes.filter(a => a !== ac)
        : [...d.target_asset_classes, ac]
    }));
  };

  const addLocation = () => {
    if (locationInput.trim()) {
      setBuyerData(d => ({ ...d, target_locations: [...d.target_locations, locationInput.trim()] }));
      setLocationInput("");
    }
  };

  const [saveError, setSaveError] = useState("");

  const saveBuyer = async () => {
    if (!buyerData.name.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const data = {
        ...buyerData,
        brokerage_id: user.brokerage_id,
        agent_id: user.id,
        price_min: buyerData.price_min ? Number(buyerData.price_min) : undefined,
        price_max: buyerData.price_max ? Number(buyerData.price_max) : undefined,
      };
      await base44.entities.Buyer.create(data);
      setSaved(true);
      setTimeout(() => { window.location.href = createPageUrl("Buyers"); }, 1200);
      generateMatchesForBrokerage(base44, user.brokerage_id).catch(() => {});
    } catch (e) {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveListing = async () => {
    if (!listingData.property_name.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const data = {
        ...listingData,
        brokerage_id: user.brokerage_id,
        agent_id: user.id,
        asking_price: listingData.asking_price ? Number(listingData.asking_price) : undefined,
        cap_rate: listingData.cap_rate ? Number(listingData.cap_rate) : undefined,
        noi: listingData.noi ? Number(listingData.noi) : undefined,
        units: listingData.units ? Number(listingData.units) : undefined,
        sqft: listingData.sqft ? Number(listingData.sqft) : undefined,
        occupancy: listingData.occupancy ? Number(listingData.occupancy) : undefined,
      };
      await base44.entities.Listing.create(data);
      setSaved(true);
      setTimeout(() => { window.location.href = createPageUrl("Listings"); }, 1200);
      generateMatchesForBrokerage(base44, user.brokerage_id).catch(() => {});
    } catch (e) {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading...</div>;

  if (saved) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-lg font-medium text-[var(--dm-text)]">Saved successfully!</p>
          <p className="text-sm text-[var(--dm-text-muted)]">Matches are being updated...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--dm-text)]">Quick Add</h1>

      {/* Tabs */}
      <div className="flex bg-[var(--dm-surface)] rounded-lg p-1 border border-[var(--dm-border)]">
        <button onClick={() => setTab("buyer")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${tab === "buyer" ? "bg-blue-500/20 text-blue-400" : "text-[var(--dm-text-muted)]"}`}>
          <Users className="w-4 h-4" /> Buyer
        </button>
        <button onClick={() => setTab("listing")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${tab === "listing" ? "bg-blue-500/20 text-blue-400" : "text-[var(--dm-text-muted)]"}`}>
          <Building2 className="w-4 h-4" /> Listing
        </button>
      </div>

      {tab === "buyer" ? (
        <DarkCard>
          <h2 className="text-lg font-semibold text-[var(--dm-text)] mb-4">New Buyer</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Name *" value={buyerData.name} onChange={e => setBuyerData({...buyerData, name: e.target.value})} />
              <Input placeholder="Email" value={buyerData.email} onChange={e => setBuyerData({...buyerData, email: e.target.value})} />
              <Input placeholder="Phone" value={buyerData.phone} onChange={e => setBuyerData({...buyerData, phone: e.target.value})} />
              <Input placeholder="Company" value={buyerData.company} onChange={e => setBuyerData({...buyerData, company: e.target.value})} />
            </div>

            <div>
              <label className="text-xs text-[var(--dm-text-muted)] mb-2 block">Target Asset Classes</label>
              <div className="flex flex-wrap gap-2">
                {assetClasses.map(ac => (
                  <button key={ac} onClick={() => toggleAssetClass(ac)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      buyerData.target_asset_classes.includes(ac)
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-[var(--dm-bg)] text-[var(--dm-text-muted)] border-[var(--dm-border)] hover:border-[var(--dm-border-light)]"
                    }`}
                  >{ac}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--dm-text-muted)] mb-2 block">Target Locations</label>
              <div className="flex gap-2">
                <Input placeholder="City, state, or market" value={locationInput} onChange={e => setLocationInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addLocation()} />
                <Button onClick={addLocation} className="bg-[var(--dm-surface)] border border-[var(--dm-border)] text-[var(--dm-text)] hover:bg-[var(--dm-surface-2)]">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {buyerData.target_locations.map((loc, i) => (
                  <span key={i} className="px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    {loc}
                    <button onClick={() => setBuyerData(d => ({...d, target_locations: d.target_locations.filter((_, j) => j !== i)}))} className="hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Min Price ($)" value={buyerData.price_min} onChange={e => setBuyerData({...buyerData, price_min: e.target.value})} />
              <Input type="number" placeholder="Max Price ($)" value={buyerData.price_max} onChange={e => setBuyerData({...buyerData, price_max: e.target.value})} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Financing</label>
                <select value={buyerData.financing_type} onChange={e => setBuyerData({...buyerData, financing_type: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-[var(--dm-text)]">
                  {["cash","conventional","sba","bridge","hard_money","seller_financing","other"].map(f => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Motivation</label>
                <select value={buyerData.motivation_level} onChange={e => setBuyerData({...buyerData, motivation_level: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-[var(--dm-text)]">
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Timeline</label>
                <select value={buyerData.timeline} onChange={e => setBuyerData({...buyerData, timeline: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-[var(--dm-text)]">
                  <option value="immediate">Immediate</option><option value="1_3_months">1-3 Months</option><option value="3_6_months">3-6 Months</option><option value="6_12_months">6-12 Months</option><option value="12_plus_months">12+ Months</option>
                </select>
              </div>
            </div>

            {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
            <Button onClick={saveBuyer} disabled={saving || !buyerData.name.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {saving ? "Saving..." : "Add Buyer"}
            </Button>
          </div>
        </DarkCard>
      ) : (
        <DarkCard>
          <h2 className="text-lg font-semibold text-[var(--dm-text)] mb-4">New Listing</h2>
          <div className="space-y-4">
            <Input placeholder="Property Name *" value={listingData.property_name} onChange={e => setListingData({...listingData, property_name: e.target.value})} />
            <Input placeholder="Address" value={listingData.address} onChange={e => setListingData({...listingData, address: e.target.value})} />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City" value={listingData.city} onChange={e => setListingData({...listingData, city: e.target.value})} />
              <Input placeholder="State" value={listingData.state} onChange={e => setListingData({...listingData, state: e.target.value})} />
              <Input placeholder="ZIP" value={listingData.zip} onChange={e => setListingData({...listingData, zip: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Asset Class</label>
              <select value={listingData.asset_class} onChange={e => setListingData({...listingData, asset_class: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-[var(--dm-text)]">
                {["multifamily","retail","office","industrial","mixed_use","hospitality","land","self_storage","medical","other"].map(a => (
                  <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Asking Price ($)" value={listingData.asking_price} onChange={e => setListingData({...listingData, asking_price: e.target.value})} />
              <Input type="number" placeholder="Cap Rate (%)" value={listingData.cap_rate} onChange={e => setListingData({...listingData, cap_rate: e.target.value})} />
              <Input type="number" placeholder="NOI ($)" value={listingData.noi} onChange={e => setListingData({...listingData, noi: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Units" value={listingData.units} onChange={e => setListingData({...listingData, units: e.target.value})} />
              <Input type="number" placeholder="SqFt" value={listingData.sqft} onChange={e => setListingData({...listingData, sqft: e.target.value})} />
              <Input type="number" placeholder="Occupancy (%)" value={listingData.occupancy} onChange={e => setListingData({...listingData, occupancy: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Condition</label>
                <select value={listingData.condition} onChange={e => setListingData({...listingData, condition: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-[var(--dm-text)]">
                  {["excellent","good","fair","poor","renovation_needed"].map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Status</label>
                <select value={listingData.status} onChange={e => setListingData({...listingData, status: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-[var(--dm-text)]">
                  <option value="active">Active</option><option value="pending">Pending</option><option value="under_contract">Under Contract</option>
                </select>
              </div>
            </div>

            {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
            <Button onClick={saveListing} disabled={saving || !listingData.property_name.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {saving ? "Saving..." : "Add Listing"}
            </Button>
          </div>
        </DarkCard>
      )}
    </div>
  );
}