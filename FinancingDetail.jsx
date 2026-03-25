import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2, DollarSign, FileText, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DarkCard from "@/components/ui/DarkCard";
import StatusBadge from "@/components/ui/StatusBadge";
import TierBadge from "@/components/ui/TierBadge";
import { useBrokerage } from "@/components/hooks/useBrokerage";

const STATUS_OPTIONS = ["not_reviewed","prequal_requested","prequalified","underwriting","approved","cleared_to_close","closed","not_a_fit"];

export default function FinancingDetail() {
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("id");
  const { user, loading: authLoading, isBroker, isLoanOfficer } = useBrokerage();
  const [item, setItem] = useState(null);
  const [match, setMatch] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [listing, setListing] = useState(null);
  const [loanOfficers, setLoanOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [ltv, setLtv] = useState("");
  const [dscr, setDscr] = useState("");
  const [assignedLO, setAssignedLO] = useState("");
  const [docs, setDocs] = useState([]);
  const [newDocName, setNewDocName] = useState("");

  // Regression: open FinancingDetail → loads. LO can update status only. Broker can save all fields. LO dropdown populates.
  useEffect(() => {
    if (authLoading || !itemId || !user?.brokerage_id) return;
    async function load() {
      // FIX #16: include brokerage_id in query for isolation
      const items = await base44.entities.FinancingItem.filter({ id: itemId, brokerage_id: user.brokerage_id });
      if (!items.length) { setLoading(false); return; }
      const fi = items[0];
      setItem(fi);
      setStatus(fi.status || "not_reviewed");
      setNotes(fi.notes || "");
      setLoanAmount(fi.estimated_loan_amount || "");
      setDownPayment(fi.down_payment_estimate || "");
      setLtv(fi.ltv_estimate || "");
      setDscr(fi.dscr_estimate || "");
      setAssignedLO(fi.assigned_loan_officer_id || "");
      setDocs(fi.requested_docs || []);

      const promises = [
        fi.match_id ? base44.entities.Match.filter({ id: fi.match_id }) : Promise.resolve([]),
        fi.buyer_id ? base44.entities.Buyer.filter({ id: fi.buyer_id }) : Promise.resolve([]),
        fi.listing_id ? base44.entities.Listing.filter({ id: fi.listing_id }) : Promise.resolve([]),
        // FIX #2: filter client-side since app_role may not be a DB-level filterable field
        base44.entities.User.filter({ brokerage_id: user.brokerage_id }),
      ];
      const results = await Promise.all(promises);
      if (results[0].length) setMatch(results[0][0]);
      if (results[1].length) setBuyer(results[1][0]);
      if (results[2].length) setListing(results[2][0]);
      if (results[3]) setLoanOfficers(results[3].filter(u => u.app_role === "loan_officer"));
      setLoading(false);
    }
    load();
  }, [authLoading, itemId, user]);

  // FIX #1: loan officers can update status only
  const handleSaveLOStatus = async () => {
    setSaving(true);
    await base44.entities.FinancingItem.update(item.id, { status });
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const loName = loanOfficers.find(lo => lo.id === assignedLO)?.full_name || item.assigned_loan_officer_name;
    await base44.entities.FinancingItem.update(item.id, {
      status,
      notes,
      estimated_loan_amount: loanAmount ? Number(loanAmount) : undefined,
      down_payment_estimate: downPayment ? Number(downPayment) : undefined,
      ltv_estimate: ltv ? Number(ltv) : undefined,
      dscr_estimate: dscr ? Number(dscr) : undefined,
      assigned_loan_officer_id: assignedLO || undefined,
      assigned_loan_officer_name: loName || undefined,
      requested_docs: docs,
    });
    setSaving(false);
  };

  const addDoc = () => {
    if (!newDocName.trim()) return;
    setDocs([...docs, { name: newDocName.trim(), status: "requested" }]);
    setNewDocName("");
  };

  const toggleDocStatus = (idx) => {
    const newDocs = [...docs];
    const statuses = ["requested", "received", "reviewed"];
    const currentIdx = statuses.indexOf(newDocs[idx].status);
    newDocs[idx].status = statuses[(currentIdx + 1) % statuses.length];
    setDocs(newDocs);
  };

  const removeDoc = (idx) => {
    setDocs(docs.filter((_, i) => i !== idx));
  };

  const formatPrice = (v) => {
    if (!v) return "—";
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  if (loading) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Loading...</div>;
  if (!item) return <div className="text-center py-12 text-[var(--dm-text-muted)]">Financing item not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to={createPageUrl("Capital")} className="text-sm text-[var(--dm-text-muted)] hover:text-blue-400 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Capital Pipeline
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dm-text)]">Financing Detail</h1>
          <p className="text-sm text-[var(--dm-text-muted)]">{item.buyer_name} → {item.listing_name}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main editing area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Assignment */}
          <DarkCard>
            <h2 className="font-semibold text-[var(--dm-text)] mb-4">Status & Assignment</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-white">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s} className="bg-[#111d35] text-white">{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              {!isLoanOfficer && (
                <div>
                  <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Assigned Loan Officer</label>
                  <select value={assignedLO} onChange={e => setAssignedLO(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-white">
                    <option value="" className="bg-[#111d35] text-white">Unassigned</option>
                    {loanOfficers.map(lo => <option key={lo.id} value={lo.id} className="bg-[#111d35] text-white">{lo.full_name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </DarkCard>

          {/* Metrics */}
          <DarkCard>
            <h2 className="font-semibold text-[var(--dm-text)] mb-4">Financing Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Est. Loan Amount ($)</label>
                {isLoanOfficer
                  ? <p className="text-sm font-medium text-[var(--dm-text)] py-2">{loanAmount ? `$${Number(loanAmount).toLocaleString()}` : "—"}</p>
                  : <Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />}
              </div>
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">Down Payment ($)</label>
                {isLoanOfficer
                  ? <p className="text-sm font-medium text-[var(--dm-text)] py-2">{downPayment ? `$${Number(downPayment).toLocaleString()}` : "—"}</p>
                  : <Input type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} />}
              </div>
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">LTV Estimate (%)</label>
                {isLoanOfficer
                  ? <p className="text-sm font-medium text-[var(--dm-text)] py-2">{ltv ? `${ltv}%` : "—"}</p>
                  : <Input type="number" value={ltv} onChange={e => setLtv(e.target.value)} />}
              </div>
              <div>
                <label className="text-xs text-[var(--dm-text-muted)] mb-1 block">DSCR Estimate</label>
                {isLoanOfficer
                  ? <p className="text-sm font-medium text-[var(--dm-text)] py-2">{dscr || "—"}</p>
                  : <Input type="number" step="0.01" value={dscr} onChange={e => setDscr(e.target.value)} />}
              </div>
            </div>
          </DarkCard>

          {/* Documents */}
          <DarkCard>
            <h2 className="font-semibold text-[var(--dm-text)] mb-4">Requested Documents</h2>
            <div className="space-y-2 mb-4">
              {docs.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--dm-bg)]">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-[var(--dm-text-dim)]" />
                    <span className="text-sm text-[var(--dm-text)]">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleDocStatus(idx)} className="text-xs">
                      <StatusBadge status={doc.status === "requested" ? "prequal_requested" : doc.status === "received" ? "prequalified" : "approved"} />
                    </button>
                    <button onClick={() => removeDoc(idx)} className="text-[var(--dm-text-dim)] hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {docs.length === 0 && <p className="text-sm text-[var(--dm-text-dim)]">No documents requested</p>}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Document name..." value={newDocName} onChange={e => setNewDocName(e.target.value)} onKeyDown={e => e.key === "Enter" && addDoc()} />
              <Button onClick={addDoc} variant="outline" className="border-[var(--dm-border)] text-[var(--dm-text)]">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </DarkCard>

          {/* Notes */}
          <DarkCard>
            <h2 className="font-semibold text-[var(--dm-text)] mb-4">Notes</h2>
            {isLoanOfficer
              ? <p className="text-sm text-[var(--dm-text-muted)] py-2">{notes || "No notes"}</p>
              : <Textarea placeholder="Add financing notes..." value={notes} onChange={e => setNotes(e.target.value)} className="bg-[var(--dm-bg)] min-h-[80px] mb-4" />}
          </DarkCard>

          {isLoanOfficer ? (
            <Button onClick={handleSaveLOStatus} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white w-full py-5">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Update Status
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white w-full py-5">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save All Changes
            </Button>
          )}
          </div>

        {/* Sidebar context */}
        <div className="space-y-6">
          {match && (
            <DarkCard>
              <h3 className="text-sm font-semibold text-[var(--dm-text)] mb-2">Match Context</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--dm-text-muted)]">Score:</span>
                  <span className="text-[var(--dm-text)] font-bold">{match.match_score}</span>
                  <TierBadge tier={match.match_tier} />
                </div>
                <p className="text-xs text-[var(--dm-text-muted)]">{match.match_reasons}</p>
                <Link to={createPageUrl(`MatchDetail?id=${match.id}`)} className="text-xs text-blue-400 hover:underline">View match →</Link>
              </div>
            </DarkCard>
          )}

          {buyer && (
            <DarkCard>
              <h3 className="text-sm font-semibold text-[var(--dm-text)] mb-2">Buyer Summary</h3>
              <div className="space-y-1 text-sm">
                <p className="text-[var(--dm-text)]">{buyer.name}</p>
                <p className="text-xs text-[var(--dm-text-muted)]">Budget: {formatPrice(buyer.price_min)} – {formatPrice(buyer.price_max)}</p>
                <p className="text-xs text-[var(--dm-text-muted)] capitalize">Financing: {buyer.financing_type?.replace(/_/g, " ")}</p>
                <p className="text-xs text-[var(--dm-text-muted)] capitalize">Pre-approved: {buyer.pre_approved ? "Yes" : "No"}</p>
              </div>
            </DarkCard>
          )}

          {listing && (
            <DarkCard>
              <h3 className="text-sm font-semibold text-[var(--dm-text)] mb-2">Listing Summary</h3>
              <div className="space-y-1 text-sm">
                <p className="text-[var(--dm-text)]">{listing.property_name}</p>
                <p className="text-xs text-[var(--dm-text-muted)]">Price: {formatPrice(listing.asking_price)}</p>
                <p className="text-xs text-[var(--dm-text-muted)]">Cap Rate: {listing.cap_rate ? `${listing.cap_rate}%` : "—"}</p>
                <p className="text-xs text-[var(--dm-text-muted)]">NOI: {formatPrice(listing.noi)}</p>
              </div>
            </DarkCard>
          )}
        </div>
      </div>
    </div>
  );
}