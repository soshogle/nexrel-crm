
import { prisma } from '@/lib/db';

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  contacts: any[];
}

export async function importContactsFromCSV(
  file: File,
  userId: string
): Promise<ImportResult> {
  // Read CSV file - handle BOM if present
  let text = await file.text();
  
  // Remove BOM if present (UTF-8 BOM: EF BB BF)
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  
  const rows = parseCSV(text);

  if (rows.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse headers - normalize to lowercase and handle various formats
  const headerRow = rows[0];
  const headers = headerRow.map((h) => {
    // Remove quotes, trim, lowercase, and handle spaces/underscores
    return h.trim().toLowerCase().replace(/['"]/g, '').replace(/[\s_]+/g, ' ');
  });

  console.log('Detected headers:', headers);
  console.log('Original header row:', headerRow);

  // Check for required field - accept various forms (more flexible matching)
  const businessNameAliases = [
    'businessname',
    'business name',
    'business',
    'company',
    'companyname',
    'company name',
    'name',
    'clinic',
    'clinicname',
    'clinic name',
    'organization',
    'org',
    'business/company',
    'company/business'
  ];

  const hasBusinessName = headers.some(h => 
    businessNameAliases.includes(h) || 
    h.includes('business') || 
    h.includes('company') ||
    h.includes('clinic') ||
    h.includes('name')
  );

  if (!hasBusinessName) {
    console.error('No business name column found. Headers:', headers);
    throw new Error(
      `CSV must include a business name column. We found these columns: ${headerRow.join(', ')}. Please include a column like: businessName, business name, company, clinic, or name.`
    );
  }

  const success: any[] = [];
  const errors: string[] = [];

  // Process each row (skip header) - Support up to 5000 contacts
  for (let i = 1; i < Math.min(rows.length, 5001); i++) {
    try {
      const values = rows[i];
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || null;
      });

      // Get businessName from various possible column names (more flexible)
      let businessName = 
        row.businessname || 
        row['business name'] || 
        row['business_name'] || 
        row.business ||
        row.company || 
        row.companyname ||
        row['company name'] ||
        row.clinic ||
        row.clinicname ||
        row['clinic name'] ||
        row.organization ||
        row.org ||
        row.name;
      
      // Fallback: find any column that contains these keywords
      if (!businessName) {
        const matchingKey = Object.keys(row).find(key => 
          key.includes('business') || 
          key.includes('company') || 
          key.includes('clinic') ||
          (key === 'name' || key.includes('name'))
        );
        if (matchingKey) {
          businessName = row[matchingKey];
        }
      }

      // businessName is required
      if (!businessName) {
        errors.push(`Row ${i + 1}: Missing business name`);
        continue;
      }

      // Create contact
      const contact = await prisma.lead.create({
        data: {
          userId: userId,
          businessName: businessName,
          contactPerson: row.contactperson || row['contact person'] || row.contact || businessName,
          email: row.email || null,
          phone: row.phone || null,
          address: row.address || null,
          city: row.city || null,
          state: row.state || null,
          zipCode: row.zipcode || row['zip code'] || null,
          country: row.country || null,
          website: row.website || null,
          businessCategory: row.businesscategory || row['business category'] || null,
          contactType: validateContactType(row.contacttype || row['contact type']) || 'prospect',
          status: 'NEW',
          source: 'AI Chat Import',
        },
      });

      success.push(contact);
    } catch (error: any) {
      console.error(`Error importing row ${i + 1}:`, error);
      errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }

  return {
    success: success.length,
    failed: errors.length,
    errors: errors.slice(0, 10), // Return first 10 errors
    contacts: success.slice(0, 5), // Return first 5 imported contacts
  };
}

function validateContactType(type: string | null): 'customer' | 'prospect' | 'partner' | null {
  if (!type) return null;
  const normalized = type.toLowerCase();
  if (['customer', 'prospect', 'partner'].includes(normalized)) {
    return normalized as 'customer' | 'prospect' | 'partner';
  }
  return null;
}

/**
 * Properly parse CSV handling quoted fields and commas within values
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  
  for (const line of lines) {
    if (!line.trim()) continue; // Skip empty lines
    
    const row: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote (double quote)
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator (comma outside quotes)
        row.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    row.push(currentField);
    
    if (row.length > 0) {
      rows.push(row);
    }
  }
  
  return rows;
}
