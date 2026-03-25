import React from "react";

const tiers = {
  A: {
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    text: "#34d399",
    glow: "0 0 12px rgba(16,185,129,0.3)",
    label: "Tier A",
  },
  B: {
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
    text: "#60a5fa",
    glow: "0 0 12px rgba(59,130,246,0.3)",
    label: "Tier B",
  },
  C: {
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.25)",
    text: "#fbbf24",
    glow: "none",
    label: "Tier C",
  },
};

export default function TierBadge({ tier, size = "sm" }) {
  const t = tiers[tier] || tiers.C;
  const isLg = size === "lg";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg ${isLg ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.text,
        boxShadow: t.glow,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: isLg ? 8 : 6,
          height: isLg ? 8 : 6,
          background: t.text,
          boxShadow: `0 0 6px ${t.text}`,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {t.label}
    </span>
  );
}