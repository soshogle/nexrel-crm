/**
 * AI-powered service to extract structured information from call transcripts
 */

export interface ExtractedCallInfo {
  // Contact Information
  callerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  
  // Appointment Details
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentDateTime?: string;
  
  // Call Context
  callReason?: string;
  callSummary?: string;
  actionItems?: string[];
  followUpNeeded?: boolean;
  
  // Additional Fields
  additionalInfo?: Record<string, string>;
}

export class CallSummaryExtractor {
  /**
   * Extract structured information from a call transcript and AI summary
   */
  static extractInformation(params: {
    transcript?: string;
    summary?: string;
    conversationData?: any;
  }): ExtractedCallInfo {
    const { transcript = '', summary = '', conversationData = {} } = params;
    
    const extracted: ExtractedCallInfo = {};
    const text = `${transcript}\n${summary}`.toLowerCase();
    
    // Extract Email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      extracted.email = emailMatch[0];
    }
    
    // Extract Phone (various formats)
    const phonePatterns = [
      /\b(?:\+?1[-\s.]?)?\(?([0-9]{3})\)?[-\s.]?([0-9]{3})[-\s.]?([0-9]{4})\b/,
      /\b([0-9]{3})[-\s.]([0-9]{3})[-\s.]([0-9]{4})\b/,
      /\b([0-9]{10})\b/
    ];
    
    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern);
      if (phoneMatch) {
        extracted.phone = phoneMatch[0].replace(/[^0-9+]/g, '');
        break;
      }
    }
    
    // Extract Name
    const namePatterns = [
      /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /(?:caller name|customer name|name)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = text.match(pattern);
      if (nameMatch && nameMatch[1]) {
        extracted.callerName = nameMatch[1].trim();
        break;
      }
    }
    
    // Extract Date of Birth
    const dobPatterns = [
      /(?:date of birth|dob|born on|birthday)\s*:?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
      /(?:date of birth|dob)\s*:?\s*([A-Z][a-z]+\s+[0-9]{1,2},?\s+[0-9]{4})/i
    ];
    
    for (const pattern of dobPatterns) {
      const dobMatch = text.match(pattern);
      if (dobMatch && dobMatch[1]) {
        extracted.dateOfBirth = dobMatch[1].trim();
        break;
      }
    }
    
    // Extract Address
    const addressPatterns = [
      /(?:address|live at|located at)\s*:?\s*([0-9]+\s+[A-Za-z0-9\s,]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|boulevard|blvd|court|ct)[^.]*)/i,
      /([0-9]+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*[0-9]{5})/i
    ];
    
    for (const pattern of addressPatterns) {
      const addressMatch = text.match(pattern);
      if (addressMatch && addressMatch[1]) {
        extracted.address = addressMatch[1].trim();
        break;
      }
    }
    
    // Extract Appointment Date & Time
    const appointmentDatePatterns = [
      /(?:appointment|scheduled|booking)(?:\s+(?:for|on|at))?\s*:?\s*([A-Z][a-z]+day,?\s+[A-Z][a-z]+\s+[0-9]{1,2},?\s+[0-9]{4})/i,
      /(?:appointment|scheduled|booking)(?:\s+(?:for|on|at))?\s*:?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
      /(?:on|for)\s+([A-Z][a-z]+day)\s+at\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|AM|PM))/i
    ];
    
    const appointmentTimePatterns = [
      /(?:at|@)\s*([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm|AM|PM))/i,
      /([0-9]{1,2}:[0-9]{2}\s*(?:am|pm|AM|PM))/i
    ];
    
    for (const pattern of appointmentDatePatterns) {
      const dateMatch = text.match(pattern);
      if (dateMatch && dateMatch[1]) {
        extracted.appointmentDate = dateMatch[1].trim();
        break;
      }
    }
    
    for (const pattern of appointmentTimePatterns) {
      const timeMatch = text.match(pattern);
      if (timeMatch && timeMatch[1]) {
        extracted.appointmentTime = timeMatch[1].trim();
        break;
      }
    }
    
    // Combine date and time if both present
    if (extracted.appointmentDate && extracted.appointmentTime) {
      extracted.appointmentDateTime = `${extracted.appointmentDate} at ${extracted.appointmentTime}`;
    }
    
    // Extract Call Reason/Purpose
    const reasonPatterns = [
      /(?:calling about|reason for call|purpose|calling to)\s*:?\s*([^.\n]{10,100}[.!?])/i,
      /(?:i need|i want|i would like)\s+(?:to\s+)?([^.\n]{10,100}[.!?])/i
    ];
    
    for (const pattern of reasonPatterns) {
      const reasonMatch = text.match(pattern);
      if (reasonMatch && reasonMatch[1]) {
        extracted.callReason = reasonMatch[1].trim();
        break;
      }
    }
    
    // Use summary if no specific reason found
    if (!extracted.callReason && summary) {
      const firstSentence = summary.split('.')[0];
      if (firstSentence && firstSentence.length > 20 && firstSentence.length < 200) {
        extracted.callReason = firstSentence + '.';
      }
    }
    
    // Extract Action Items
    extracted.actionItems = [];
    const actionPatterns = [
      /(?:please|i need to|will need to|should|must)\s+([^.\n]{10,80})/gi,
      /(?:follow up|callback|send|email|contact)\s+([^.\n]{10,80})/gi
    ];
    
    for (const pattern of actionPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          extracted.actionItems.push(match[1].trim());
        }
      }
    }
    
    // Limit action items to top 3
    if (extracted.actionItems.length > 3) {
      extracted.actionItems = extracted.actionItems.slice(0, 3);
    }
    
    // Check if follow-up is needed
    const followUpKeywords = ['callback', 'follow up', 'call back', 'will call', 'reach out', 'contact me'];
    extracted.followUpNeeded = followUpKeywords.some(keyword => text.includes(keyword));
    
    // Store call summary
    extracted.callSummary = summary || 'Call completed successfully.';
    
    // Try to extract from ElevenLabs conversation metadata if available
    if (conversationData) {
      if (conversationData.metadata?.customer_name && !extracted.callerName) {
        extracted.callerName = conversationData.metadata.customer_name;
      }
      if (conversationData.metadata?.customer_email && !extracted.email) {
        extracted.email = conversationData.metadata.customer_email;
      }
      if (conversationData.metadata?.customer_phone && !extracted.phone) {
        extracted.phone = conversationData.metadata.customer_phone;
      }
      if (conversationData.analysis?.call_purpose && !extracted.callReason) {
        extracted.callReason = conversationData.analysis.call_purpose;
      }
    }
    
    return extracted;
  }
  
  /**
   * Format extracted information into an HTML summary for email
   */
  static formatAsHTML(info: ExtractedCallInfo): string {
    const sections: string[] = [];
    
    // Contact Information Section
    if (info.callerName || info.email || info.phone || info.address || info.dateOfBirth) {
      const contactItems: string[] = [];
      
      if (info.callerName) {
        contactItems.push(`<div class="summary-item"><span class="summary-label">👤 Name:</span> <span class="summary-value">${info.callerName}</span></div>`);
      }
      if (info.email) {
        contactItems.push(`<div class="summary-item"><span class="summary-label">📧 Email:</span> <span class="summary-value">${info.email}</span></div>`);
      }
      if (info.phone) {
        contactItems.push(`<div class="summary-item"><span class="summary-label">📞 Phone:</span> <span class="summary-value">${info.phone}</span></div>`);
      }
      if (info.dateOfBirth) {
        contactItems.push(`<div class="summary-item"><span class="summary-label">🎂 Date of Birth:</span> <span class="summary-value">${info.dateOfBirth}</span></div>`);
      }
      if (info.address) {
        contactItems.push(`<div class="summary-item"><span class="summary-label">🏠 Address:</span> <span class="summary-value">${info.address}</span></div>`);
      }
      
      sections.push(`
        <div class="summary-section">
          <div class="summary-section-title">📋 Contact Information</div>
          ${contactItems.join('\n')}
        </div>
      `);
    }
    
    // Appointment Information Section
    if (info.appointmentDate || info.appointmentTime || info.appointmentDateTime) {
      const appointmentItems: string[] = [];
      
      if (info.appointmentDateTime) {
        appointmentItems.push(`<div class="summary-item"><span class="summary-label">📅 Appointment:</span> <span class="summary-value highlight">${info.appointmentDateTime}</span></div>`);
      } else {
        if (info.appointmentDate) {
          appointmentItems.push(`<div class="summary-item"><span class="summary-label">📅 Date:</span> <span class="summary-value">${info.appointmentDate}</span></div>`);
        }
        if (info.appointmentTime) {
          appointmentItems.push(`<div class="summary-item"><span class="summary-label">🕐 Time:</span> <span class="summary-value">${info.appointmentTime}</span></div>`);
        }
      }
      
      sections.push(`
        <div class="summary-section appointment-highlight">
          <div class="summary-section-title">🗓️ Appointment Details</div>
          ${appointmentItems.join('\n')}
        </div>
      `);
    }
    
    // Call Purpose Section
    if (info.callReason) {
      sections.push(`
        <div class="summary-section">
          <div class="summary-section-title">💬 Call Purpose</div>
          <div class="summary-item"><span class="summary-value">${info.callReason}</span></div>
        </div>
      `);
    }
    
    // Action Items Section
    if (info.actionItems && info.actionItems.length > 0) {
      const actionsList = info.actionItems.map(item => `<li>${item}</li>`).join('\n');
      sections.push(`
        <div class="summary-section">
          <div class="summary-section-title">✅ Action Items</div>
          <ul class="action-list">
            ${actionsList}
          </ul>
        </div>
      `);
    }
    
    // Follow-up needed indicator
    if (info.followUpNeeded) {
      sections.push(`
        <div class="follow-up-alert">
          <strong>⚠️ Follow-up Required:</strong> Customer requested a callback or follow-up action.
        </div>
      `);
    }
    
    return sections.join('\n');
  }
}
