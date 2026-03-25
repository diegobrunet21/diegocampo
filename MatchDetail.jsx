import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Building2, DollarSign, Save, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DarkCard from "@/components/ui/DarkCard";
import TierBadge from "@/components/ui/TierBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import CrossAgentBadge from "@/components/ui/CrossAgentBadge";
import { useBrokerage } from "@/components/hooks/useBrokerage";
import MatchAnalysisCard from "@/components/matches/MatchAnalysisCard";

export default function MatchDetail() {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get("id");
  const { user, loading: authLoading, isBroker, isLoanOfficer } = useBrokerage();
  const [match, setMatch] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [listing, setListing] = useState(null);
  const [financing, setFinancing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [actionDate, setActionDate] = useState("");

  // Regression: open MatchDetail → loads. Wrong id → "not found". Wrong brokerage → "not found". Save notes/status → persists.
  useEffect(() => {
    if (authLoading || !user?.brokerage_id || !matchId) return;
    async function load() {
      // FIX #16: include brokerage_id in query for isolation
      const matches = await base44.entities.Match.filter({ id: matchId, brokerage_id: user.brokerage_id });
      if (matches.length === 0) { setLoading(false); return; }
      const m = matches[0];
      setMatch(m);
      setNotes(m.owner_notes || "");
      setStatus(m.status || "new");
      setActionDate(m.action_due_date || "");
      // FIX #16: scope related fetches by brokerage_id too
      const [buyers, listings, finItems] = await Promise.all([
        base44.entities.Buyer.filter({ id: m.buyer_id, brokerage_id: user.brokerage_id }),
        base44.entities.Listing.filter({ id: m.listing_id, brokerage_id: user.brokerage_id }),
        base44.entities.FinancingItem.filter({ match_id: m.id }),
      ]);
      if (buyers.length) setBuyer(buyers[0]);
      if (listings.length) setListing(listings[0]);
      if (finItems.length) setFinancing(finItems[0]);
      setLoading(false);
    }
    load();
  }, [authLoading, matchId, user]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Match.update(match.id, { owner_notes: notes, status, action_due_date: actionDate || undefined });
    setSaving(false);
  };

  const handleRequestPreQual = async () => {
    if (financing) return;
    setSaving(true);
    const item = await base44.entities.FinancingItem.create({
      brokerage_id: user.brokerage_id,
      match_id: match.id,
      buyer_id: match.buyer_id,
      listing_id: match.listing_id,
      buyer_name: match.buyer_name,
      listing_name: match.listing_name,
      status: "prequal_requested",
      estimated_loan_amount: listing?.asking_price ? listing.asking_price * 0.75 : undefined,
      ltv_estimate: 75,
    });
    setFinancing(item);
    setSaving(false);
  };

  const formatPrice = (v) => {
    if (!v) return "—";
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  if (loading) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading match...</div>;
  if (!match) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Match not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to={createPageUrl("Matches")} className="text-sm text-[var(--dm-text-muted)] hover:text-blue-400 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Matches
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[var(--dm-text)]">Match Detail</h1>
            <TierBadge tier={match.match_tier} size="lg" />
            {match.is_cross_agent && <CrossAgentBadge />}
          </div>
          <p className="text-sm text-[var(--dm-text-muted)] mt-1">Score: {match.match_score}/100</p>
        </div>
        <div className="text-3xl font-bold text-[var(--dm-text)]">{match.match_score}</div>
      </div>

      {/* Match Analysis */}
      <MatchAnalysisCard match={match} buyer={buyer} listing={listing} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Buyer */}
        <DarkCard>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-lg font-semibold text-[var(--dm-text)]">Buyer</h2>
          </div>
          {buyer ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Name</span><span className="text-[var(--dm-text)] font-medium">{buyer.name}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Budget</span><span className="text-[var(--dm-text)]">{formatPrice(buyer.price_min)} – {formatPrice(buyer.price_max)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Financing</span><span className="text-[var(--dm-text)] capitalize">{buyer.financing_type?.replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Motivation</span><span className={`font-medium capitalize ${buyer.motivation_level === "high" ? "text-emerald-400" : buyer.motivation_level === "medium" ? "text-amber-400" : "text-gray-400"}`}>{buyer.motivation_level}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Timeline</span><span className="text-[var(--dm-text)] capitalize">{buyer.timeline?.replace(/_/g, " ")}</span></div>
              {buyer.target_asset_classes?.length > 0 && (
                <div><span className="text-[var(--dm-text-muted)]">Asset Classes:</span><div className="flex flex-wrap gap-1 mt-1">{buyer.target_asset_classes.map(a => <span key={a} className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">{a}</span>)}</div></div>
              )}
            </div>
          ) : <p className="text-sm text-[var(--dm-text-dim)]">Buyer data not available</p>}
        </DarkCard>

        {/* Listing */}
        <DarkCard>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-lg font-semibold text-[var(--dm-text)]">Listing</h2>
          </div>
          {listing ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Property</span><span className="text-[var(--dm-text)] font-medium">{listing.property_name}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Price</span><span className="text-[var(--dm-text)]">{formatPrice(listing.asking_price)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Cap Rate</span><span className="text-[var(--dm-text)]">{listing.cap_rate ? `${listing.cap_rate}%` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">NOI</span><span className="text-[var(--dm-text)]">{formatPrice(listing.noi)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Asset Class</span><span className="text-[var(--dm-text)] capitalize">{listing.asset_class?.replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Units / SqFt</span><span className="text-[var(--dm-text)]">{listing.units || "—"} / {listing.sqft?.toLocaleString() || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--dm-text-muted)]">Condition</span><span className="text-[var(--dm-text)] capitalize">{listing.condition?.replace(/_/g, " ")}</span></div>
            </div>
          ) : <p className="text-sm text-[var(--dm-text-dim)]">Listing data not available</p>}
        </DarkCard>
      </div>

      {/* Actions */}
      <DarkCard>
        <h2 className="text-lg font-semibold text-[var(--dm-text)] mb-4">Actions & Notes</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-white">
              {["new","reviewed","contacted","showing","offer","under_contract","closed","dismissed"].map(s => (
                <option key={s} value={s} className="bg-[#111d35] text-white">{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Action Due Date</label>
            <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface)] border border-[var(--dm-border)] text-[var(--dm-text)]" />
          </div>
        </div>
        <Textarea placeholder="Add notes..." value={notes} onChange={e => setNotes(e.target.value)} className="bg-[var(--dm-bg)] border-[var(--dm-border)] text-[var(--dm-text)] min-h-[80px] mb-4" />
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </DarkCard>

      {/* Financing */}
      <DarkCard>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-amber-400" />
          <h2 className="text-lg font-semibold text-[var(--dm-text)]">Financing</h2>
        </div>
        {financing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--dm-text-muted)]">Status</span>
              <StatusBadge status={financing.status} />
            </div>
            {financing.assigned_loan_officer_name && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--dm-text-muted)]">Loan Officer</span>
                <span className="text-[var(--dm-text)]">{financing.assigned_loan_officer_name}</span>
              </div>
            )}
            {financing.estimated_loan_amount && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--dm-text-muted)]">Est. Loan Amount</span>
                <span className="text-[var(--dm-text)]">{formatPrice(financing.estimated_loan_amount)}</span>
              </div>
            )}
            {financing.ltv_estimate && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--dm-text-muted)]">LTV Estimate</span>
                <span className="text-[var(--dm-text)]">{financing.ltv_estimate}%</span>
              </div>
            )}
            <Link to={createPageUrl(`FinancingDetail?id=${financing.id}`)} className="text-xs text-blue-400 hover:underline">View full financing details →</Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 text-[var(--dm-text-dim)] mx-auto mb-2" />
            <p className="text-sm text-[var(--dm-text-muted)] mb-3">No financing item yet</p>
            {!isLoanOfficer && (
              <Button onClick={handleRequestPreQual} disabled={saving} variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                <DollarSign className="w-4 h-4 mr-2" /> Request Pre-Qualification
              </Button>
            )}
          </div>
        )}
      </DarkCard>
    </div>
  );
}