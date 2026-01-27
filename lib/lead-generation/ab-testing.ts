/**
 * A/B Testing Framework
 * 
 * Test email subject lines, body copy, SMS templates, and voice scripts
 * Automatically select winning variants based on performance
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ABTestVariant {
  id: string;
  name: string;
  content: string;
  sendCount: number;
  successCount: number;
  conversionRate: number;
}

export interface ABTest {
  id: string;
  name: string;
  type: 'email_subject' | 'email_body' | 'sms_template' | 'voice_script';
  status: 'active' | 'completed' | 'paused';
  variants: ABTestVariant[];
  winner?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Create new A/B test
 */
export async function createABTest({
  userId,
  name,
  type,
  variants
}: {
  userId: string;
  name: string;
  type: ABTest['type'];
  variants: Array<{ name: string; content: string }>;
}) {
  if (variants.length < 2) {
    throw new Error('A/B test requires at least 2 variants');
  }
  
  const test = await prisma.aBTest.create({
    data: {
      userId,
      name,
      testType: type,
      status: 'ACTIVE',
      variants: {
        create: variants.map((v, index) => ({
          name: v.name,
          content: v.content,
          variantIndex: index
        }))
      }
    },
    include: {
      variants: true
    }
  });
  
  return test;
}

/**
 * Get next variant for a test (round-robin distribution)
 */
export async function getNextVariant(testId: string): Promise<ABTestVariant | null> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: {
        orderBy: {
          sendCount: 'asc'
        }
      }
    }
  });
  
  if (!test || test.status !== 'ACTIVE') {
    return null;
  }
  
  // Return variant with lowest send count (round-robin)
  const variant = test.variants[0];
  
  if (!variant) {
    return null;
  }
  
  return {
    id: variant.id,
    name: variant.name,
    content: variant.content,
    sendCount: variant.sendCount,
    successCount: variant.successCount,
    conversionRate: variant.sendCount > 0 ? (variant.successCount / variant.sendCount) : 0
  };
}

/**
 * Record variant send
 */
export async function recordVariantSend(variantId: string) {
  await prisma.aBTestVariant.update({
    where: { id: variantId },
    data: {
      sendCount: {
        increment: 1
      }
    }
  });
}

/**
 * Record variant success (open, click, reply, etc.)
 */
export async function recordVariantSuccess(variantId: string) {
  await prisma.aBTestVariant.update({
    where: { id: variantId },
    data: {
      successCount: {
        increment: 1
      }
    }
  });
}

/**
 * Analyze test results and determine winner
 */
export async function analyzeTest(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: true
    }
  });
  
  if (!test) {
    throw new Error('Test not found');
  }
  
  // Calculate conversion rates
  const variants = test.variants.map(v => ({
    ...v,
    conversionRate: v.sendCount > 0 ? (v.successCount / v.sendCount) : 0
  }));
  
  // Check if we have enough data (at least 100 sends per variant)
  const minSends = 100;
  const hasEnoughData = variants.every(v => v.sendCount >= minSends);
  
  if (!hasEnoughData) {
    return {
      status: 'insufficient_data',
      message: `Need at least ${minSends} sends per variant`,
      variants
    };
  }
  
  // Find winner (highest conversion rate)
  const winner = variants.reduce((prev, current) => {
    return current.conversionRate > prev.conversionRate ? current : prev;
  });
  
  // Check if winner is statistically significant (at least 10% better)
  const secondBest = variants
    .filter(v => v.id !== winner.id)
    .reduce((prev, current) => {
      return current.conversionRate > prev.conversionRate ? current : prev;
    });
  
  const improvement = ((winner.conversionRate - secondBest.conversionRate) / secondBest.conversionRate) * 100;
  const isSignificant = improvement >= 10;
  
  if (isSignificant) {
    // Mark test as completed and set winner
    await prisma.aBTest.update({
      where: { id: testId },
      data: {
        status: 'COMPLETED',
        winnerId: winner.id,
        completedAt: new Date()
      }
    });
    
    return {
      status: 'completed',
      winner: {
        id: winner.id,
        name: winner.name,
        conversionRate: winner.conversionRate,
        improvement: improvement.toFixed(2) + '%'
      },
      variants
    };
  }
  
  return {
    status: 'no_clear_winner',
    message: 'Variants are performing too similarly',
    variants
  };
}

/**
 * Get active tests
 */
export async function getActiveTests(userId: string) {
  return await prisma.aBTest.findMany({
    where: {
      userId,
      status: 'ACTIVE'
    },
    include: {
      variants: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Get test results
 */
export async function getTestResults(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: true,
      winner: true
    }
  });
  
  if (!test) {
    throw new Error('Test not found');
  }
  
  const variants = test.variants.map(v => ({
    id: v.id,
    name: v.name,
    sendCount: v.sendCount,
    successCount: v.successCount,
    conversionRate: v.sendCount > 0 ? ((v.successCount / v.sendCount) * 100).toFixed(2) + '%' : '0%',
    isWinner: test.winnerId === v.id
  }));
  
  return {
    id: test.id,
    name: test.name,
    type: test.testType,
    status: test.status,
    variants,
    winner: test.winner ? {
      id: test.winner.id,
      name: test.winner.name
    } : null,
    startedAt: test.createdAt,
    completedAt: test.completedAt
  };
}

/**
 * Get winning variants for use in campaigns
 */
export async function getWinningVariants(userId: string, type: ABTest['type']) {
  const completedTests = await prisma.aBTest.findMany({
    where: {
      userId,
      testType: type,
      status: 'COMPLETED',
      winnerId: { not: null }
    },
    include: {
      winner: true
    },
    orderBy: {
      completedAt: 'desc'
    },
    take: 5 // Get last 5 winning variants
  });
  
  return completedTests.map(test => ({
    testName: test.name,
    variant: test.winner ? {
      name: test.winner.name,
      content: test.winner.content,
      conversionRate: test.winner.sendCount > 0 ? ((test.winner.successCount / test.winner.sendCount) * 100).toFixed(2) + '%' : '0%'
    } : null
  }));
}
