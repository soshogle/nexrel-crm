/**
 * Common CDT (Code on Dental Procedures and Nomenclature) Codes
 * Reference: ADA CDT 2024
 */

export interface CDTCode {
  code: string;
  name: string;
  category: string;
  typicalCost?: number;
  description?: string;
}

export const CDT_CODES: CDTCode[] = [
  // Diagnostic
  { code: 'D0120', name: 'Periodic oral evaluation', category: 'Diagnostic', typicalCost: 50 },
  { code: 'D0150', name: 'Comprehensive oral evaluation', category: 'Diagnostic', typicalCost: 100 },
  { code: 'D0160', name: 'Detailed and extensive oral evaluation', category: 'Diagnostic', typicalCost: 150 },
  { code: 'D0210', name: 'Intraoral - complete series', category: 'Diagnostic', typicalCost: 150 },
  { code: 'D0220', name: 'Intraoral - periapical first film', category: 'Diagnostic', typicalCost: 25 },
  { code: 'D0270', name: 'Bitewings - two films', category: 'Diagnostic', typicalCost: 50 },
  { code: 'D0330', name: 'Panoramic film', category: 'Diagnostic', typicalCost: 100 },

  // Preventive
  { code: 'D1110', name: 'Adult prophylaxis', category: 'Preventive', typicalCost: 100 },
  { code: 'D1120', name: 'Child prophylaxis', category: 'Preventive', typicalCost: 75 },
  { code: 'D1206', name: 'Topical fluoride varnish', category: 'Preventive', typicalCost: 30 },
  { code: 'D1351', name: 'Sealant - per tooth', category: 'Preventive', typicalCost: 50 },

  // Restorative - Amalgam
  { code: 'D2140', name: 'Amalgam - one surface, primary', category: 'Restorative', typicalCost: 100 },
  { code: 'D2150', name: 'Amalgam - two surface, primary', category: 'Restorative', typicalCost: 120 },
  { code: 'D2160', name: 'Amalgam - one surface, permanent', category: 'Restorative', typicalCost: 150 },
  { code: 'D2161', name: 'Amalgam - two surface, permanent', category: 'Restorative', typicalCost: 180 },

  // Restorative - Composite
  { code: 'D2391', name: 'Resin - one surface, anterior', category: 'Restorative', typicalCost: 200 },
  { code: 'D2392', name: 'Resin - two surface, anterior', category: 'Restorative', typicalCost: 250 },
  { code: 'D2393', name: 'Resin - three surface, anterior', category: 'Restorative', typicalCost: 300 },
  { code: 'D2394', name: 'Resin - four or more surfaces, anterior', category: 'Restorative', typicalCost: 350 },

  // Endodontics
  { code: 'D3310', name: 'Endodontic therapy, anterior', category: 'Endodontics', typicalCost: 800 },
  { code: 'D3320', name: 'Endodontic therapy, bicuspid', category: 'Endodontics', typicalCost: 900 },
  { code: 'D3330', name: 'Endodontic therapy, molar', category: 'Endodontics', typicalCost: 1100 },

  // Periodontics
  { code: 'D4341', name: 'Periodontal scaling and root planing - four or more teeth per quadrant', category: 'Periodontics', typicalCost: 300 },
  { code: 'D4342', name: 'Periodontal scaling and root planing - one to three teeth per quadrant', category: 'Periodontics', typicalCost: 200 },

  // Prosthodontics - Fixed
  { code: 'D2740', name: 'Crown - porcelain/ceramic substrate', category: 'Prosthodontics', typicalCost: 1200 },
  { code: 'D2750', name: 'Crown - porcelain fused to metal', category: 'Prosthodontics', typicalCost: 1100 },
  { code: 'D2790', name: 'Crown - full cast metal', category: 'Prosthodontics', typicalCost: 1000 },

  // Oral Surgery
  { code: 'D7140', name: 'Extraction, erupted tooth', category: 'Oral Surgery', typicalCost: 150 },
  { code: 'D7210', name: 'Extraction, erupted tooth requiring removal of bone', category: 'Oral Surgery', typicalCost: 250 },
  { code: 'D7240', name: 'Removal of impacted tooth - soft tissue', category: 'Oral Surgery', typicalCost: 300 },
  { code: 'D7241', name: 'Removal of impacted tooth - partially bony', category: 'Oral Surgery', typicalCost: 400 },
  { code: 'D7242', name: 'Removal of impacted tooth - completely bony', category: 'Oral Surgery', typicalCost: 500 },

  // Orthodontics
  { code: 'D8010', name: 'Limited orthodontic treatment', category: 'Orthodontics', typicalCost: 2000 },
  { code: 'D8070', name: 'Comprehensive orthodontic treatment', category: 'Orthodontics', typicalCost: 5000 },
];

export const getCDTCodeByCode = (code: string): CDTCode | undefined => {
  return CDT_CODES.find(c => c.code === code);
};

export const getCDTCodesByCategory = (category: string): CDTCode[] => {
  return CDT_CODES.filter(c => c.category === category);
};

export const searchCDTCodes = (query: string): CDTCode[] => {
  const lowerQuery = query.toLowerCase();
  return CDT_CODES.filter(
    c =>
      c.code.toLowerCase().includes(lowerQuery) ||
      c.name.toLowerCase().includes(lowerQuery) ||
      c.category.toLowerCase().includes(lowerQuery)
  );
};
