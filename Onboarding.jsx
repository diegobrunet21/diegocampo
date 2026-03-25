import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Zap, Building2, Users, Key, Briefcase, DollarSign, ArrowRight, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Onboarding() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("role"); // role | create | join | done
  const [selectedRole, setSelectedRole] = useState(null);
  const [mode, setMode] = useState(null); // create | join
  const [brokerageName, setBrokerageName] = useState("");
  const [inviteKey, setInviteKey] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function init() {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin();
        return;
      }
      const me = await base44.auth.me();
      setUser(me);
      if (me.brokerage_id && me.app_role) {
        window.location.replace(createPageUrl("Dashboard"));
        return;
      }
    }
    init();
  }, []);

  const generateKey = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let key = "";
    for (let i = 0; i < 12; i++) key += chars[Math.floor(Math.random() * chars.length)];
    return key;
  };

  const handleCreateBrokerage = async () => {
    if (!brokerageName.trim()) { setError("Enter a brokerage name"); return; }
    setLoading(true);
    setError("");
    const key = generateKey();
    const slug = brokerageName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const brokerage = await base44.entities.Brokerage.create({
      name: brokerageName.trim(),
      slug,
      invite_key: key,
    });
    // Update user directly without backend function to avoid connectivity issues
    await base44.auth.updateMe({ app_role: "broker", brokerage_id: brokerage.id });
    setCreatedKey(key);
    setLoading(false);
    setStep("done");
  };

  const handleJoinBrokerage = async () => {
    if (!inviteKey.trim()) { setError("Enter an invite key"); return; }
    // Safety: broker role is only granted via brokerage creation, not join
    const safeRole = selectedRole === "broker" ? "agent" : selectedRole;
    setLoading(true);
    setError("");
    const brokerages = await base44.entities.Brokerage.filter({ invite_key: inviteKey.trim() });
    if (brokerages.length === 0) {
      setError("Invalid invite key. Please check and try again.");
      setLoading(false);
      return;
    }
    await base44.auth.updateMe({ app_role: safeRole, brokerage_id: brokerages[0].id });
    setLoading(false);
    window.location.href = createPageUrl("Dashboard");
  };

  const copyKey = () => {
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roles = [
    { id: "broker", label: "Broker", desc: "Manage your brokerage, agents, and all deals", icon: Building2, color: "from-blue-500 to-blue-600" },
    { id: "agent", label: "Agent", desc: "Manage your buyers, listings, and matches", icon: Briefcase, color: "from-emerald-500 to-emerald-600" },
    { id: "loan_officer", label: "Loan Officer", desc: "Manage financing pipeline and pre-qualifications", icon: DollarSign, color: "from-amber-500 to-amber-600" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0f1e" }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set Up Your Account</h1>
          <p className="text-blue-200 text-sm mt-1">
            {user?.full_name ? `Welcome, ${user.full_name}!` : "Let's get you started"}
          </p>
        </div>

        <div className="rounded-xl border p-6" style={{ background: "#0d1526", borderColor: "#1e3050" }}>
          {step === "role" && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Select Your Role</h3>
              <p className="text-sm text-blue-200 mb-5">Choose how you'll use DealMapper</p>
              <div className="space-y-3">
                {roles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      selectedRole === r.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-[#1e3050] hover:border-[#2a4570] hover:bg-[#111d35]"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center`}>
                      <r.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{r.label}</p>
                      <p className="text-xs text-blue-200">{r.desc}</p>
                    </div>
                    {selectedRole === r.id && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {selectedRole && (
                <div className="mt-6 space-y-3">
                  {selectedRole === "broker" && (
                    <Button onClick={() => { setMode("create"); setStep("create"); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5">
                      <Building2 className="w-4 h-4 mr-2" /> Create New Brokerage
                    </Button>
                  )}
                  <button
                    onClick={() => { setMode("join"); setStep("join"); }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white border border-[#2a4570] hover:bg-[#111d35] transition-colors"
                    style={{ background: selectedRole === "broker" ? "transparent" : "#2563eb" }}
                  >
                    <Key className="w-4 h-4" /> Join Existing Brokerage
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "create" && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Create Your Brokerage</h3>
              <p className="text-sm text-blue-200 mb-5">Set up a new brokerage and invite your team</p>
              <Input
                placeholder="Brokerage Name"
                value={brokerageName}
                onChange={e => setBrokerageName(e.target.value)}
                className="mb-4 border-[#1e3050] text-white placeholder:text-blue-300/50 py-5"
                style={{ background: "#0a0f1e" }}
              />
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <Button onClick={handleCreateBrokerage} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Create Brokerage
              </Button>
              <button onClick={() => { setStep("role"); setError(""); }} className="w-full text-center text-sm text-blue-300 mt-3 hover:text-white">
                ← Back
              </button>
            </div>
          )}

          {step === "join" && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Join a Brokerage</h3>
              <p className="text-sm text-blue-200 mb-5">Enter the invite key shared by your broker</p>
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Key className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-300">Ask your broker for the invite key</p>
              </div>
              <Input
                placeholder="Brokerage Invite Key"
                value={inviteKey}
                onChange={e => setInviteKey(e.target.value)}
                className="mb-4 border-[#1e3050] text-white placeholder:text-blue-300/50 py-5 font-mono"
                style={{ background: "#0a0f1e" }}
              />
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <Button onClick={handleJoinBrokerage} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Join Brokerage
              </Button>
              <button onClick={() => { setStep("role"); setError(""); }} className="w-full text-center text-sm text-blue-300 mt-3 hover:text-white">
                ← Back
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Brokerage Created!</h3>
              <p className="text-sm text-blue-200 mb-5">Share this invite key with your team:</p>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-[#1e3050]" style={{ background: "#0a0f1e" }}>
                <code className="flex-1 text-lg font-mono text-blue-400 text-center">{createdKey}</code>
                <button onClick={copyKey} className="p-2 rounded-md hover:bg-[#111d35]">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-300" />}
                </button>
              </div>
              <p className="text-xs text-blue-300/70 mt-3">Save this key — agents and loan officers need it to join.</p>
              <Button onClick={() => window.location.href = createPageUrl("Dashboard")} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 mt-6">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}