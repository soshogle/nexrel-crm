
/**
 * Voice Conversation AI Engine
 * Handles conversation logic, intent detection, and response generation
 */

interface ConversationContext {
  voiceAgent: any;
  conversationHistory: Array<{ role: string; content: string }>;
  currentIntent?: string;
  collectedData: {
    name?: string;
    phone?: string;
    email?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    purpose?: string;
  };
}

export class VoiceConversationEngine {
  /**
   * Process user input and generate AI response
   */
  async processUserInput(
    userInput: string,
    context: ConversationContext
  ): Promise<{
    response: string;
    intent: string;
    shouldTransfer: boolean;
    shouldBookAppointment: boolean;
    shouldEnd: boolean;
    updatedContext: ConversationContext;
  }> {
    // Add user input to conversation history
    context.conversationHistory.push({
      role: 'user',
      content: userInput,
    });

    // Prepare system prompt with business context
    const systemPrompt = this.buildSystemPrompt(context.voiceAgent);

    // Build messages for LLM
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
    ];

    // Call LLM API
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('LLM API call failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add AI response to history
    context.conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
    });

    // Detect intent and extract data
    const intent = await this.detectIntent(userInput, context);
    const extractedData = await this.extractData(userInput, context);

    // Update collected data
    context.collectedData = {
      ...context.collectedData,
      ...extractedData,
    };

    // Determine actions
    const shouldBookAppointment =
      intent === 'book_appointment' &&
      !!context.collectedData.name &&
      !!context.collectedData.phone &&
      !!context.collectedData.appointmentDate;

    const shouldTransfer = intent === 'transfer_to_human';
    const shouldEnd = intent === 'end_call' || aiResponse.toLowerCase().includes('goodbye');

    return {
      response: aiResponse,
      intent,
      shouldTransfer,
      shouldBookAppointment,
      shouldEnd,
      updatedContext: context,
    };
  }

  /**
   * Build system prompt with business context
   */
  private buildSystemPrompt(voiceAgent: any): string {
    const knowledgeBase = voiceAgent.knowledgeBase || 'No specific knowledge base provided.';
    const businessName = voiceAgent.businessName;
    const industry = voiceAgent.businessIndustry || 'general business';

    return `You are an AI receptionist for ${businessName}, a ${industry} business.

Your responsibilities:
1. Greet callers warmly and professionally
2. Answer questions about the business using the knowledge base
3. Collect caller information (name, phone, email)
4. Help schedule appointments if requested
5. Transfer to a human if needed

Knowledge Base:
${knowledgeBase}

Greeting Message:
${voiceAgent.greetingMessage || `Thank you for calling ${businessName}. How can I help you today?`}

Instructions:
- Keep responses brief and natural (1-2 sentences)
- Be friendly but professional
- Ask clarifying questions when needed
- Confirm information back to the caller
- If you don't know something, offer to transfer to a human
- For appointment booking, collect: name, phone, preferred date/time
- Always be helpful and courteous

Remember: You are speaking to someone on the phone, so keep it conversational and concise.`;
  }

  /**
   * Detect user intent
   */
  private async detectIntent(
    userInput: string,
    context: ConversationContext
  ): Promise<string> {
    const lower = userInput.toLowerCase();

    // Simple rule-based intent detection
    if (
      lower.includes('book') ||
      lower.includes('appointment') ||
      lower.includes('schedule')
    ) {
      return 'book_appointment';
    }

    if (
      lower.includes('transfer') ||
      lower.includes('speak to someone') ||
      lower.includes('human') ||
      lower.includes('person')
    ) {
      return 'transfer_to_human';
    }

    if (
      lower.includes('goodbye') ||
      lower.includes('bye') ||
      lower.includes('thank you')
    ) {
      return 'end_call';
    }

    if (
      lower.includes('hours') ||
      lower.includes('open') ||
      lower.includes('closed')
    ) {
      return 'business_hours';
    }

    if (
      lower.includes('location') ||
      lower.includes('address') ||
      lower.includes('where')
    ) {
      return 'location';
    }

    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
      return 'pricing';
    }

    return 'general_inquiry';
  }

  /**
   * Extract structured data from user input
   */
  private async extractData(
    userInput: string,
    context: ConversationContext
  ): Promise<Partial<ConversationContext['collectedData']>> {
    const extracted: Partial<ConversationContext['collectedData']> = {};

    // Extract name (simple pattern matching)
    const nameMatch = userInput.match(/(?:my name is|i'm|i am)\s+([a-z\s]+)/i);
    if (nameMatch) {
      extracted.name = nameMatch[1].trim();
    }

    // Extract phone number
    const phoneMatch = userInput.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/);
    if (phoneMatch) {
      extracted.phone = phoneMatch[1].replace(/[-.\s]/g, '');
    }

    // Extract email
    const emailMatch = userInput.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      extracted.email = emailMatch[1];
    }

    // Extract dates (simple patterns)
    const datePatterns = [
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(tomorrow|today|next week)\b/i,
      /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
    ];

    for (const pattern of datePatterns) {
      const dateMatch = userInput.match(pattern);
      if (dateMatch) {
        extracted.appointmentDate = dateMatch[1];
        break;
      }
    }

    // Extract time
    const timeMatch = userInput.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\b/);
    if (timeMatch) {
      extracted.appointmentTime = timeMatch[1];
    }

    return extracted;
  }

  /**
   * Generate greeting message for new call
   */
  generateGreeting(voiceAgent: any): string {
    return (
      voiceAgent.greetingMessage ||
      `Thank you for calling ${voiceAgent.businessName}. How can I help you today?`
    );
  }
}

export const voiceConversationEngine = new VoiceConversationEngine();
