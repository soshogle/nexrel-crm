/**
 * Test Setup File
 * Configures test environment and mocks
 */

import { vi } from 'vitest';
import dotenv from 'dotenv';

// Set DATABASE_URL for tests (required by Prisma)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test?schema=public';
// NODE_ENV is set by test runner, don't override it

// Load environment variables
dotenv.config({ path: '.env.test' });

// Mock @prisma/client before any imports to prevent initialization
vi.mock('@prisma/client', () => {
  const mockPrismaClient = vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }));

  return {
    PrismaClient: mockPrismaClient,
    Prisma: {},
    // Mock enums as objects
    Industry: {},
    TaskExecutionStatus: {},
    WorkflowInstanceStatus: {},
    // Mock types (these are type-only, so empty objects work)
    WorkflowTask: {} as any,
    WorkflowInstance: {} as any,
    REWorkflowTask: {} as any,
    REWorkflowInstance: {} as any,
  };
});

// Mock Prisma Client
vi.mock('@/lib/db', () => {
  const mockPrisma = {
    workflowTemplate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workflowTask: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    workflowInstance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    taskExecution: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    rEWorkflowTemplate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    rEWorkflowTask: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    rEWorkflowInstance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    rETaskExecution: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    rEHITLNotification: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    lead: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    bookingAppointment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    hITLNotification: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    callLog: {
      create: vi.fn(),
    },
    rEAIEmployeeAgent: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    rEListingPresentation: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    rEMarketResearch: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    calendarConnection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    pipeline: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
  
  return {
    prisma: mockPrisma,
  };
});

// Mock external services
vi.mock('@/lib/twilio', () => ({
  sendSMS: vi.fn().mockResolvedValue({ sid: 'test-sid', status: 'sent' }),
}));

vi.mock('@/lib/email-service', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('@/lib/calendar/calendar-service', () => ({
  CalendarService: vi.fn().mockImplementation(() => ({
    createEvent: vi.fn().mockResolvedValue({ id: 'test-event-id' }),
  })),
}));

vi.mock('@/lib/elevenlabs', () => ({
  elevenLabsService: {
    initiatePhoneCall: vi.fn().mockResolvedValue({
      conversation_id: 'test-conv-id',
      call_id: 'test-call-id',
    }),
  },
}));

vi.mock('@/lib/data-enrichment-service', () => ({
  DataEnrichmentService: vi.fn().mockImplementation(() => ({
    enrichLead: vi.fn().mockResolvedValue({
      success: true,
      data: { email: 'test@example.com' },
      source: 'api',
      cached: false,
    }),
  })),
}));

// Mock Real Estate specific modules
vi.mock('@/lib/real-estate/cma', () => ({
  generateCMA: vi.fn().mockResolvedValue({
    id: 'cma-1',
    suggestedPrice: 500000,
    priceRange: { min: 450000, max: 550000 },
    comparables: [],
  }),
}));

vi.mock('@/lib/real-estate/presentation', () => ({
  generatePresentation: vi.fn().mockResolvedValue({
    id: 'presentation-1',
    slides: [],
  }),
}));

vi.mock('@/lib/real-estate/market-research', () => ({
  generateMarketResearch: vi.fn().mockResolvedValue({
    id: 'research-1',
    report: {},
  }),
}));

// Mock fetch for API calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({
    id: 'test-id',
    report: { id: 'report-1', title: 'Test Report', opportunities: [] },
  }),
});

// Mock Next.js modules
vi.mock('next-auth', () => ({
  getServerSession: vi.fn((options) => {
    // Return a promise that resolves to a session
    return Promise.resolve({
      user: { id: 'user-1' },
    });
  }),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/workflows/industry-configs', () => ({
  getIndustryConfig: vi.fn((industry) => {
    if (industry === 'MEDICAL') {
      return {
        taskTypes: [],
        aiAgents: [],
        templates: [],
        fieldLabels: {},
        integrations: {},
      };
    }
    return null;
  }),
}));

vi.mock('next/server', () => ({
  NextRequest: class MockRequest {
    url = 'http://localhost:3000';
    json = vi.fn();
  },
  NextResponse: {
    json: vi.fn((data, init) => {
      const status = init?.status || 200;
      // Return a Response-like object that has a .json() method
      return {
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        ok: status >= 200 && status < 300,
        json: vi.fn().mockResolvedValue(data),
        text: vi.fn().mockResolvedValue(JSON.stringify(data)),
        headers: new Headers(),
      };
    }),
  },
}));
