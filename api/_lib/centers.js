import registry from "../../src/data/registration-centers.json" with { type: "json" };

const CENTERS = Array.isArray(registry?.centers) ? registry.centers : [];

const CENTER_TYPE_ORDER = {
  regional_center: 0,
  district_branch: 1,
  municipal_branch: 2,
};

const LATIN_CITY_ALIASES = new Map([
  ["tbilisi", "თბილისი"],
  ["batumi", "ბათუმი"],
  ["kutaisi", "ქუთაისი"],
  ["rustavi", "რუსთავი"],
  ["gori", "გორი"],
  ["telavi", "თელავი"],
  ["zugdidi", "ზუგდიდი"],
  ["khashuri", "ხაშური"],
  ["marneuli", "მარნეული"],
  ["kobuleti", "ქობულეთი"],
  ["samtredia", "სამტრედია"],
  ["gardabani", "გარდაბანი"],
]);

export function normalizeCity(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const latin = LATIN_CITY_ALIASES.get(value.toLowerCase());
  return latin || value;
}

export function findCenterForCity(rawCity) {
  const city = normalizeCity(rawCity);
  if (!city) return null;

  const matches = CENTERS.filter((center) =>
    center.city === city ||
    (center.city && city.startsWith(center.city)) ||
    (center.city && center.city.startsWith(city))
  );
  if (matches.length === 0) return null;

  matches.sort((a, b) =>
    (CENTER_TYPE_ORDER[a.center_type] ?? 9) - (CENTER_TYPE_ORDER[b.center_type] ?? 9)
  );

  const center = matches[0];
  return {
    name: center.name_ka || `${center.city} — სამხედრო აღრიცხვის ცენტრი`,
    city: center.city,
    address: center.address_ka || null,
    hours: center.working_hours_ka || null,
    phone: center.local_phone || center.shared_hotline || null,
  };
}

export function listCenterCities() {
  return [...new Set(CENTERS.map((center) => center.city).filter(Boolean))];
}
