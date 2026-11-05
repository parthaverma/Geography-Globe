
import { useEffect, useMemo, useRef, useState } from "react";

export default function SearchBar({ countries, onSelect, selectedCountry, onOpenChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Notify parent when open state changes
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!selectedCountry?.name) return;
    setQuery(selectedCountry.name);
    setOpen(false);
  }, [selectedCountry?.name]);

  const results = useMemo(() => {
  const list = Array.isArray(countries) ? countries : [];
  const q = query.trim().toLowerCase();

  if (!q) return list.slice(0, 10);

  return list
    .filter((c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.officialName || "").toLowerCase().includes(q)
    )
    .slice(0, 12);
  }, [countries, query]);

  const handleSelect = (country) => {
    onSelect?.(country);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute right-4 top-4 z-30 w-[min(92vw,360px)]"
    >
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_18px_rgba(245,65,6,0.75)]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const first = results[0];
                if (first) {
                  e.preventDefault();
                  handleSelect(first);
                }
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search country..."
            className="w-full bg-transparent text-sm text-white placeholder:text-white/45 outline-none"
          />
        </div>

        {open && results.length > 0 ? (
          <div className="max-h-[360px] overflow-auto border-t border-white/10 py-1">
            {results.map((c) => (
              <button
                key={c.cca3 || c.name}
                type="button"
                onClick={() => handleSelect(c)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-white/90 hover:bg-white/5"
              >
                {c.flag ? (
                  <img
                    src={c.flag}
                    alt=""
                    className="h-5 w-7 rounded-sm object-cover"
                  />
                ) : (
                  <div className="h-5 w-7 rounded-sm bg-white/5" />
                )}
                <div className="min-w-0">
                  <div className="truncate">{c.name}</div>
                  <div className="truncate text-xs text-white/45">{c.region}</div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
