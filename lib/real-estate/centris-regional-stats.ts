/**
 * Centris.ca regional median prices — fallback when no comparables in broker DB.
 * Data from Centris.ca public statistics (Q4 2025 / recent).
 * Update periodically from https://www.centris.ca/en/tools/real-estate-statistics
 */

export type PropertyCategory = "single_family" | "condo" | "plex";

export interface RegionalMedian {
  region: string;
  singleFamily: number;
  condo: number;
  plex: number;
}

/** Map city/area names to Centris region keys for median lookup */
const CITY_TO_REGION: Record<string, string> = {
  montreal: "montreal_cma",
  montréal: "montreal_cma",
  "montreal island": "montreal_island",
  laval: "montreal_cma",
  longueuil: "montreal_cma",
  brossard: "montreal_cma",
  vaudreuil: "vaudreuil_soulanges",
  "vaudreuil-dorion": "vaudreuil_soulanges",
  "vaudreuil-sur-lac": "vaudreuil_soulanges",
  "saint lazare": "vaudreuil_soulanges",
  quebec: "quebec_cma",
  "quebec city": "quebec_cma",
  gatineau: "gatineau",
  sherbrooke: "sherbrooke",
  saguenay: "saguenay",
  trois rivieres: "trois_rivieres",
  "trois-rivieres": "trois_rivieres",
};

/** Quebec regional median prices (CAD) — from Centris.ca stats. Single-family, Condo, Plex. */
const REGIONAL_MEDIANS: Record<string, { sf: number; condo: number; plex: number }> = {
  quebec_province: { sf: 495_000, condo: 400_000, plex: 685_250 },
  montreal_cma: { sf: 550_000, condo: 420_000, plex: 720_000 },
  montreal_island: { sf: 580_000, condo: 450_000, plex: 750_000 },
  quebec_cma: { sf: 340_000, condo: 265_000, plex: 420_000 },
  gatineau: { sf: 450_000, condo: 320_000, plex: 580_000 },
  sherbrooke: { sf: 380_000, condo: 290_000, plex: 480_000 },
  saguenay: { sf: 245_000, condo: 195_000, plex: 320_000 },
  trois_rivieres: { sf: 285_000, condo: 220_000, plex: 360_000 },
  vaudreuil_soulanges: { sf: 520_000, condo: 380_000, plex: 650_000 },
};

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[éèêë]/g, "e")
    .replace(/[àâä]/g, "a")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/\s+/g, " ");
}

function propertyTypeToCategory(propertyType: string): PropertyCategory {
  const t = propertyType?.toLowerCase() || "";
  if (t.includes("condo") || t.includes("apartment")) return "condo";
  if (t.includes("plex") || t.includes("duplex") || t.includes("triplex")) return "plex";
  return "single_family";
}

/**
 * Get regional median price for a property. Used as fallback when no comparables.
 */
export function getRegionalMedianPrice(
  city: string,
  propertyType: string
): number | null {
  const normalized = normalizeCity(city);
  const category = propertyTypeToCategory(propertyType);

  let regionKey: string | null = null;
  const entries = Object.entries(CITY_TO_REGION).sort((a, b) => b[0].length - a[0].length);
  for (const [cityKey, region] of entries) {
    if (normalized.includes(cityKey) || cityKey.includes(normalized)) {
      regionKey = region;
      break;
    }
  }

  if (!regionKey) {
    regionKey = "montreal_cma";
  }

  const medians = REGIONAL_MEDIANS[regionKey] ?? REGIONAL_MEDIANS.quebec_province;
  const price =
    category === "single_family"
      ? medians.sf
      : category === "condo"
        ? medians.condo
        : medians.plex;

  return price > 0 ? price : null;
}
