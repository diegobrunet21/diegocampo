import React, { useState } from "react";
import { Key, Copy, Check, Eye, EyeOff } from "lucide-react";
import DarkCard from "@/components/ui/DarkCard";

export default function BrokerInviteKey({ brokerage }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!brokerage?.invite_key) return null;

  const key = brokerage.invite_key;

  const copyKey = () => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DarkCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-[var(--dm-text)]">Brokerage Invite Key</h2>
        </div>
        <span className="text-[10px] text-[var(--dm-text-dim)] bg-[var(--dm-surface-3)] px-2 py-0.5 rounded-full">
          Share with agents & loan officers
        </span>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "var(--dm-bg)", border: "1px solid var(--dm-border)" }}>
        <code className="flex-1 text-sm font-mono text-blue-300 tracking-widest">
          {visible ? key : "•".repeat(key.length)}
        </code>
        <button
          onClick={() => setVisible(v => !v)}
          className="p-1.5 rounded-md hover:bg-[var(--dm-surface-2)] text-[var(--dm-text-dim)] hover:text-white transition-colors"
          title={visible ? "Hide key" : "Show key"}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={copyKey}
          className="p-1.5 rounded-md hover:bg-[var(--dm-surface-2)] transition-colors"
          title="Copy key"
        >
          {copied
            ? <Check className="w-4 h-4 text-emerald-400" />
            : <Copy className="w-4 h-4 text-[var(--dm-text-dim)] hover:text-white" />}
        </button>
      </div>
    </DarkCard>
  );
}