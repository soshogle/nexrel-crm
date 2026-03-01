/**
 * Country-aware locale labels for address forms and displays.
 *
 * Returns the correct terminology based on the user's country:
 *   CA → Province, Postal Code, QC, H3B 2Y5, Montreal
 *   US → State, ZIP Code, CA, 90210, Los Angeles
 *   fallback → Province/State, Postal/ZIP, etc.
 */

export interface LocaleLabels {
  stateLabel: string;
  zipLabel: string;
  statePlaceholder: string;
  zipPlaceholder: string;
  cityPlaceholder: string;
  countryCode: string;
  stateOptions: { value: string; label: string }[];
}

const CA_PROVINCES = [
  { value: 'QC', label: 'Quebec' },
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NL', label: 'Newfoundland & Labrador' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NU', label: 'Nunavut' },
];

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

export function getLocaleLabels(country?: string | null): LocaleLabels {
  const c = (country || 'CA').toUpperCase();

  if (c === 'US' || c === 'USA') {
    return {
      stateLabel: 'State',
      zipLabel: 'ZIP Code',
      statePlaceholder: 'CA',
      zipPlaceholder: '90210',
      cityPlaceholder: 'Los Angeles',
      countryCode: 'US',
      stateOptions: US_STATES,
    };
  }

  if (c === 'CA' || c === 'CAN' || c === 'CANADA') {
    return {
      stateLabel: 'Province',
      zipLabel: 'Postal Code',
      statePlaceholder: 'QC',
      zipPlaceholder: 'H3B 2Y5',
      cityPlaceholder: 'Montreal',
      countryCode: 'CA',
      stateOptions: CA_PROVINCES,
    };
  }

  return {
    stateLabel: 'Province/State',
    zipLabel: 'Postal/ZIP Code',
    statePlaceholder: '',
    zipPlaceholder: '',
    cityPlaceholder: '',
    countryCode: c,
    stateOptions: [...CA_PROVINCES, ...US_STATES],
  };
}
