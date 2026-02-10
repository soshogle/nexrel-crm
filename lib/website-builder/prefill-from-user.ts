/**
 * Build questionnaire answers from User/onboarding data
 * so the website builder can be pre-filled with company and legal info.
 */

import type { QuestionnaireAnswers } from './types';

export interface UserForPrefill {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  businessDescription?: string | null;
  legalEntityName?: string | null;
  legalJurisdiction?: string | null;
  companyLogoUrl?: string | null;
  productsServices?: string | null;
  targetAudience?: string | null;
  industryNiche?: string | null;
  businessCategory?: string | null;
  operatingLocation?: string | null;
}

/**
 * Build QuestionnaireAnswers from a user record (e.g. from onboarding).
 * Use this to pre-fill the website builder when the user has already completed onboarding.
 */
export function buildQuestionnaireFromUser(user: UserForPrefill): QuestionnaireAnswers {
  const businessName = user.name?.trim() || 'My Business';
  const services = user.productsServices
    ? user.productsServices.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
    : undefined;

  return {
    businessName,
    businessDescription: user.businessDescription?.trim() || '',
    services: services && services.length > 0 ? services : ['Our Services'],
    contactInfo: {
      email: user.email?.trim() || undefined,
      phone: user.phone?.trim() || undefined,
      address: user.address?.trim() || undefined,
    },
    legalEntityName: user.legalEntityName?.trim() || undefined,
    legalJurisdiction: user.legalJurisdiction?.trim() || undefined,
    logo: user.companyLogoUrl?.trim() || undefined,
    targetAudience: user.targetAudience?.trim() || undefined,
  };
}
