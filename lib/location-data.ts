/**
 * Countries and provinces/states for onboarding location dropdowns.
 * Format: { country: string, provinces: string[] } — provinces empty for countries without subdivisions.
 */

export const LOCATION_COUNTRIES: { code: string; name: string; provinces: string[] }[] = [
  { code: 'US', name: 'United States', provinces: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'] },
  { code: 'CA', name: 'Canada', provinces: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'] },
  { code: 'AU', name: 'Australia', provinces: ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'] },
  { code: 'GB', name: 'United Kingdom', provinces: ['England', 'Scotland', 'Wales', 'Northern Ireland'] },
  { code: 'DE', name: 'Germany', provinces: ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'] },
  { code: 'FR', name: 'France', provinces: [] },
  { code: 'ES', name: 'Spain', provinces: [] },
  { code: 'IT', name: 'Italy', provinces: [] },
  { code: 'NL', name: 'Netherlands', provinces: [] },
  { code: 'BE', name: 'Belgium', provinces: [] },
  { code: 'IN', name: 'India', provinces: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'] },
  { code: 'MX', name: 'Mexico', provinces: ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'] },
  { code: 'BR', name: 'Brazil', provinces: [] },
  { code: 'JP', name: 'Japan', provinces: [] },
  { code: 'CN', name: 'China', provinces: [] },
  { code: 'SG', name: 'Singapore', provinces: [] },
  { code: 'AE', name: 'United Arab Emirates', provinces: [] },
  { code: 'ZA', name: 'South Africa', provinces: [] },
  { code: 'IE', name: 'Ireland', provinces: [] },
  { code: 'NZ', name: 'New Zealand', provinces: [] },
  { code: 'CH', name: 'Switzerland', provinces: [] },
  { code: 'AT', name: 'Austria', provinces: [] },
  { code: 'PL', name: 'Poland', provinces: [] },
  { code: 'PT', name: 'Portugal', provinces: [] },
  { code: 'SE', name: 'Sweden', provinces: [] },
  { code: 'NO', name: 'Norway', provinces: [] },
  { code: 'DK', name: 'Denmark', provinces: [] },
  { code: 'FI', name: 'Finland', provinces: [] },
  { code: 'GR', name: 'Greece', provinces: [] },
  { code: 'TR', name: 'Turkey', provinces: [] },
  { code: 'IL', name: 'Israel', provinces: [] },
  { code: 'PH', name: 'Philippines', provinces: [] },
  { code: 'TH', name: 'Thailand', provinces: [] },
  { code: 'VN', name: 'Vietnam', provinces: [] },
  { code: 'MY', name: 'Malaysia', provinces: [] },
  { code: 'ID', name: 'Indonesia', provinces: [] },
  { code: 'AR', name: 'Argentina', provinces: [] },
  { code: 'CL', name: 'Chile', provinces: [] },
  { code: 'CO', name: 'Colombia', provinces: [] },
  { code: 'PE', name: 'Peru', provinces: [] },
  { code: 'EG', name: 'Egypt', provinces: [] },
  { code: 'NG', name: 'Nigeria', provinces: [] },
  { code: 'KE', name: 'Kenya', provinces: [] },
  { code: 'GH', name: 'Ghana', provinces: [] },
  { code: 'OTHER', name: 'Other', provinces: [] },
];

/** Province/state abbreviations to full names for parsing legacy values */
export const PROVINCE_ABBREV: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NF: 'Newfoundland and Labrador',
  NL: 'Newfoundland and Labrador', // legacy NT: 'Northwest Territories', NS: 'Nova Scotia',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec', PQ: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
};

/** Map country + province to timezone for auto-detection */
export function getTimezoneForLocation(countryName: string, provinceName?: string): string {
  const c = countryName.toLowerCase();
  const p = (provinceName || '').toLowerCase();

  if (c.includes('united states') || c === 'us') {
    if (['california', 'washington', 'oregon', 'nevada'].some(s => p.includes(s))) return 'America/Los_Angeles';
    if (['colorado', 'arizona', 'utah', 'new mexico', 'montana', 'wyoming'].some(s => p.includes(s))) return 'America/Denver';
    if (['texas', 'illinois', 'minnesota', 'wisconsin', 'iowa', 'missouri'].some(s => p.includes(s))) return 'America/Chicago';
    if (['new york', 'florida', 'georgia', 'pennsylvania', 'massachusetts', 'virginia', 'north carolina'].some(s => p.includes(s))) return 'America/New_York';
    if (p.includes('alaska')) return 'America/Anchorage';
    if (p.includes('hawaii')) return 'Pacific/Honolulu';
    return 'America/New_York';
  }
  if (c.includes('canada') || c === 'ca') {
    if (['british columbia'].some(s => p.includes(s))) return 'America/Vancouver';
    if (['alberta', 'saskatchewan'].some(s => p.includes(s))) return 'America/Edmonton';
    if (['manitoba'].some(s => p.includes(s))) return 'America/Winnipeg';
    if (['ontario', 'quebec'].some(s => p.includes(s))) return 'America/Toronto';
    if (['nova scotia', 'new brunswick', 'prince edward island', 'newfoundland'].some(s => p.includes(s))) return 'America/Halifax';
    return 'America/Toronto';
  }
  if (c.includes('united kingdom') || c === 'gb') return 'Europe/London';
  if (c.includes('australia') || c === 'au') return 'Australia/Sydney';
  if (c.includes('germany') || c === 'de') return 'Europe/Berlin';
  if (c.includes('france') || c === 'fr') return 'Europe/Paris';
  if (c.includes('india') || c === 'in') return 'Asia/Kolkata';
  if (c.includes('japan') || c === 'jp') return 'Asia/Tokyo';
  if (c.includes('china') || c === 'cn') return 'Asia/Shanghai';
  if (c.includes('singapore') || c === 'sg') return 'Asia/Singapore';
  if (c.includes('uae') || c.includes('emirates') || c === 'ae') return 'Asia/Dubai';
  if (c.includes('mexico') || c === 'mx') return 'America/Mexico_City';
  if (c.includes('brazil') || c === 'br') return 'America/Sao_Paulo';
  return 'UTC';
}
