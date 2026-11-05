const LIST_URL =
  "https://restcountries.com/v3.1/all?fields=name,cca3,capital,population,region,subregion,currencies,languages,flags,latlng";

const DETAILS_FIELDS =
  "name,cca3,capital,population,region,subregion,currencies,languages,flags,latlng";

export const getAllCountries = async () => {
  try {
    const res = await fetch(LIST_URL);

    if (!res.ok) {
      throw new Error("Failed to fetch countries");
    }

    const data = await res.json();

    return data.map((country) => ({
      name: country.name?.common || "",
      officialName: country.name?.official || "",
      cca3: country.cca3 || "",
      capital: country.capital || [],
      population: country.population || 0,
      region: country.region || "",
      subregion: country.subregion || "",
      currency: country.currencies
        ? Object.values(country.currencies)[0]?.name
        : "N/A",
      currencies: country.currencies || null,
      languages: country.languages || null,
      flag: country.flags?.png || "",
      latlng: country.latlng || [0, 0],
    }));
  } catch (error) {
    console.error("Error fetching countries:", error);
    return [];
  }
};

export const getCountryDetailsByCca3 = async (cca3) => {
  if (!cca3) return null;

  try {
    const url = `https://restcountries.com/v3.1/alpha/${encodeURIComponent(
      cca3
    )}?fields=${DETAILS_FIELDS}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("Failed to fetch country details");
    }

    const data = await res.json();
    const c = Array.isArray(data) ? data[0] : data;

    if (!c) return null;

    return {
      name: c.name?.common || "",
      officialName: c.name?.official || "",
      cca3: c.cca3 || "",
      capital: c.capital || [],
      population: c.population || 0,
      region: c.region || "",
      subregion: c.subregion || "",
      currency: c.currencies
        ? Object.values(c.currencies)[0]?.name
        : "N/A",
      currencies: c.currencies || null,
      languages: c.languages || null,
      flag: c.flags?.png || "",
      latlng: c.latlng || [0, 0],
    };
  } catch (error) {
    console.error("Error fetching country details:", error);
    return null;
  }
};