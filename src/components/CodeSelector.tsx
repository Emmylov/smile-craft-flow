import React, { useState, useEffect, useRef } from "react";

type CodeItem = {
  system: string;
  code: string;
  display: string;
};

type Props = {
  system?: "ICD-10" | "SNOMED-CT";
  onSelect: (item: CodeItem) => void;
  multiple?: boolean;
  placeholder?: string;
  initial?: CodeItem | CodeItem[];
};

export default function CodeSelector({ system = "SNOMED-CT", onSelect, multiple = false, placeholder = "Search codes...", initial }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CodeItem[]>([]);
  const [selected, setSelected] = useState<CodeItem[]>(() => Array.isArray(initial) ? initial : initial ? [initial] : []);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 1) {
      setResults([]);
      return;
    }
    controllerRef.current?.abort();
    const ctl = new AbortController();
    controllerRef.current = ctl;
    const t = setTimeout(async () => {
      try {
        const q = encodeURIComponent(query.trim());
        const res = await fetch(`/api/terminology/search?system=${encodeURIComponent(system)}&q=${q}&limit=25`, { signal: ctl.signal });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data ?? []);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        console.error(e);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query, system]);

  const handlePick = (item: CodeItem) => {
    if (multiple) {
      if (!selected.find((s) => s.system === item.system && s.code === item.code)) {
        const next = [...selected, item];
        setSelected(next);
        onSelect(item);
      }
    } else {
      setSelected([item]);
      onSelect(item);
    }
    setQuery("");
    setResults([]);
  };

  const handleRemove = (item: CodeItem) => {
    const next = selected.filter((s) => !(s.system === item.system && s.code === item.code));
    setSelected(next);
  };

  return (
    <div className="code-selector">
      <div className="selected-items">
        {selected.map((s) => (
          <span key={`${s.system}:${s.code}`} className="chip">
            <strong>{s.code}</strong> — {s.display} <button type="button" onClick={() => handleRemove(s)}>×</button>
          </span>
        ))}
      </div>
      <input
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search codes"
      />
      {results.length > 0 && (
        <ul className="results">
          {results.map((r: CodeItem) => (
            <li key={`${r.system}:${r.code}`} onClick={() => handlePick(r)}>
              <div className="code">{r.code}</div>
              <div className="display">{r.display}</div>
              <div className="system">{r.system}</div>
            </li>
          ))}
        </ul>
      )}
      <style>{`
        .code-selector { position: relative; }
        .results { position: absolute; left: 0; right: 0; background: white; border: 1px solid #ddd; max-height: 240px; overflow: auto; z-index: 40; padding: 0; margin: 4px 0 0 0; list-style: none; }
        .results li { padding: 8px; border-bottom: 1px solid #f3f3f3; cursor: pointer; display:flex; gap:8px; align-items:center; }
        .results li:hover { background: #f9f9f9 }
        .chip { display:inline-flex; align-items:center; gap:8px; padding:6px 8px; background:#f3f4f6; border-radius:999px; margin-right:6px }
        .chip button { background:none; border:0; cursor:pointer }
        .code { font-weight:600; width:80px }
        .system { margin-left:auto; color:#666; font-size:12px }
      `}</style>
    </div>
  );
}
