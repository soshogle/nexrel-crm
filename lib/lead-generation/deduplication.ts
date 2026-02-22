/**
 * Lead Deduplication Engine
 *
 * Multi-layer deduplication with intelligent merge logic:
 * Layer 1: Exact match (Email + Phone)
 * Layer 2: Email-only match (high confidence)
 * Layer 3: Phone-only match (medium confidence)
 * Layer 4: Fuzzy matching (company name + location)
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';

export interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateId?: string;
  confidence: 'high' | 'medium' | 'low';
  matchType?: 'exact' | 'email' | 'phone' | 'fuzzy';
  merged?: boolean;
}

/**
 * Check if lead is duplicate and merge if necessary
 */
export async function deduplicateLead(
  userId: string,
  newLead: {
    businessName: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
  },
  industry?: string | null
): Promise<DeduplicationResult> {
  const ctx = createDalContext(userId, industry);
  const db = getCrmDb(ctx);

  // Layer 1: Exact match (Email + Phone)
  if (newLead.email && newLead.phone) {
    const exactMatch = await db.lead.findFirst({
      where: {
        userId,
        email: newLead.email,
        phone: newLead.phone
      }
    });
    
    if (exactMatch) {
      return {
        isDuplicate: true,
        duplicateId: exactMatch.id,
        confidence: 'high',
        matchType: 'exact'
      };
    }
  }
  
  // Layer 2: Email-only match (high confidence)
  if (newLead.email) {
    const emailMatch = await db.lead.findFirst({
      where: {
        userId,
        email: newLead.email
      }
    });
    
    if (emailMatch) {
      // Verify it's the same company
      if (isSameCompany(emailMatch.businessName, newLead.businessName)) {
        return {
          isDuplicate: true,
          duplicateId: emailMatch.id,
          confidence: 'high',
          matchType: 'email'
        };
      }
    }
  }
  
  // Layer 3: Phone-only match (medium confidence)
  if (newLead.phone) {
    const phoneMatch = await db.lead.findFirst({
      where: {
        userId,
        phone: newLead.phone
      }
    });
    
    if (phoneMatch) {
      // Verify it's the same company
      if (isSameCompany(phoneMatch.businessName, newLead.businessName)) {
        return {
          isDuplicate: true,
          duplicateId: phoneMatch.id,
          confidence: 'medium',
          matchType: 'phone'
        };
      }
    }
  }
  
  // Layer 4: Fuzzy matching (company name + location)
  if (newLead.city && newLead.state) {
    const fuzzyMatches = await db.lead.findMany({
      where: {
        userId,
        city: newLead.city,
        state: newLead.state
      }
    });
    
    for (const match of fuzzyMatches) {
      const similarity = calculateNameSimilarity(
        match.businessName.toLowerCase(),
        newLead.businessName.toLowerCase()
      );
      
      if (similarity > 0.85) { // 85% similarity threshold
        return {
          isDuplicate: true,
          duplicateId: match.id,
          confidence: 'low',
          matchType: 'fuzzy'
        };
      }
    }
  }
  
  // No duplicate found
  return {
    isDuplicate: false,
    confidence: 'high'
  };
}

/**
 * Merge duplicate lead data
 */
export async function mergeLead(
  userId: string,
  primaryLeadId: string,
  secondaryData: any,
  industry?: string | null
): Promise<void> {
  const ctx = createDalContext(userId, industry);
  const db = getCrmDb(ctx);

  const primaryLead = await db.lead.findFirst({
    where: { id: primaryLeadId, userId }
  });
  
  if (!primaryLead) {
    throw new Error(`Primary lead not found: ${primaryLeadId}`);
  }
  
  // Merge strategy: Keep best data from each
  const mergedData: any = {};
  
  // Email: Use valid email, prefer primary
  if (isValidEmail(primaryLead.email)) {
    mergedData.email = primaryLead.email;
  } else if (isValidEmail(secondaryData.email)) {
    mergedData.email = secondaryData.email;
  }
  
  // Phone: Use valid phone, prefer primary
  if (isValidPhone(primaryLead.phone)) {
    mergedData.phone = primaryLead.phone;
  } else if (isValidPhone(secondaryData.phone)) {
    mergedData.phone = secondaryData.phone;
  }
  
  // Website: Prefer non-null
  mergedData.website = primaryLead.website || secondaryData.website;
  
  // Address: Prefer more complete address
  if (primaryLead.address) {
    mergedData.address = primaryLead.address;
    mergedData.city = primaryLead.city;
    mergedData.state = primaryLead.state;
    mergedData.zipCode = primaryLead.zipCode;
  } else if (secondaryData.address) {
    mergedData.address = secondaryData.address;
    mergedData.city = secondaryData.city;
    mergedData.state = secondaryData.state;
    mergedData.zipCode = secondaryData.zipCode;
  }
  
  // Merge enriched data
  const primaryEnriched = (primaryLead.enrichedData || {}) as any;
  const secondaryEnriched = (secondaryData.enrichedData || {}) as any;
  const enrichedData = {
    ...primaryEnriched,
    ...secondaryEnriched,
    lastMerged: new Date().toISOString()
  };
  
  // Track merge history
  const mergeHistory: any[] = (primaryLead.mergeHistory as any[]) || [];
  mergeHistory.push({
    mergedWith: secondaryData,
    mergedAt: new Date().toISOString(),
    source: secondaryData.source
  });

  // Update primary lead
  await db.lead.update({
    where: { id: primaryLeadId },
    data: {
      ...mergedData,
      enrichedData,
      mergeHistory,
      updatedAt: new Date()
    }
  });
  
  console.log(`Merged lead data into ${primaryLeadId}`);
}

/**
 * Check if two company names refer to the same company
 */
function isSameCompany(name1: string, name2: string): boolean {
  const normalized1 = normalizeCompanyName(name1);
  const normalized2 = normalizeCompanyName(name2);
  
  // Exact match
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Check similarity
  const similarity = calculateNameSimilarity(normalized1, normalized2);
  return similarity > 0.9; // 90% similarity for company name match
}

/**
 * Normalize company name for comparison
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\.?\b/g, '') // Remove legal suffixes
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate similarity between two strings (Levenshtein distance)
 */
function calculateNameSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Calculate similarity (1 - normalized distance)
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Validate email format
 */
function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 */
function isValidPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Batch deduplicate leads
 */
export async function batchDeduplicateLeads(
  userId: string,
  industry?: string | null
): Promise<{
  processed: number;
  duplicates: number;
  merged: number;
}> {
  const ctx = createDalContext(userId, industry);
  const db = getCrmDb(ctx);

  const stats = {
    processed: 0,
    duplicates: 0,
    merged: 0
  };

  // Get all leads without lead scores (recently added)
  const leads = await db.lead.findMany({
    where: {
      userId,
      leadScore: null
    },
    orderBy: { createdAt: 'desc' }
  });

  for (const lead of leads) {
    try {
      const result = await deduplicateLead(userId, {
        businessName: lead.businessName,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        city: lead.city || undefined,
        state: lead.state || undefined
      }, industry);

      if (result.isDuplicate && result.duplicateId) {
        // Merge data (primary=duplicateId, secondary=lead we're about to delete)
        await mergeLead(userId, result.duplicateId, lead, industry);

        // Delete duplicate lead
        await db.lead.delete({
          where: { id: lead.id }
        });
        
        stats.duplicates++;
        stats.merged++;
      }
      
      stats.processed++;
    } catch (error) {
      console.error(`Error deduplicating lead ${lead.id}:`, error);
    }
  }
  
  return stats;
}

/**
 * Check for potential duplicates (for review)
 */
export async function findPotentialDuplicates(
  userId: string,
  threshold: number = 0.85,
  industry?: string | null
): Promise<Array<{
  lead1: any;
  lead2: any;
  similarity: number;
  matchType: string;
}>> {
  const ctx = createDalContext(userId, industry);
  const db = getCrmDb(ctx);

  const leads = await db.lead.findMany({
    where: { userId },
    select: {
      id: true,
      businessName: true,
      email: true,
      phone: true,
      city: true,
      state: true
    }
  });
  
  const potentialDuplicates: Array<{
    lead1: any;
    lead2: any;
    similarity: number;
    matchType: string;
  }> = [];
  
  // Compare all pairs
  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const lead1 = leads[i];
      const lead2 = leads[j];
      
      // Email match
      if (lead1.email && lead2.email && lead1.email === lead2.email) {
        potentialDuplicates.push({
          lead1,
          lead2,
          similarity: 1.0,
          matchType: 'email'
        });
        continue;
      }
      
      // Phone match
      if (lead1.phone && lead2.phone && lead1.phone === lead2.phone) {
        potentialDuplicates.push({
          lead1,
          lead2,
          similarity: 1.0,
          matchType: 'phone'
        });
        continue;
      }
      
      // Name similarity (same location)
      if (lead1.city === lead2.city && lead1.state === lead2.state) {
        const similarity = calculateNameSimilarity(
          normalizeCompanyName(lead1.businessName),
          normalizeCompanyName(lead2.businessName)
        );
        
        if (similarity >= threshold) {
          potentialDuplicates.push({
            lead1,
            lead2,
            similarity,
            matchType: 'fuzzy'
          });
        }
      }
    }
  }
  
  return potentialDuplicates;
}
