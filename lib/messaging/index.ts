// Messaging service factory - abstracts provider selection

import { MessagingProvider } from './types';
import { DemoMessagingProvider } from './providers/demo-provider';

// Future providers will be added here:
// import { TwilioProvider } from './providers/twilio-provider';

export function getMessagingProvider(userId: string, industry?: string | null): MessagingProvider {
  const providerType = process.env.MESSAGING_PROVIDER || 'demo';
  switch (providerType) {
    case 'demo':
      return new DemoMessagingProvider(userId, industry);
    default:
      return new DemoMessagingProvider(userId, industry);
  }
}

export * from './types';
