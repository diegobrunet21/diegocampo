import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DarkCard from "@/components/ui/DarkCard";
import StatusBadge from "@/components/ui/StatusBadge";
import TierBadge from "@/components/ui/TierBadge";
import { useBrokerage } from "@/components/hooks/useBrokerage";

export default function ListingDetail() {
  const params = new URLSearchParams(window.location.search);
  const listingId = params.get("id");
  const { user, loading: authLoading, isBroker } = useBrokerage();
  const [listing, setListing] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Regression: open /ListingDetail?id=X → listing loads. Wrong id → "not found". Wrong brokerage → "not found".
  useEffect(() => {
    if (authLoading || !user?.brokerage_id || !listingId) return;
    async function load() {
      // FIX #16: include brokerage_id in query for isolation
      const [listings, m] = await Promise.all([
        base44.entities.Listing.filter({ id: listingId, brokerage_id: user.brokerage_id }),
        base44.entities.Match.filter({ listing_id: listingId, brokerage_id: user.brokerage_id }),
      ]);
      if (listings.length) {
        setListing(listings[0]);
        setEditData(listings[0]);
      }
      setMatches(m);
      setLoading(false);
    }
    load();
  }, [authLoading, listingId, user]);

  const handleSave = async () => {
    setSaving(true);
    const { id, created_date, updated_date, created_by, ...data } = editData;
    // Ensure numbers
    ["asking_price","cap_rate","noi","units","sqft","occupancy","year_built"].forEach(f => {
      if (data[f]) data[f] = Number(data[f]);
    });
    await base44.entities.Listing.update(listing.id, data);
    setListing({ ...listing, ...data });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this listing?")) return;
    await base44.entities.Listing.delete(listing.id);
    window.location.href = createPageUrl("Listings");
  };

  const formatPrice = (v) => {
    if (!v) return "—";
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  if (loading) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading...</div>;
  if (!listing) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Listing not found</div>;

  const canEdit = isBroker || listing.agent_id === user?.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to={createPageUrl("Listings")} className="text-sm text-[var(--dm-text-muted)] hover:text-blue-400 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Listings
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dm-text)]">{listing.property_name}</h1>
          {(listing.city || listing.state) && <p className="text-sm text-[var(--dm-text-muted)] flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[listing.address, listing.city, listing.state, listing.zip].filter(Boolean).join(", ")}</p>}
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && <Button onClick={() => setEditing(true)} variant="outline" className="border-[var(--dm-border)] text-[var(--dm-text)]">Edit</Button>}
          {canEdit && <Button onClick={handleDelete} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>}
        </div>
      </div>

      {editing ? (
        <DarkCard>
          <h2 className="text-lg font-semibold text-[var(--dm-text)] mb-4">Edit Listing</h2>
          <div className="space-y-4">
            <Input placeholder="Property Name" value={editData.property_name || ""} onChange={e => setEditData({...editData, property_name: e.target.value})} />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City" value={editData.city || ""} onChange={e => setEditData({...editData, city: e.target.value})} />
              <Input placeholder="State" value={editData.state || ""} onChange={e => setEditData({...editData, state: e.target.value})} />
              <Input type="number" placeholder="Asking Price" value={editData.asking_price || ""} onChange={e => setEditData({...editData, asking_price: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Cap Rate" value={editData.cap_rate || ""} onChange={e => setEditData({...editData, cap_rate: e.target.value})} />
              <Input type="number" placeholder="NOI" value={editData.noi || ""} onChange={e => setEditData({...editData, noi: e.target.value})} />
              <Input type="number" placeholder="Units" value={editData.units || ""} onChange={e => setEditData({...editData, units: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={editData.status || "active"} onChange={e => setEditData({...editData, status: e.target.value})} className="px-3 py-2 rounded-lg text-sm">
                {["active","pending","under_contract","sold","withdrawn"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <select value={editData.condition || "good"} onChange={e => setEditData({...editData, condition: e.target.value})} className="px-3 py-2 rounded-lg text-sm">
                {["excellent","good","fair","poor","renovation_needed"].map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <Textarea placeholder="Notes" value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} className="bg-[var(--dm-bg)] min-h-[60px]" />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
              </Button>
              <Button onClick={() => { setEditing(false); setEditData(listing); }} variant="outline" className="border-[var(--dm-border)] text-[var(--dm-text)]">Cancel</Button>
            </div>
          </div>
        </DarkCard>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <DarkCard>
            <h2 className="font-semibold text-[var(--dm-text)] mb-3">Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Price</span><span className="text-[var(--dm-text)] font-medium">{formatPrice(listing.asking_price)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Cap Rate</span><span className="text-[var(--dm-text)]">{listing.cap_rate ? `${listing.cap_rate}%` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">NOI</span><span className="text-[var(--dm-text)]">{formatPrice(listing.noi)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Asset Class</span><span className="capitalize text-[var(--dm-text)]">{listing.asset_class?.replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Units</span><span className="text-[var(--dm-text)]">{listing.units || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">SqFt</span><span className="text-[var(--dm-text)]">{listing.sqft?.toLocaleString() || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Condition</span><span className="capitalize text-[var(--dm-text)]">{listing.condition?.replace(/_/g, " ") || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Occupancy</span><span className="text-[var(--dm-text)]">{listing.occupancy ? `${listing.occupancy}%` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Status</span><StatusBadge status={listing.status || "active"} /></div>
              {listing.notes && <div className="pt-2 border-t border-[var(--dm-border)]"><span className="text-[var(--dm-text-muted)] block mb-1">Notes:</span><p className="text-[var(--dm-text)]">{listing.notes}</p></div>}
            </div>
          </DarkCard>

          <DarkCard>
            <h2 className="font-semibold text-[var(--dm-text)] mb-3">Matches ({matches.length})</h2>
            {matches.length === 0 ? (
              <p className="text-sm text-[var(--dm-text-muted)]">No matches yet</p>
            ) : (
              <div className="space-y-2">
                {matches.map(m => (
                  <Link key={m.id} to={createPageUrl(`MatchDetail?id=${m.id}`)} className="flex items-center justify-between p-3 rounded-lg bg-[var(--dm-bg)] hover:bg-[var(--dm-surface-2)] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[var(--dm-text)]">{m.buyer_name}</p>
                      <p className="text-xs text-[var(--dm-text-muted)]">Score: {m.match_score}</p>
                    </div>
                    <TierBadge tier={m.match_tier} />
                  </Link>
                ))}
              </div>
            )}
          </DarkCard>
        </div>
      )}
    </div>
  );
}