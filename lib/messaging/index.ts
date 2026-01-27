
// Messaging service factory - abstracts provider selection

import { MessagingProvider } from './types';
import { DemoMessagingProvider } from './providers/demo-provider';

// Future providers will be added here:
// import { GoHighLevelProvider } from './providers/gohighlevel-provider';
// import { TwilioProvider } from './providers/twilio-provider';

export function getMessagingProvider(userId: string): MessagingProvider {
  // For now, use demo provider
  // Later, this can be configured per user or globally
  const providerType = process.env.MESSAGING_PROVIDER || 'demo';
  
  switch (providerType) {
    case 'demo':
      return new DemoMessagingProvider(userId);
    // case 'gohighlevel':
    //   return new GoHighLevelProvider(userId);
    // case 'twilio':
    //   return new TwilioProvider(userId);
    default:
      return new DemoMessagingProvider(userId);
  }
}

export * from './types';
