import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import DarkCard from "@/components/ui/DarkCard";

/**
 * Live match analysis: always recomputes from buyer + listing data
 * so even old matches get proper gap/upgrade breakdown.
 */
export default function MatchAnalysisCard({ match, buyer, listing }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!buyer || !listing) return;
    computeAnalysis(buyer, listing, match);
  }, [buyer, listing]);

  async function computeAnalysis(buyer, listing, match) {
    setLoading(true);

    const fmt = (v) => {
      if (!v) return "N/A";
      if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
      return `$${v}`;
    };

    const strengths = [];
    const gaps = [];
    const toBeA = [];
    let score = 0;

    // ── Price Fit (30 pts) ──
    if (listing.asking_price && (buyer.price_min != null || buyer.price_max != null)) {
      const min = buyer.price_min ?? 0;
      const max = buyer.price_max ?? Infinity;
      const price = listing.asking_price;
      if (price >= min && price <= max) {
        score += 30;
        strengths.push(`Price ${fmt(price)} is within buyer's budget (${fmt(min)} – ${fmt(max)})`);
      } else if (price <= max * 1.10 && price >= min * 0.90) {
        score += 18;
        gaps.push(`Price ${fmt(price)} is slightly outside buyer's range (${fmt(min)} – ${fmt(max)}) by ~10%`);
        toBeA.push(`Negotiate price closer to ${fmt(max)} or buyer increases budget`);
      } else if (price <= max * 1.20 && price >= min * 0.80) {
        score += 8;
        gaps.push(`Price ${fmt(price)} is ~20% outside buyer's range (${fmt(min)} – ${fmt(max)})`);
        toBeA.push(`Significant price gap — listing at ${fmt(price)} vs buyer max ${fmt(max)}`);
      } else {
        gaps.push(`Price ${fmt(price)} is well outside buyer's budget of ${fmt(min)} – ${fmt(max)}`);
        toBeA.push(`Price gap is too large — listing at ${fmt(price)} vs buyer max ${fmt(max)}`);
      }
    } else {
      gaps.push("Price or buyer budget missing — price fit unknown");
      toBeA.push("Add asking price to listing and budget to buyer profile");
    }

    // ── Asset Class (30 pts) ──
    if (buyer.target_asset_classes?.length && listing.asset_class) {
      const listingClass = listing.asset_class.toLowerCase().replace(/[-\s]/g, "_");
      const normalized = buyer.target_asset_classes.map(a => a.toLowerCase().replace(/[-\s]/g, "_"));
      if (normalized.includes(listingClass)) {
        score += 30;
        strengths.push(`Asset class match — ${listing.asset_class.replace(/_/g, " ")}`);
      } else {
        gaps.push(`Asset class mismatch — listing is ${listing.asset_class.replace(/_/g, " ")}, buyer targets: ${buyer.target_asset_classes.join(", ")}`);
        toBeA.push(`Buyer would need to add ${listing.asset_class.replace(/_/g, " ")} to their target asset classes`);
      }
    } else if (!buyer.target_asset_classes?.length) {
      gaps.push("Buyer has no target asset classes set");
      toBeA.push("Add target asset classes to buyer profile");
    }

    // ── Location (20 pts) ──
    const targetLocs = (buyer.target_locations || []).map(l => l.toLowerCase().trim());
    const listingCity = (listing.city || "").toLowerCase();
    const listingState = (listing.state || "").toLowerCase();
    const listingZip = listing.zip || "";

    if (targetLocs.length > 0) {
      // Try to resolve zip via LLM — only if valid 5-digit zip, with module-level cache
      let resolved = null;
      const cleanZip = listingZip.trim();
      if (cleanZip && /^\d{5}$/.test(cleanZip)) {
        if (zipCache.has(cleanZip)) {
          resolved = zipCache.get(cleanZip);
        } else {
          try {
            resolved = await base44.integrations.Core.InvokeLLM({
              prompt: `What city, county, state, and metro area is zip code ${cleanZip}? Reply only with JSON: {"city":"...","county":"...","state":"...","state_full":"...","metro":"..."}`,
              add_context_from_internet: true,
              response_json_schema: {
                type: "object",
                properties: {
                  city: { type: "string" },
                  county: { type: "string" },
                  state: { type: "string" },
                  state_full: { type: "string" },
                  metro: { type: "string" },
                },
              },
            });
            if (resolved?.city) zipCache.set(cleanZip, resolved);
          } catch (e) { /* ignore */ }
        }
      }

      const tokens = [
        listingCity,
        listingState,
        resolved?.city?.toLowerCase(),
        resolved?.county?.toLowerCase(),
        resolved?.state?.toLowerCase(),
        resolved?.state_full?.toLowerCase(),
        resolved?.metro?.toLowerCase(),
      ].filter(Boolean);

      const displayLoc = resolved
        ? `${resolved.city}, ${resolved.state}${resolved.metro ? ` (${resolved.metro} metro)` : ""}`
        : [listing.city, listing.state].filter(Boolean).join(", ") || listingZip || "unknown";

      let matched = false;
      for (const target of targetLocs) {
        const cityHit = tokens.some(t => t.includes(target) || target.includes(t));
        if (cityHit) {
          score += 20;
          strengths.push(`Location match — ${displayLoc} matches buyer target "${target}"`);
          matched = true;
          break;
        }
        const stateHit = listingState && (target.includes(listingState) || listingState.includes(target));
        const resolvedStateHit = resolved && (target.includes(resolved.state?.toLowerCase()) || target.includes(resolved.state_full?.toLowerCase()));
        if (stateHit || resolvedStateHit) {
          score += 10;
          strengths.push(`State-level location match — ${displayLoc}`);
          gaps.push(`City not in buyer's target markets — only state matches`);
          toBeA.push(`Buyer should add ${resolved?.city || listing.city || displayLoc} to their target markets`);
          matched = true;
          break;
        }
      }
      if (!matched) {
        gaps.push(`Location mismatch — listing is in ${displayLoc}, buyer targets: ${buyer.target_locations.join(", ")}`);
        toBeA.push(`Buyer would need to add ${displayLoc} to their target markets`);
      }
    } else {
      gaps.push("Buyer has no target locations set");
      toBeA.push("Add target markets to buyer profile");
    }

    // ── Financial Fit (10 pts) ──
    if (buyer.min_cap_rate && listing.cap_rate) {
      if (listing.cap_rate >= buyer.min_cap_rate) {
        score += 6;
        strengths.push(`Cap rate ${listing.cap_rate}% meets buyer minimum ${buyer.min_cap_rate}%`);
      } else if (listing.cap_rate >= buyer.min_cap_rate - 0.5) {
        score += 2;
        gaps.push(`Cap rate ${listing.cap_rate}% is just under buyer's minimum of ${buyer.min_cap_rate}%`);
        toBeA.push(`Cap rate needs to reach ${buyer.min_cap_rate}% (only ${listing.cap_rate}% currently)`);
      } else {
        gaps.push(`Cap rate ${listing.cap_rate}% is below buyer's minimum of ${buyer.min_cap_rate}%`);
        toBeA.push(`Cap rate needs to improve from ${listing.cap_rate}% to ${buyer.min_cap_rate}%+`);
      }
    } else if (buyer.min_cap_rate && !listing.cap_rate) {
      gaps.push(`Buyer requires ${buyer.min_cap_rate}% minimum cap rate but listing has none listed`);
      toBeA.push("Add cap rate to listing");
    }

    if (buyer.min_units && listing.units) {
      if (listing.units >= buyer.min_units) {
        score += 4;
        strengths.push(`${listing.units} units meets buyer minimum of ${buyer.min_units}`);
      } else {
        gaps.push(`${listing.units} units is below buyer's minimum of ${buyer.min_units} units`);
        toBeA.push(`Unit count needs to reach at least ${buyer.min_units}`);
      }
    }

    // ── Deal Momentum (10 pts — bonus only, no penalties) ──
    if (buyer.motivation_level === "high") { score += 3; strengths.push("Highly motivated buyer"); }
    else if (buyer.motivation_level === "medium") { score += 1; strengths.push("Buyer has moderate motivation"); }

    if (listing.seller_motivation === "high") { score += 3; strengths.push("Highly motivated seller"); }
    else if (listing.seller_motivation === "medium") { score += 1; strengths.push("Seller has moderate motivation"); }

    if (buyer.timeline === "immediate" || buyer.timeline === "1_3_months") { score += 2; strengths.push(`Near-term buyer timeline (${buyer.timeline.replace(/_/g, " ")})`); }

    if (buyer.pre_approved || buyer.financing_type === "cash") { score += 2; strengths.push(buyer.financing_type === "cash" ? "Cash buyer" : "Pre-approved financing"); }

    const finalScore = Math.min(Math.round(score), 100);
    const pointsToA = Math.max(0, 75 - finalScore);

    setAnalysis({ strengths, gaps, toBeA, finalScore, pointsToA });
    setLoading(false);
  }

  if (!buyer || !listing) {
    // Fallback: render stored reasons if no buyer/listing yet
    if (!match?.match_reasons) return null;
    const sections = match.match_reasons.split(" | ");
    return (
      <DarkCard>
        <p className="text-xs uppercase tracking-wider text-[var(--dm-text-muted)] mb-3">Match Analysis</p>
        <div className="space-y-2">
          {sections.map((section, i) => {
            const isStrength = section.startsWith("✓");
            const isGap = section.startsWith("✗");
            const isUpgrade = section.startsWith("→");
            return (
              <div key={i} className={`rounded-lg px-3 py-2 text-sm ${
                isStrength ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" :
                isGap ? "bg-red-500/10 border border-red-500/20 text-red-300" :
                isUpgrade ? "bg-amber-500/10 border border-amber-500/20 text-amber-300" :
                "bg-[var(--dm-surface-2)] text-[var(--dm-text)]"
              }`}>{section}</div>
            );
          })}
        </div>
      </DarkCard>
    );
  }

  return (
    <DarkCard>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-[var(--dm-text-muted)]">Match Analysis</p>
        {loading && <div className="flex items-center gap-1.5 text-xs text-blue-400"><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</div>}
      </div>

      {loading && !analysis ? (
        <div className="text-xs text-[var(--dm-text-muted)] py-2">Computing live analysis…</div>
      ) : analysis ? (
        <div className="space-y-3">
          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div className="rounded-lg px-3 py-2.5 space-y-1 bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">✓ What's Working</p>
              {analysis.strengths.map((s, i) => (
                <p key={i} className="text-sm text-emerald-300">• {s}</p>
              ))}
            </div>
          )}

          {/* Gaps */}
          {analysis.gaps.length > 0 && (
            <div className="rounded-lg px-3 py-2.5 space-y-1 bg-red-500/10 border border-red-500/20">
              <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">✗ Why It's Not Tier A</p>
              {analysis.gaps.map((g, i) => (
                <p key={i} className="text-sm text-red-300">• {g}</p>
              ))}
            </div>
          )}

          {/* What would make it an A */}
          {analysis.toBeA.length > 0 && match?.match_tier !== "A" && (
            <div className="rounded-lg px-3 py-2.5 space-y-1 bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold mb-1">
                → What Would Make This a Tier A ({analysis.pointsToA} more points needed)
              </p>
              {analysis.toBeA.map((t, i) => (
                <p key={i} className="text-sm text-amber-300">• {t}</p>
              ))}
            </div>
          )}

          {match?.match_tier === "A" && (
            <div className="rounded-lg px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm text-center font-semibold">
              🏆 This is already a Tier A match
            </div>
          )}
        </div>
      ) : null}
    </DarkCard>
  );
}