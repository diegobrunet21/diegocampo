import React from "react";
import { Users } from "lucide-react";

export default function CrossAgentBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
      <Users className="w-3 h-3" />
      Cross-Agent
    </span>
  );
}