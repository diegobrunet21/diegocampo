import React, { useState, useRef, useEffect } from "react";
import { Filter, Save, Trash2, ChevronDown, X, Check, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Multi-select chip dropdown
export function MultiSelect({ label, options, value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (v) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const clear = (e) => { e.stopPropagation(); onChange([]); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--dm-surface)] border border-[var(--dm-border)] text-sm text-[var(--dm-text)] hover:border-[var(--dm-border-light)] transition-colors min-w-[140px] max-w-[200px]"
      >
        <span className="flex-1 text-left truncate">
          {value.length === 0 ? label : value.length === 1 ? (options.find(o => o.value === value[0])?.label || value[0]) : `${value.length} selected`}
        </span>
        {value.length > 0 && (
          <span onClick={clear} className="text-[var(--dm-text-dim)] hover:text-red-400 flex-shrink-0">
            <X className="w-3 h-3" />
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--dm-text-dim)] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-[var(--dm-surface-2)] border border-[var(--dm-border-light)] rounded-lg shadow-xl min-w-[180px] overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--dm-surface-3)] transition-colors"
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${value.includes(opt.value) ? "bg-blue-500 border-blue-500" : "border-[var(--dm-border-light)]"}`}>
                {value.includes(opt.value) && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
              <span className="text-[var(--dm-text)]">{opt.label}</span>
            </button>
          ))}
          {options.length === 0 && <div className="px-3 py-2 text-xs text-[var(--dm-text-dim)]">No options</div>}
        </div>
      )}
    </div>
  );
}

// Price range filter
export function PriceRangeFilter({ label, minValue, maxValue, onMinChange, onMaxChange }) {
  const fmt = (v) => v ? `$${Number(v).toLocaleString()}` : "";
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-[var(--dm-text-dim)] whitespace-nowrap">{label}:</span>
      <Input
        type="number"
        placeholder="Min"
        value={minValue}
        onChange={e => onMinChange(e.target.value)}
        className="w-24 h-9 text-xs bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]"
      />
      <span className="text-[var(--dm-text-dim)] text-xs">–</span>
      <Input
        type="number"
        placeholder="Max"
        value={maxValue}
        onChange={e => onMaxChange(e.target.value)}
        className="w-24 h-9 text-xs bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]"
      />
    </div>
  );
}

// Date range filter
export function DateRangeFilter({ label, fromValue, toValue, onFromChange, onToChange }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-[var(--dm-text-dim)] whitespace-nowrap">{label}:</span>
      <input
        type="date"
        value={fromValue}
        onChange={e => onFromChange(e.target.value)}
        className="px-2 py-1.5 rounded-lg text-xs bg-[var(--dm-surface)] border border-[var(--dm-border)] text-[var(--dm-text)]"
      />
      <span className="text-[var(--dm-text-dim)] text-xs">–</span>
      <input
        type="date"
        value={toValue}
        onChange={e => onToChange(e.target.value)}
        className="px-2 py-1.5 rounded-lg text-xs bg-[var(--dm-surface)] border border-[var(--dm-border)] text-[var(--dm-text)]"
      />
    </div>
  );
}

// Location keyword filter (proximity search by text match)
export function LocationFilter({ value, onChange }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) { onChange([...value, v]); }
    setInput("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--dm-text-dim)] whitespace-nowrap">Location:</span>
        <Input
          placeholder="City or market"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          className="w-36 h-9 text-xs bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]"
        />
        <button onClick={add} className="px-2 py-1.5 rounded-lg bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-xs text-[var(--dm-text-muted)] hover:text-[var(--dm-text)] transition-colors">+</button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((loc, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {loc}
              <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Saved filter sets manager
const STORAGE_KEY_PREFIX = "dm_saved_filters_";

export function useSavedFilters(namespace) {
  const key = STORAGE_KEY_PREFIX + namespace;

  const load = () => {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  };

  const [saved, setSaved] = useState(load);

  const save = (name, filters) => {
    const updated = [...saved.filter(s => s.name !== name), { name, filters, savedAt: new Date().toISOString() }];
    setSaved(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const remove = (name) => {
    const updated = saved.filter(s => s.name !== name);
    setSaved(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  return { saved, save, remove };
}

// Saved filter sets UI
export function SavedFilterSets({ saved, onApply, onDelete, currentFilters, onSave }) {
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowSave(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSave(saveName.trim(), currentFilters);
    setSaveName("");
    setShowSave(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {saved.map(s => (
        <div key={s.name} className="flex items-center gap-1">
          <button
            onClick={() => onApply(s.filters)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-[var(--dm-surface-2)] border border-[var(--dm-border)] text-[var(--dm-text-muted)] hover:text-[var(--dm-text)] hover:border-[var(--dm-border-light)] transition-colors"
          >
            <BookmarkCheck className="w-3 h-3 text-blue-400" />
            {s.name}
          </button>
          <button onClick={() => onDelete(s.name)} className="p-1 rounded text-[var(--dm-text-dim)] hover:text-red-400 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      <div ref={ref} className="relative">
        <button
          onClick={() => setShowSave(!showSave)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-[var(--dm-surface)] border border-dashed border-[var(--dm-border)] text-[var(--dm-text-dim)] hover:text-[var(--dm-text)] hover:border-[var(--dm-border-light)] transition-colors"
        >
          <Save className="w-3 h-3" /> Save filter set
        </button>
        {showSave && (
          <div className="absolute z-50 top-full mt-1 left-0 bg-[var(--dm-surface-2)] border border-[var(--dm-border-light)] rounded-lg shadow-xl p-3 flex items-center gap-2 min-w-[220px]">
            <Input
              autoFocus
              placeholder="Filter set name"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              className="h-8 text-xs bg-[var(--dm-surface)] border-[var(--dm-border)] text-[var(--dm-text)]"
            />
            <button onClick={handleSave} className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap transition-colors">Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Filter badge count indicator
export function FilterBadge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">{count}</span>
  );
}