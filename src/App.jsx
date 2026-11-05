import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import GlobeScene from "./components/GlobeScene";
import SearchBar from "./components/SearchBar";
import { getAllCountries, getCountryDetailsByCca3 } from "./services/countryService";

function App() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
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
          searchOpen={searchOpen}
        />
      </div>

      <SearchBar
        countries={countries}
        selectedCountry={selectedFull}
        onSelect={handleSelect}
        onOpenChange={setSearchOpen}
      />

      <Sidebar
        country={selectedFull}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}

export default App;