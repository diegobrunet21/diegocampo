import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, ChevronDown, Copy, Check, Send, RotateCcw, Building2, Users, GitCompare, Database } from "lucide-react";
import DarkCard from "@/components/ui/DarkCard";

// ─── Platform Data Tools ───────────────────────────────────────────────────
async function loadPlatformContext(user) {
  if (!user?.brokerage_id) return {};
  const f = { brokerage_id: user.brokerage_id };
  const agentFilter = user.app_role === "agent" ? { ...f, agent_id: user.id } : f;
  const [listings, buyers, matches] = await Promise.all([
    base44.entities.Listing.filter(agentFilter, "-updated_date", 50),
    base44.entities.Buyer.filter(agentFilter, "-updated_date", 50),
    base44.entities.Match.filter(f, "-updated_date", 30),
  ]);
  return { listings, buyers, matches };
}

function formatListingSummary(l) {
  return [
    `"${l.property_name}"`,
    l.address ? `at ${[l.address, l.city, l.state].filter(Boolean).join(", ")}` : "",
    l.asset_class ? `(${l.asset_class.replace(/_/g, " ")})` : "",
    l.asking_price ? `asking $${(l.asking_price / 1000000).toFixed(2)}M` : "",
    l.cap_rate ? `${l.cap_rate}% cap` : "",
    l.status ? `[${l.status}]` : "",
  ].filter(Boolean).join(" ");
}

function formatBuyerSummary(b) {
  return [
    `"${b.name}"`,
    b.company ? `(${b.company})` : "",
    b.price_min && b.price_max ? `budget $${(b.price_min / 1000).toFixed(0)}K–$${(b.price_max / 1000000).toFixed(1)}M` : "",
    b.target_asset_classes?.length ? `targets: ${b.target_asset_classes.join(", ")}` : "",
    b.motivation_level ? `motivation: ${b.motivation_level}` : "",
    b.stage ? `[${b.stage}]` : "",
  ].filter(Boolean).join(" ");
}

function buildSystemPrompt(platformData, focusedListing) {
  const base = `You are Ryan, an expert commercial real estate AI assistant embedded inside DealMapper, a CRE brokerage platform. You have access to the broker's live platform data below. When users ask about specific listings, buyers, or matches, use this data to give specific, accurate answers. Be concise, practical, and professional.`;

  let context = "";

  if (focusedListing) {
    const l = focusedListing;
    const details = [
      `Property: ${l.property_name}`,
      l.address ? `Address: ${[l.address, l.city, l.state, l.zip].filter(Boolean).join(", ")}` : "",
      `Asset Class: ${l.asset_class?.replace(/_/g, " ")}`,
      l.asking_price ? `Asking Price: $${l.asking_price.toLocaleString()}` : "",
      l.cap_rate ? `Cap Rate: ${l.cap_rate}%` : "",
      l.noi ? `NOI: $${l.noi.toLocaleString()}` : "",
      l.units ? `Units: ${l.units}` : "",
      l.sqft ? `SqFt: ${l.sqft.toLocaleString()}` : "",
      l.year_built ? `Year Built: ${l.year_built}` : "",
      l.condition ? `Condition: ${l.condition.replace(/_/g, " ")}` : "",
      l.occupancy ? `Occupancy: ${l.occupancy}%` : "",
      l.seller_motivation ? `Seller Motivation: ${l.seller_motivation}` : "",
      l.description ? `Description: ${l.description}` : "",
      l.notes ? `Notes: ${l.notes}` : "",
    ].filter(Boolean).join("\n");
    context = `\n\nCURRENT LISTING CONTEXT:\n${details}`;
  } else if (platformData) {
    const { listings = [], buyers = [], matches = [] } = platformData;
    const listingLines = listings.map(formatListingSummary).join("\n");
    const buyerLines = buyers.map(formatBuyerSummary).join("\n");
    const matchLines = matches.slice(0, 20).map(m => `Match: ${m.buyer_name} ↔ ${m.listing_name} | Score ${m.match_score} Tier ${m.match_tier} [${m.status}]`).join("\n");

    context = [
      listings.length ? `\n\nACTIVE LISTINGS (${listings.length}):\n${listingLines}` : "",
      buyers.length ? `\n\nACTIVE BUYERS (${buyers.length}):\n${buyerLines}` : "",
      matches.length ? `\n\nRECENT MATCHES (${matches.length}):\n${matchLines}` : "",
    ].join("");
  }

  return base + context;
}

// ─── Suggestion sets ───────────────────────────────────────────────────────
const LISTING_SUGGESTIONS = [
  "Write a listing description",
  "Suggest a pricing strategy",
  "Draft a buyer outreach email",
  "Who are my best buyer matches?",
];

const GENERAL_SUGGESTIONS = [
  "Which listings need attention?",
  "Show me my top buyer matches",
  "Which buyers are most motivated?",
  "Draft a cold investor email",
];

// ─── Component ─────────────────────────────────────────────────────────────
export default function ListingAIAssistant({ listing: focusedListing }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [platformData, setPlatformData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [user, setUser] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = focusedListing ? LISTING_SUGGESTIONS : GENERAL_SUGGESTIONS;

  // Load user + platform data when opened
  useEffect(() => {
    if (!open) return;
    async function init() {
      setDataLoading(true);
      const me = await base44.auth.me().catch(() => null);
      setUser(me);
      if (!focusedListing && me) {
        const data = await loadPlatformContext(me);
        setPlatformData(data);
      }
      setDataLoading(false);
    }
    init();
  }, [open]);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0 && !dataLoading) {
      setMessages([{
        role: "assistant",
        text: focusedListing
          ? `Hey! I'm Ryan 👋 I'm loaded up on **${focusedListing.property_name}**. Ask me anything — description, pricing strategy, buyer outreach, or analysis.`
          : `Hey! I'm Ryan 👋 I've pulled your live platform data — listings, buyers, and matches. Ask me about any specific deal, buyer, or let me help you strategize.`
      }]);
    }
  }, [open, dataLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", text: msg }];
    setMessages(newMessages);
    setLoading(true);

    const systemPrompt = buildSystemPrompt(platformData, focusedListing);
    const history = newMessages.map(m => `${m.role === "user" ? "User" : "Ryan"}: ${m.text}`).join("\n");
    const prompt = `${systemPrompt}\n\nConversation:\n${history}\n\nRyan:`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages(prev => [...prev, { role: "assistant", text: result }]);
    setLoading(false);
  };

  const copyToClipboard = async (idx, text) => {
    await navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const reset = () => {
    setMessages([]);
    setTimeout(() => {
      setMessages([{
        role: "assistant",
        text: focusedListing
          ? `Hey! I'm Ryan 👋 I'm loaded up on **${focusedListing.property_name}**. Ask me anything — description, pricing strategy, buyer outreach, or analysis.`
          : `Hey! I'm Ryan 👋 I've pulled your live platform data — listings, buyers, and matches. Ask me about any specific deal, buyer, or let me help you strategize.`
      }]);
    }, 50);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
      >
        <Sparkles className="w-4 h-4" />
        Ryan
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] flex flex-col" style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.7))", height: "540px" }}>
      <DarkCard noPadding className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(99,179,237,0.12)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-white text-sm">Ryan</span>
              <span className="ml-2 text-[10px] text-emerald-400 font-medium">● online</span>
            </div>
          </div>
          {/* Context indicator */}
          {!focusedListing && platformData && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Database className="w-3 h-3 text-blue-400" />
              <span className="text-blue-300">{platformData.listings?.length} listings · {platformData.buyers?.length} buyers</span>
            </div>
          )}
          {focusedListing && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-300">
              <Building2 className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{focusedListing.property_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button onClick={reset} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="New chat">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {dataLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
              Loading your platform data...
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`group relative max-w-[82%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "text-white rounded-bl-sm"
                }`}
                style={msg.role === "assistant" ? { background: "#172440", border: "1px solid rgba(59,130,246,0.2)" } : {}}
              >
                <span className="whitespace-pre-wrap">{msg.text}</span>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => copyToClipboard(idx, msg.text)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-white/10 hover:bg-white/20"
                  >
                    {copied === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-300" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: "#172440", border: "1px solid rgba(59,130,246,0.2)" }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && !loading && !dataLoading && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="text-xs px-2.5 py-1.5 rounded-full text-blue-300 hover:text-white transition-all hover:bg-blue-500/30"
                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 pb-3 shrink-0">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#111d35", border: "1px solid rgba(59,130,246,0.25)" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask about your listings, buyers, deals…"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-500"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </DarkCard>
    </div>
  );
}