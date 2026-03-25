import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Central hook for brokerage-scoped data access
export function useBrokerage() {
  const [user, setUser] = useState(null);
  const [brokerage, setBrokerage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { if (!cancelled) setLoading(false); return; }
      const me = await base44.auth.me();
      if (cancelled) return;
      setUser(me);
      if (me.brokerage_id) {
        try {
          const b = await base44.entities.Brokerage.get(me.brokerage_id);
          if (!cancelled && b) setBrokerage(b);
        } catch (e) {}
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [window.location.pathname]);

  // Filter helper: always include brokerage_id
  const brokerageFilter = (additionalFilters = {}) => {
    if (!user?.brokerage_id) return null;
    return { brokerage_id: user.brokerage_id, ...additionalFilters };
  };

  // Agent scope: adds agent_id filter for agent role
  const agentScopedFilter = (additionalFilters = {}) => {
    if (!user?.brokerage_id) return null;
    const base = { brokerage_id: user.brokerage_id, ...additionalFilters };
    if (user.app_role === "agent") {
      base.agent_id = user.id;
    }
    return base;
  };

  const isBroker = user?.app_role === "broker";
  const isAgent = user?.app_role === "agent";
  const isLoanOfficer = user?.app_role === "loan_officer";

  return {
    user,
    brokerage,
    loading,
    brokerageFilter,
    agentScopedFilter,
    isBroker,
    isAgent,
    isLoanOfficer,
  };
}