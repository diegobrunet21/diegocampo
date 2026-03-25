import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DarkCard from "@/components/ui/DarkCard";
import StatusBadge from "@/components/ui/StatusBadge";
import TierBadge from "@/components/ui/TierBadge";
import { useBrokerage } from "@/components/hooks/useBrokerage";

export default function BuyerDetail() {
  const params = new URLSearchParams(window.location.search);
  const buyerId = params.get("id");
  const { user, loading: authLoading, isBroker } = useBrokerage();
  const [buyer, setBuyer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Regression: open /BuyerDetail?id=X → buyer loads. Open with wrong id → "not found". Wrong brokerage id → "not found".
  useEffect(() => {
    if (authLoading || !user?.brokerage_id || !buyerId) return;
    async function load() {
      // FIX #16: include brokerage_id in query for isolation
      const [buyers, m] = await Promise.all([
        base44.entities.Buyer.filter({ id: buyerId, brokerage_id: user.brokerage_id }),
        base44.entities.Match.filter({ buyer_id: buyerId, brokerage_id: user.brokerage_id }),
      ]);
      if (buyers.length) {
        setBuyer(buyers[0]);
        setEditData(buyers[0]);
      }
      setMatches(m);
      setLoading(false);
    }
    load();
  }, [authLoading, buyerId, user]);

  const handleSave = async () => {
    setSaving(true);
    const { id, created_date, updated_date, created_by, ...data } = editData;
    await base44.entities.Buyer.update(buyer.id, data);
    setBuyer({ ...buyer, ...data });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this buyer?")) return;
    await base44.entities.Buyer.delete(buyer.id);
    window.location.href = createPageUrl("Buyers");
  };

  const formatPrice = (v) => {
    if (!v) return "—";
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  if (loading) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading...</div>;
  if (!buyer) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Buyer not found</div>;

  const canEdit = isBroker || buyer.agent_id === user?.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to={createPageUrl("Buyers")} className="text-sm text-[var(--dm-text-muted)] hover:text-blue-400 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Buyers
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dm-text)]">{buyer.name}</h1>
          {buyer.company && <p className="text-sm text-[var(--dm-text-muted)]">{buyer.company}</p>}
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && <Button onClick={() => setEditing(true)} variant="outline" className="border-[var(--dm-border)] text-[var(--dm-text)]">Edit</Button>}
          {canEdit && <Button onClick={handleDelete} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>}
        </div>
      </div>

      {editing ? (
        <DarkCard>
          <h2 className="text-lg font-semibold text-[var(--dm-text)] mb-4">Edit Buyer</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Name" value={editData.name || ""} onChange={e => setEditData({...editData, name: e.target.value})} />
              <Input placeholder="Email" value={editData.email || ""} onChange={e => setEditData({...editData, email: e.target.value})} />
              <Input placeholder="Phone" value={editData.phone || ""} onChange={e => setEditData({...editData, phone: e.target.value})} />
              <Input placeholder="Company" value={editData.company || ""} onChange={e => setEditData({...editData, company: e.target.value})} />
              <Input type="number" placeholder="Min Price" value={editData.price_min || ""} onChange={e => setEditData({...editData, price_min: Number(e.target.value)})} />
              <Input type="number" placeholder="Max Price" value={editData.price_max || ""} onChange={e => setEditData({...editData, price_max: Number(e.target.value)})} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select value={editData.stage || "prospect"} onChange={e => setEditData({...editData, stage: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm">
                {["prospect","active","under_contract","closed","inactive"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <select value={editData.motivation_level || "medium"} onChange={e => setEditData({...editData, motivation_level: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm">
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
              <select value={editData.status || "active"} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full px-3 py-2 rounded-lg text-sm">
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
            <Textarea placeholder="Notes" value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} className="bg-[var(--dm-bg)] min-h-[60px]" />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
              </Button>
              <Button onClick={() => { setEditing(false); setEditData(buyer); }} variant="outline" className="border-[var(--dm-border)] text-[var(--dm-text)]">Cancel</Button>
            </div>
          </div>
        </DarkCard>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <DarkCard>
            <h2 className="font-semibold text-[var(--dm-text)] mb-3">Details</h2>
            <div className="space-y-2 text-sm">
              {buyer.email && <div className="flex items-center gap-2 text-[var(--dm-text)]"><Mail className="w-3.5 h-3.5 text-[var(--dm-text-dim)]" />{buyer.email}</div>}
              {buyer.phone && <div className="flex items-center gap-2 text-[var(--dm-text)]"><Phone className="w-3.5 h-3.5 text-[var(--dm-text-dim)]" />{buyer.phone}</div>}
              <div className="flex justify-between pt-2 border-t border-[var(--dm-border)]"><span className="text-[var(--dm-text-muted)]">Budget</span><span className="text-[var(--dm-text)]">{formatPrice(buyer.price_min)} – {formatPrice(buyer.price_max)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Financing</span><span className="capitalize text-[var(--dm-text)]">{buyer.financing_type?.replace(/_/g, " ") || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Stage</span><StatusBadge status={buyer.stage || "prospect"} /></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Motivation</span><span className={`capitalize font-medium ${buyer.motivation_level === "high" ? "text-emerald-400" : buyer.motivation_level === "medium" ? "text-amber-400" : "text-gray-400"}`}>{buyer.motivation_level || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Timeline</span><span className="capitalize text-[var(--dm-text)]">{buyer.timeline?.replace(/_/g, " ") || "—"}</span></div>
              {buyer.target_locations?.length > 0 && (
                <div className="pt-2 border-t border-[var(--dm-border)]"><span className="text-[var(--dm-text-muted)] block mb-1">Locations:</span><div className="flex flex-wrap gap-1">{buyer.target_locations.map(l => <span key={l} className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400">{l}</span>)}</div></div>
              )}
              {buyer.notes && <div className="pt-2 border-t border-[var(--dm-border)]"><span className="text-[var(--dm-text-muted)] block mb-1">Notes:</span><p className="text-[var(--dm-text)]">{buyer.notes}</p></div>}
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
                      <p className="text-sm font-medium text-[var(--dm-text)]">{m.listing_name}</p>
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