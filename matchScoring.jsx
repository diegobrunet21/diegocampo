/**
 * SCORING MODEL — 100 points total
 *
 * Core Deal Criteria (60 pts)
 *   Price Fit        30 pts  — exact in range = 30, within 10% = 18, within 20% = 8
 *   Asset Class      30 pts  — exact match = 30, none = 0
 *
 * Location (20 pts)
 *   Exact city/metro match  20 pts
 *   State/region match      10 pts
 *   Zip resolved to metro    20 pts (if zip resolves to buyer's target city/metro)
 *
 * Financial Fit (10 pts)
 *   Cap rate meets min  6 pts
 *   Units within range  4 pts
 *
 * Deal Momentum (10 pts)
 *   Buyer motivation high   3 pts
 *   Seller motivation high  3 pts
 *   Timeline ≤ 3 months     2 pts
 *   Pre-approved / cash     2 pts
 *
 * Tier thresholds:
 *   A = 75+
 *   B = 45+
 *   C = 20+
 */

// ─── Zip code → location cache (in-memory per session) ────────────────────
const zipCache = {};

/**
 * Resolve a zip code to city, state, metro using the LLM with internet context.
 * Returns { city, state, metro, county } or null.
 */
async function resolveZip(zip, base44SDK) {
  if (!zip || !/^\d{5}$/.test(zip.trim())) return null;
  const key = zip.trim();
  if (zipCache[key]) return zipCache[key];

  try {
    const result = await base44SDK.integrations.Core.InvokeLLM({
      prompt: `What city, county, state, and metro area is zip code ${key} in? Reply only with a JSON object like: {"city":"Doral","county":"Miami-Dade","state":"FL","state_full":"Florida","metro":"Miami"}`,
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
    if (result?.city) {
      zipCache[key] = result;
      return result;
    }
  } catch (e) {
    // ignore - fall through to basic scoring
  }
  return null;
}

/**
 * Check if a listing location (possibly just a zip) matches buyer target locations.
 * Returns { points, reasons } where points ∈ {0, 10, 20}
 */
async function scoreLocation(buyer, listing, base44SDK) {
  const targetLocs = (buyer.target_locations || []).map(l => l.toLowerCase().trim());
  if (targetLocs.length === 0) return { points: 0, reasons: [], misses: [] };

  // Gather all listing location tokens
  const listingCity = (listing.city || "").toLowerCase().trim();
  const listingState = (listing.state || "").toLowerCase().trim();
  const listingZip = (listing.zip || "").trim();

  // Attempt zip resolution
  let resolved = null;
  if (listingZip && base44SDK) {
    resolved = await resolveZip(listingZip, base44SDK);
  }

  const listingTokens = [
    listingCity,
    listingState,
    resolved?.city?.toLowerCase(),
    resolved?.county?.toLowerCase(),
    resolved?.state?.toLowerCase(),
    resolved?.state_full?.toLowerCase(),
    resolved?.metro?.toLowerCase(),
  ].filter(Boolean);

  // Check each target location against listing tokens
  for (const target of targetLocs) {
    // Exact or contained match
    const cityMatch = listingTokens.some(t => t.includes(target) || target.includes(t));
    if (cityMatch) {
      const displayLoc = resolved
        ? `${resolved.city}, ${resolved.state} (${resolved.metro} metro)`
        : listingCity || listingState;
      return {
        points: 20,
        reasons: [`Location match — ${displayLoc}`],
        misses: [],
      };
    }

    // State-level match
    const stateMatch = listingState && (target.includes(listingState) || listingState.includes(target));
    const resolvedStateMatch = resolved && (
      target.includes(resolved.state.toLowerCase()) ||
      target.includes(resolved.state_full?.toLowerCase())
    );
    if (stateMatch || resolvedStateMatch) {
      const stateLabel = resolved?.state_full || resolved?.state || listingState.toUpperCase();
      return {
        points: 10,
        reasons: [`Location match — ${stateLabel} (state-level)`],
        misses: [`Buyer targets ${target} but listing is in ${resolved?.city || listingCity} — same state, not same city`],
      };
    }
  }

  const buyerTargetDisplay = targetLocs.join(", ");
  const listingDisplay = resolved
    ? `${resolved.city}, ${resolved.state} (zip ${listingZip})`
    : [listingCity, listingState].filter(Boolean).join(", ") || "unknown location";

  return {
    points: 0,
    reasons: [],
    misses: [`Location mismatch — listing is in ${listingDisplay}, buyer targets ${buyerTargetDisplay}`],
  };
}

/**
 * Core scoring function. Accepts optional base44SDK for zip resolution.
 * When base44SDK is provided, zip codes are resolved to real cities/metros.
 */
export async function scoreMatchAsync(buyer, listing, base44SDK) {
  let score = 0;
  const strengths = [];   // why it IS a match
  const gaps = [];        // why it's not an A
  const toBeA = [];       // what would make it an A

  // ── Price Fit (0–30 pts) ──────────────────────────────────────────
  let pricePts = 0;
  if (listing.asking_price && (buyer.price_min != null || buyer.price_max != null)) {
    const min = buyer.price_min ?? 0;
    const max = buyer.price_max ?? Infinity;
    const price = listing.asking_price;
    const fmtPrice = (v) => v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${(v/1000).toFixed(0)}K`;

    if (price >= min && price <= max) {
      pricePts = 30;
      strengths.push(`Price ${fmtPrice(price)} fits buyer budget (${fmtPrice(min)}–${fmtPrice(max)})`);
    } else if (price <= max * 1.10 && price >= min * 0.90) {
      pricePts = 18;
      strengths.push(`Price ${fmtPrice(price)} is close to buyer range (${fmtPrice(min)}–${fmtPrice(max)}, within 10%)`);
      gaps.push(`Price ${fmtPrice(price)} is outside buyer's stated range by ~10%`);
      toBeA.push(`Listing price closer to ${fmtPrice(min)}–${fmtPrice(max)} (or buyer expands budget)`);
    } else if (price <= max * 1.20 && price >= min * 0.80) {
      pricePts = 8;
      strengths.push(`Price ${fmtPrice(price)} is near buyer range (within 20%)`);
      gaps.push(`Price ${fmtPrice(price)} is ${price > max ? "above" : "below"} buyer's range by ~20%`);
      toBeA.push(`Price needs to be within buyer's budget of ${fmtPrice(min)}–${fmtPrice(max)}`);
    } else {
      gaps.push(`Price ${fmtPrice(price)} is well outside buyer budget (${fmtPrice(min)}–${fmtPrice(max)})`);
      toBeA.push(`Significant price gap — listing at ${fmtPrice(price)} vs buyer max ${fmtPrice(max)}`);
    }
  } else if (!listing.asking_price) {
    gaps.push("Listing has no asking price — unable to score price fit");
    toBeA.push("Add an asking price to the listing");
  } else {
    gaps.push("Buyer has no price range set — unable to confirm price fit");
  }
  score += pricePts;

  // ── Asset Class (0–30 pts) ────────────────────────────────────────
  let assetPts = 0;
  if (buyer.target_asset_classes?.length > 0 && listing.asset_class) {
    const listingClass = listing.asset_class.toLowerCase().replace(/[-\s]/g, "_");
    const normalized = buyer.target_asset_classes.map(a => a.toLowerCase().replace(/[-\s]/g, "_"));

    if (normalized.includes(listingClass)) {
      assetPts = 30;
      const label = listing.asset_class.replace(/_/g, " ");
      strengths.push(`Asset class match — ${label}`);
    } else {
      const buyerClasses = buyer.target_asset_classes.join(", ");
      gaps.push(`Asset class mismatch — listing is ${listing.asset_class.replace(/_/g, " ")}, buyer targets ${buyerClasses}`);
      toBeA.push(`Buyer would need to target ${listing.asset_class.replace(/_/g, " ")} (currently targets: ${buyerClasses})`);
    }
  } else if (!buyer.target_asset_classes?.length) {
    gaps.push("Buyer has no target asset classes — unable to confirm asset class fit");
    toBeA.push("Buyer profile needs target asset classes added");
  }
  score += assetPts;

  // ── Location (0–20 pts) ───────────────────────────────────────────
  const locResult = await scoreLocation(buyer, listing, base44SDK);
  score += locResult.points;
  strengths.push(...locResult.reasons);
  gaps.push(...locResult.misses);
  if (locResult.points < 20 && locResult.misses.length > 0) {
    toBeA.push(`Buyer would need to include ${[listing.city, listing.state].filter(Boolean).join(", ")} in their target locations`);
  }

  // ── Financial Fit (0–10 pts) ──────────────────────────────────────
  let finPts = 0;
  if (buyer.min_cap_rate && listing.cap_rate) {
    if (listing.cap_rate >= buyer.min_cap_rate) {
      finPts += 6;
      strengths.push(`Cap rate ${listing.cap_rate}% meets buyer minimum ${buyer.min_cap_rate}%`);
    } else if (listing.cap_rate >= buyer.min_cap_rate - 0.5) {
      finPts += 2;
      strengths.push(`Cap rate ${listing.cap_rate}% slightly below buyer minimum ${buyer.min_cap_rate}%`);
      gaps.push(`Cap rate ${listing.cap_rate}% is just under buyer's ${buyer.min_cap_rate}% minimum`);
      toBeA.push(`Cap rate needs to reach ${buyer.min_cap_rate}% (currently ${listing.cap_rate}%)`);
    } else {
      gaps.push(`Cap rate ${listing.cap_rate}% is below buyer's minimum ${buyer.min_cap_rate}%`);
      toBeA.push(`Listing cap rate of ${listing.cap_rate}% needs to improve to ${buyer.min_cap_rate}%+ or buyer lowers minimum`);
    }
  } else if (buyer.min_cap_rate && !listing.cap_rate) {
    gaps.push(`Buyer requires ${buyer.min_cap_rate}% cap rate — listing has no cap rate listed`);
    toBeA.push("Add cap rate to listing");
  }

  if (buyer.min_units && listing.units) {
    if (listing.units >= buyer.min_units) {
      finPts += 4;
      strengths.push(`${listing.units} units meets buyer minimum (${buyer.min_units})`);
    } else {
      gaps.push(`${listing.units} units is below buyer's minimum of ${buyer.min_units} units`);
      toBeA.push(`Listing has ${listing.units} units vs buyer minimum ${buyer.min_units}`);
    }
  }
  score += finPts;

  // ── Deal Momentum (0–10 pts, bonus only — no penalties) ──────────
  let momentumPts = 0;
  if (buyer.motivation_level === "high") { momentumPts += 3; strengths.push("Highly motivated buyer"); }
  else if (buyer.motivation_level === "medium") { momentumPts += 1; strengths.push("Buyer has moderate motivation"); }

  if (listing.seller_motivation === "high") { momentumPts += 3; strengths.push("Highly motivated seller"); }
  else if (listing.seller_motivation === "medium") { momentumPts += 1; strengths.push("Seller has moderate motivation"); }

  if (buyer.timeline === "immediate" || buyer.timeline === "1_3_months") {
    momentumPts += 2;
    strengths.push(`Near-term buyer timeline (${buyer.timeline.replace(/_/g, " ")})`);
  }

  if (buyer.pre_approved || buyer.financing_type === "cash") {
    momentumPts += 2;
    strengths.push(buyer.financing_type === "cash" ? "Cash buyer" : "Pre-approved financing");
  }
  score += momentumPts;

  const finalScore = Math.min(Math.round(score), 100);
  let tier = "C";
  if (finalScore >= 75) tier = "A";
  else if (finalScore >= 45) tier = "B";

  // Build human-readable summary
  const reasonParts = [];
  if (strengths.length) reasonParts.push(`✓ ${strengths.join("; ")}`);
  if (gaps.length) reasonParts.push(`✗ ${gaps.join("; ")}`);
  if (toBeA.length && tier !== "A") reasonParts.push(`→ To reach Tier A: ${toBeA.join("; ")}`);

  return {
    match_score: finalScore,
    match_tier: tier,
    match_reasons: reasonParts.join(" | ") || "Basic criteria met",
  };
}

/**
 * Sync fallback (no zip resolution, no LLM) — used when base44SDK not available.
 */
export function scoreMatch(buyer, listing) {
  let score = 0;
  const strengths = [];
  const gaps = [];
  const toBeA = [];

  // Price
  if (listing.asking_price && (buyer.price_min != null || buyer.price_max != null)) {
    const min = buyer.price_min ?? 0;
    const max = buyer.price_max ?? Infinity;
    const price = listing.asking_price;
    const fmt = (v) => v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : `$${(v/1000).toFixed(0)}K`;
    if (price >= min && price <= max) { score += 30; strengths.push(`Price ${fmt(price)} fits range`); }
    else if (price <= max * 1.10 && price >= min * 0.90) { score += 18; gaps.push(`Price ${fmt(price)} is ~10% outside range`); toBeA.push(`Price closer to ${fmt(min)}–${fmt(max)}`); }
    else if (price <= max * 1.20 && price >= min * 0.80) { score += 8; gaps.push(`Price ${fmt(price)} is ~20% outside range`); toBeA.push(`Price within buyer budget of ${fmt(min)}–${fmt(max)}`); }
    else { gaps.push(`Price ${fmt(price)} well outside budget`); toBeA.push(`Listing price needs to be near ${fmt(min)}–${fmt(max)}`); }
  }

  // Asset class
  if (buyer.target_asset_classes?.length > 0 && listing.asset_class) {
    const normalized = buyer.target_asset_classes.map(a => a.toLowerCase().replace(/[-\s]/g, "_"));
    if (normalized.includes(listing.asset_class.toLowerCase())) {
      score += 30; strengths.push(`Asset class match — ${listing.asset_class.replace(/_/g, " ")}`);
    } else {
      gaps.push(`Asset class mismatch — listing: ${listing.asset_class.replace(/_/g, " ")}, buyer wants: ${buyer.target_asset_classes.join(", ")}`);
      toBeA.push(`Buyer needs to target ${listing.asset_class.replace(/_/g, " ")}`);
    }
  }

  // Location (basic, no zip resolution)
  if (buyer.target_locations?.length > 0 && (listing.city || listing.state)) {
    const locs = buyer.target_locations.map(l => l.toLowerCase().trim());
    const city = (listing.city || "").toLowerCase();
    const state = (listing.state || "").toLowerCase();
    const cityMatch = locs.some(l => city && (city.includes(l) || l.includes(city)));
    const stateMatch = locs.some(l => state && (l.includes(state) || state.includes(l)));
    if (cityMatch) { score += 20; strengths.push(`Location match — ${listing.city}`); }
    else if (stateMatch) {
      score += 10;
      strengths.push(`Location match — ${listing.state} (state)`);
      gaps.push(`City not in buyer's targets — only state matches`);
      toBeA.push(`Buyer should target ${listing.city || listing.state}`);
    } else {
      gaps.push(`Location mismatch — listing in ${[listing.city, listing.state].filter(Boolean).join(", ")}, buyer targets ${buyer.target_locations.join(", ")}`);
      toBeA.push(`Buyer would need to target ${[listing.city, listing.state].filter(Boolean).join(", ")}`);
    }
  }

  // Financial
  if (buyer.min_cap_rate && listing.cap_rate) {
    if (listing.cap_rate >= buyer.min_cap_rate) { score += 6; strengths.push(`Cap rate ${listing.cap_rate}% ≥ min ${buyer.min_cap_rate}%`); }
    else if (listing.cap_rate >= buyer.min_cap_rate - 0.5) { score += 2; gaps.push(`Cap rate ${listing.cap_rate}% just below ${buyer.min_cap_rate}%`); toBeA.push(`Cap rate needs to reach ${buyer.min_cap_rate}%`); }
    else { gaps.push(`Cap rate ${listing.cap_rate}% below buyer min ${buyer.min_cap_rate}%`); toBeA.push(`Cap rate needs to improve to ${buyer.min_cap_rate}%+`); }
  }
  if (buyer.min_units && listing.units) {
    if (listing.units >= buyer.min_units) { score += 4; strengths.push(`${listing.units} units ≥ min ${buyer.min_units}`); }
    else { gaps.push(`${listing.units} units < buyer minimum ${buyer.min_units}`); toBeA.push(`Unit count needs to reach ${buyer.min_units}+`); }
  }

  // Momentum (bonus only — no penalties)
  if (buyer.motivation_level === "high") { score += 3; strengths.push("High buyer motivation"); }
  else if (buyer.motivation_level === "medium") { score += 1; strengths.push("Moderate buyer motivation"); }
  if (listing.seller_motivation === "high") { score += 3; strengths.push("High seller motivation"); }
  else if (listing.seller_motivation === "medium") { score += 1; strengths.push("Moderate seller motivation"); }
  if (buyer.timeline === "immediate" || buyer.timeline === "1_3_months") { score += 2; strengths.push("Near-term timeline"); }
  if (buyer.pre_approved || buyer.financing_type === "cash") { score += 2; strengths.push(buyer.financing_type === "cash" ? "Cash buyer" : "Pre-approved"); }

  const finalScore = Math.min(Math.round(score), 100);
  let tier = "C";
  if (finalScore >= 75) tier = "A";
  else if (finalScore >= 45) tier = "B";

  const reasonParts = [];
  if (strengths.length) reasonParts.push(`✓ ${strengths.join("; ")}`);
  if (gaps.length) reasonParts.push(`✗ ${gaps.join("; ")}`);
  if (toBeA.length && tier !== "A") reasonParts.push(`→ To reach Tier A: ${toBeA.join("; ")}`);

  return {
    match_score: finalScore,
    match_tier: tier,
    match_reasons: reasonParts.join(" | ") || "Basic criteria met",
  };
}

/**
 * Generate matches for a brokerage using async scoring with zip resolution.
 */
export async function generateMatchesForBrokerage(base44SDK, brokerageId) {
  const [buyers, listings, existingMatches] = await Promise.all([
    base44SDK.entities.Buyer.filter({ brokerage_id: brokerageId, status: "active" }),
    base44SDK.entities.Listing.filter({ brokerage_id: brokerageId, status: "active" }),
    base44SDK.entities.Match.filter({ brokerage_id: brokerageId }),
  ]);

  const existingPairs = new Set(existingMatches.map(m => `${m.buyer_id}_${m.listing_id}`));
  const newMatches = [];

  for (const buyer of buyers) {
    for (const listing of listings) {
      const pairKey = `${buyer.id}_${listing.id}`;
      if (existingPairs.has(pairKey)) continue;

      const { match_score, match_tier, match_reasons } = await scoreMatchAsync(buyer, listing, base44SDK);
      if (match_score >= 1) {
        const isAlert = match_score >= 80;
        newMatches.push({
          brokerage_id: brokerageId,
          buyer_id: buyer.id,
          listing_id: listing.id,
          buyer_name: buyer.name,
          listing_name: listing.property_name,
          buyer_agent_id: buyer.agent_id,
          listing_agent_id: listing.agent_id,
          match_score,
          match_tier,
          match_reasons,
          is_cross_agent: buyer.agent_id !== listing.agent_id,
          status: "new",
          ...(isAlert ? { alert_created_date: new Date().toISOString(), alert_read_by_user_ids: [] } : {}),
        });
      }
    }
  }

  if (newMatches.length > 0) {
    await base44SDK.entities.Match.bulkCreate(newMatches);
  }
  return newMatches.length;
}