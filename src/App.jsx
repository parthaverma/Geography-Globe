import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import GlobeScene from "./components/GlobeScene";
import SearchBar from "./components/SearchBar";
import { getAllCountries, getCountryDetailsByCca3 } from "./services/countryService";

function App() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAllCountries().then((data) => {
      if (!mounted) return;
      setCountries(Array.isArray(data) ? data : []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  const selectedFull = useMemo(() => {
    if (!selectedCountry?.name) return selectedCountry;
    const match = countries.find(
      (c) => String(c?.name || "").toLowerCase() === String(selectedCountry.name).toLowerCase()
    );
    return match || selectedCountry;
  }, [countries, selectedCountry]);

  const handleSelect = (country) => {
    setSelectedCountry(country);
    setSidebarOpen(true);
  };

  const handleReset = () => {
    setSelectedCountry(null);
    setSidebarOpen(false);
  };

  useEffect(() => {
    let mounted = true;
    const cca3 = selectedCountry?.cca3;
    if (!cca3) return undefined;

    getCountryDetailsByCca3(cca3).then((details) => {
      if (!mounted) return;
      if (!details) return;
      setSelectedCountry((prev) => ({ ...(prev || {}), ...details }));
    });

    return () => {
      mounted = false;
    };
  }, [selectedCountry?.cca3]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,65,6,0.14),transparent_42%),radial-gradient(circle_at_80%_30%,rgba(120,80,255,0.16),transparent_40%),radial-gradient(circle_at_40%_80%,rgba(0,200,255,0.12),transparent_52%),radial-gradient(circle_at_12%_55%,rgba(255,210,150,0.22),transparent_18%),radial-gradient(circle_at_12%_55%,rgba(255,170,90,0.10),transparent_32%)]" />
        <div className="absolute inset-0 opacity-55 [background:radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:3px_3px] animate-[spaceTwinkle_6s_ease-in-out_infinite]" />
      </div>

      <div className="absolute inset-0">
        <GlobeScene
          countries={countries}
          selectedCountry={selectedFull}
          onSelectCountry={handleSelect}
          onReset={handleReset}
          onHoverCountry={setHoveredCountry}
          searchOpen={searchOpen}
        />
      </div>

      {/* 🧭 Sleek Floating Hover Tooltip */}
      <AnimatePresence>
        {hoveredCountry && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 4 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none fixed z-50 flex items-center gap-2.5 rounded-xl border border-white/20 bg-black/85 px-3.5 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-md"
            style={{
              left: Math.min(window.innerWidth - 200, mousePos.x + 16),
              top: Math.max(16, Math.min(window.innerHeight - 60, mousePos.y - 18)),
            }}
          >
            {hoveredCountry.flag ? (
              <img
                src={hoveredCountry.flag}
                alt=""
                className="h-3.5 w-5 rounded-xs object-cover shadow-xs"
              />
            ) : hoveredCountry.emoji ? (
              <span className="text-base leading-none">{hoveredCountry.emoji}</span>
            ) : null}
            <span className="font-semibold text-white/95">{hoveredCountry.name}</span>
            {hoveredCountry.isSmall && (
              <span className="rounded-full bg-cyan-400/25 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                Pinpoint
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SearchBar
        countries={countries}
        selectedCountry={selectedFull}
        onSelect={handleSelect}
        onOpenChange={setSearchOpen}
      />

      <Sidebar
        country={selectedFull}
        open={sidebarOpen}
        onClose={handleReset}
      />
    </div>
  );
}

export default App;
