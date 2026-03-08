import type { Industry } from "@prisma/client";

export interface PipedaPrivacyOfficial {
  name: string;
  title: string;
  email: string;
}

export interface EncryptionPosture {
  transportEncryption: {
    httpsConfigured: boolean;
    hstsEnabledByMiddleware: boolean;
    note: string;
  };
  atRestEncryption: {
    fieldLevelEncryptionConfigured: boolean;
    appLevelEncryptionConfigured: boolean;
    note: string;
  };
}

export interface PipedaAccountabilityProfile {
  principle: "PIPEDA_FIP_1_ACCOUNTABILITY";
  designatedOfficial: PipedaPrivacyOfficial;
  privacyProgram: {
    hasDocumentedPolicies: boolean;
    hasComplaintAndInquiryProcess: boolean;
    hasAccessRequestProcess: boolean;
    hasBreachIncidentProtocol: boolean;
    hasThirdPartyProcessorControls: boolean;
    hasTrainingExpectation: boolean;
  };
  dataHandlingChecklist: string[];
  supportedIndustries: Industry[];
  encryptionPosture: EncryptionPosture;
}

function getDesignatedOfficial(): PipedaPrivacyOfficial {
  return {
    name: process.env.PIPEDA_PRIVACY_OFFICER_NAME || "Privacy Team",
    title: process.env.PIPEDA_PRIVACY_OFFICER_TITLE || "Privacy Officer",
    email: process.env.PIPEDA_PRIVACY_OFFICER_EMAIL || "privacy@soshogle.com",
  };
}

function getEncryptionPosture(): EncryptionPosture {
  const baseUrl =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const httpsConfigured = baseUrl ? baseUrl.startsWith("https://") : false;

  const fieldLevelEncryptionConfigured = Boolean(
    process.env.ENCRYPTION_SECRET || process.env.ENCRYPTION_KEY,
  );
  const appLevelEncryptionConfigured = Boolean(
    process.env.MASTER_ENCRYPTION_KEY ||
      process.env.DOCUMENT_ENCRYPTION_KEY ||
      process.env.ENCRYPTION_SECRET ||
      process.env.ENCRYPTION_KEY,
  );

  return {
    transportEncryption: {
      httpsConfigured,
      hstsEnabledByMiddleware: true,
      note: "HTTPS + HSTS are enforced by middleware in production.",
    },
    atRestEncryption: {
      fieldLevelEncryptionConfigured,
      appLevelEncryptionConfigured,
      note: "Sensitive fields use AES encryption helpers and document storage supports encrypted-at-rest paths.",
    },
  };
}

export function getPipedaAccountabilityProfile(): PipedaAccountabilityProfile {
  return {
    principle: "PIPEDA_FIP_1_ACCOUNTABILITY",
    designatedOfficial: getDesignatedOfficial(),
    privacyProgram: {
      hasDocumentedPolicies: true,
      hasComplaintAndInquiryProcess: true,
      hasAccessRequestProcess: true,
      hasBreachIncidentProtocol: true,
      hasThirdPartyProcessorControls: true,
      hasTrainingExpectation: true,
    },
    dataHandlingChecklist: [
      "What personal information is collected and how sensitive it is",
      "Purpose of collection and lawful/consent basis",
      "Collection method and notice transparency",
      "Use and disclosure boundaries",
      "Storage location and security controls",
      "Access controls and role-based permissions",
      "Third-party processor transfers and safeguards",
      "Retention schedule and secure destruction timing",
    ],
    supportedIndustries: [
      "ACCOUNTING",
      "CONSTRUCTION",
      "DENTIST",
      "HEALTH_CLINIC",
      "HOSPITAL",
      "LAW",
      "MEDICAL",
      "MEDICAL_SPA",
      "OPTOMETRIST",
      "ORTHODONTIST",
      "RESTAURANT",
      "RETAIL",
      "SPORTS_CLUB",
      "TECHNOLOGY",
      "REAL_ESTATE",
    ],
    encryptionPosture: getEncryptionPosture(),
  };
}
