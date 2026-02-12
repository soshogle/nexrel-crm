/**
 * EHR API Connectors - for EHRs that expose REST or FHIR APIs
 * Add new connectors here when an EHR vendor provides API access
 */

export type ConnectorType = 'rest' | 'fhir' | 'hl7';

export interface EHRConnectorConfig {
  id: string;
  ehrType: string;
  displayName: string;
  type: ConnectorType;
  /** Base URL - can use env vars like ${EHR_DENTRIX_API_URL} */
  baseUrl?: string;
  /** Auth: bearer, api_key, oauth2 */
  auth: 'bearer' | 'api_key' | 'oauth2';
  /** Endpoints for common operations */
  endpoints?: {
    appointments?: string;
    patients?: string;
    schedule?: string;
  };
  /** Docs link */
  docs?: string;
}

export const EHR_API_CONNECTORS: EHRConnectorConfig[] = [
  {
    id: 'dentrix-ascend-api',
    ehrType: 'dentrix_ascend',
    displayName: 'Dentrix Ascend API',
    type: 'rest',
    baseUrl: '${EHR_DENTRIX_ASCEND_API_URL}',
    auth: 'oauth2',
    endpoints: {
      appointments: '/api/v1/appointments',
      patients: '/api/v1/patients',
      schedule: '/api/v1/schedule',
    },
    docs: 'https://developer.dentrix.com',
  },
  {
    id: 'epic-fhir',
    ehrType: 'epic',
    displayName: 'Epic FHIR',
    type: 'fhir',
    baseUrl: '${EHR_EPIC_FHIR_URL}',
    auth: 'oauth2',
    endpoints: {
      appointments: '/Appointment',
      patients: '/Patient',
      schedule: '/Schedule',
    },
    docs: 'https://fhir.epic.com',
  },
  {
    id: 'athena-fhir',
    ehrType: 'athena',
    displayName: 'Athenahealth FHIR',
    type: 'fhir',
    baseUrl: '${EHR_ATHENA_FHIR_URL}',
    auth: 'oauth2',
    endpoints: {
      appointments: '/v1/16500/fhir/r4/Appointment',
      patients: '/v1/16500/fhir/r4/Patient',
    },
    docs: 'https://developer.athenahealth.com',
  },
  {
    id: 'open-dental-api',
    ehrType: 'opendental',
    displayName: 'Open Dental REST API',
    type: 'rest',
    baseUrl: '${EHR_OPENDENTAL_API_URL}',
    auth: 'api_key',
    endpoints: {
      appointments: '/api/v1/appointments',
      patients: '/api/v1/patients',
    },
    docs: 'https://www.opendental.com/help/api',
  },
];

export function getConnector(id: string): EHRConnectorConfig | undefined {
  return EHR_API_CONNECTORS.find((c) => c.id === id);
}

export function getConnectorsForEHR(ehrType: string): EHRConnectorConfig[] {
  return EHR_API_CONNECTORS.filter((c) => c.ehrType === ehrType);
}
