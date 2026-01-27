/**
 * Data Validation Layer
 * 
 * Validates lead data quality with scoring and blacklist management
 * Returns validation score (0-100) and list of errors
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ValidationResult {
  isValid: boolean;
  validationScore: number; // 0-100
  validationErrors: string[];
  qualityFlag: 'low_quality' | 'medium_quality' | 'high_quality';
}

/**
 * Validate lead data
 */
export async function validateLead(lead: {
  businessName?: string;
  email?: string;
  phone?: string;
  website?: string;
}): Promise<ValidationResult> {
  const validationErrors: string[] = [];
  let validationScore = 100;
  
  // Email validation
  if (lead.email) {
    if (!isValidEmailFormat(lead.email)) {
      validationErrors.push('Invalid email format');
      validationScore -= 25;
    } else if (isDisposableEmail(lead.email)) {
      validationErrors.push('Disposable email address');
      validationScore -= 15;
    } else if (await isEmailBlacklisted(lead.email)) {
      validationErrors.push('Email on blacklist');
      validationScore -= 30;
    }
  } else {
    validationErrors.push('Missing email');
    validationScore -= 20;
  }
  
  // Phone validation
  if (lead.phone) {
    if (!isValidPhoneFormat(lead.phone)) {
      validationErrors.push('Invalid phone format');
      validationScore -= 25;
    } else if (await isPhoneBlacklisted(lead.phone)) {
      validationErrors.push('Phone on blacklist');
      validationScore -= 30;
    }
  } else {
    validationErrors.push('Missing phone');
    validationScore -= 20;
  }
  
  // Company name validation
  if (!lead.businessName || lead.businessName.length < 2) {
    validationErrors.push('Invalid company name');
    validationScore -= 15;
  }
  
  // Suspicious patterns
  if (lead.businessName?.toLowerCase().includes('test')) {
    validationErrors.push('Suspicious company name (test)');
    validationScore -= 20;
  }
  
  // Ensure score doesn't go below 0
  validationScore = Math.max(0, validationScore);
  
  // Determine quality flag
  let qualityFlag: ValidationResult['qualityFlag'];
  if (validationScore >= 70) {
    qualityFlag = 'high_quality';
  } else if (validationScore >= 40) {
    qualityFlag = 'medium_quality';
  } else {
    qualityFlag = 'low_quality';
  }
  
  return {
    isValid: validationScore >= 50,
    validationScore,
    validationErrors,
    qualityFlag
  };
}

/**
 * Validate email format using regex
 */
export function isValidEmailFormat(email?: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email is from a disposable email provider
 */
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    'tempmail.com',
    'guerrillamail.com',
    '10minutemail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    'yopmail.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}

/**
 * Validate phone format (US format)
 */
export function isValidPhoneFormat(phone?: string): boolean {
  if (!phone) return false;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Check if it has 10 or 11 digits (US format)
  return digits.length === 10 || digits.length === 11;
}

/**
 * Check if email is blacklisted
 */
export async function isEmailBlacklisted(email: string): Promise<boolean> {
  try {
    const blacklist = await prisma.leadBlacklist.findFirst({
      where: {
        OR: [
          { email },
          { email: { contains: email.split('@')[1] } } // Domain blacklist
        ],
        isActive: true
      }
    });
    return !!blacklist;
  } catch (error) {
    console.error('Error checking email blacklist:', error);
    return false;
  }
}

/**
 * Check if phone is blacklisted
 */
export async function isPhoneBlacklisted(phone: string): Promise<boolean> {
  try {
    const normalized = phone.replace(/\D/g, '');
    const blacklist = await prisma.leadBlacklist.findFirst({
      where: {
        phone: normalized,
        isActive: true
      }
    });
    return !!blacklist;
  } catch (error) {
    console.error('Error checking phone blacklist:', error);
    return false;
  }
}

/**
 * Add email/phone to blacklist
 */
export async function addToBlacklist(data: {
  email?: string;
  phone?: string;
  reason?: string;
  userId: string;
}) {
  return await prisma.leadBlacklist.create({
    data: {
      email: data.email,
      phone: data.phone,
      reason: data.reason || 'User reported',
      isActive: true,
      userId: data.userId
    }
  });
}

/**
 * Remove from blacklist
 */
export async function removeFromBlacklist(id: string) {
  return await prisma.leadBlacklist.update({
    where: { id },
    data: { isActive: false }
  });
}

/**
 * Batch validate multiple leads
 */
export async function batchValidateLeads(leads: Array<{
  businessName?: string;
  email?: string;
  phone?: string;
  website?: string;
}>): Promise<ValidationResult[]> {
  return await Promise.all(leads.map(lead => validateLead(lead)));
}
