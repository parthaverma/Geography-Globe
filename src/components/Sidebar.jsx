import { AnimatePresence, motion } from "framer-motion";

function formatNumber(n) {
  if (typeof n !== "number") return "N/A";
  return new Intl.NumberFormat().format(n);
}

function formatList(v) {
  if (!v) return "N/A";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || "N/A";
  if (typeof v === "object") return Object.values(v).filter(Boolean).join(", ") || "N/A";
  return String(v);
}

export default function Sidebar({ country, open, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close country sidebar"
            className="pointer-events-auto absolute inset-0 z-30 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose?.()}
          />

          <motion.aside
            className="pointer-events-auto absolute right-0 top-0 z-40 h-full w-[min(92vw,440px)] border-l border-white/10 bg-black/55 backdrop-blur-xl"
            initial={{ x: 460, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 460, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                    Selected country
                  </div>
                  <div className="mt-1 truncate text-2xl font-semibold text-white">
                    {country?.name || "N/A"}
                  </div>
                  <div className="mt-1 truncate text-sm text-white/55">
                    {country?.officialName || ""}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-auto p-5">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  {country?.flag ? (
                    <img
                      src={country.flag}
                      alt=""
                      className="h-12 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-16 rounded-lg bg-white/10" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm text-white/60">Region</div>
                    <div className="truncate text-base font-medium text-white">
                      {country?.region || "N/A"}
                    </div>
                    <div className="truncate text-xs text-white/50">
                      {country?.subregion || ""}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wider text-white/45">
                      Capital
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {formatList(country?.capital)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wider text-white/45">
                      Currency
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {formatList(country?.currency)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wider text-white/45">
                      Population
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {formatNumber(country?.population)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wider text-white/45">
                      Languages
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {formatList(country?.languages)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
