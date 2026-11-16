import countriesData from "../data/countries.json";

export const getAllCountries = async () => {
  try {
    if (Array.isArray(countriesData) && countriesData.length > 0) {
      return countriesData;
    }

    // Fallback to CDN mirror if local dataset is not available
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/dr5hn/countries-states-cities-database@master/json/countries.json"
    );
    if (!res.ok) throw new Error("Failed to fetch fallback countries");

    const data = await res.json();
    return data.map((c) => {
      const cca2 = c.iso2 ? c.iso2.toLowerCase() : "";
      return {
        name: c.name || "",
        officialName: c.native || c.name || "",
        cca3: c.iso3 || "",
        cca2: c.iso2 || "",
        capital: c.capital ? [c.capital] : [],
        population: c.population || 0,
        region: c.region || "",
        subregion: c.subregion || "",
        currency: c.currency_name || c.currency || "N/A",
        currencies: c.currency
          ? { [c.currency]: { name: c.currency_name, symbol: c.currency_symbol } }
          : null,
        languages: null,
        flag: cca2 ? `https://flagcdn.com/w320/${cca2}.png` : "",
        emoji: c.emoji || "",
        latlng: [parseFloat(c.latitude) || 0, parseFloat(c.longitude) || 0],
      };
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    return Array.isArray(countriesData) ? countriesData : [];
  }
};

export const getCountryDetailsByCca3 = async (cca3) => {
  if (!cca3) return null;

  try {
    const list = Array.isArray(countriesData) ? countriesData : await getAllCountries();
    const match = list.find(
      (c) => String(c.cca3 || "").toUpperCase() === String(cca3).toUpperCase()
    );
    return match || null;
  } catch (error) {
    console.error("Error fetching country details:", error);
    return null;
  }
};
