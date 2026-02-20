/**
 * API Tests for /api/leads
 * Tests GET (list/filter) and POST (create) endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/leads/route';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

vi.mock('next-auth');
vi.mock('@/lib/crm-event-emitter', () => ({
  emitCRMEvent: vi.fn(),
}));

describe('Leads API', () => {
  const mockSession = { user: { id: 'user-1' } };

  const mockLead = {
    id: 'lead-1',
    contactPerson: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    company: 'Acme Corp',
    status: 'NEW',
    source: 'WEBSITE',
    score: 75,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  describe('GET /api/leads', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);
      const req = new NextRequest('http://localhost:3000/api/leads');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns leads for authenticated user', async () => {
      (prisma.lead.findMany as any).mockResolvedValue([mockLead]);
      const req = new NextRequest('http://localhost:3000/api/leads');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.leads).toBeDefined();
    });

    it('filters leads by status query param', async () => {
      (prisma.lead.findMany as any).mockResolvedValue([mockLead]);
      const req = new NextRequest('http://localhost:3000/api/leads?status=NEW');
      await GET(req);
      expect(prisma.lead.findMany).toHaveBeenCalled();
    });
  });

  describe('POST /api/leads', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);
      const req = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify({ contactPerson: 'Jane' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('creates a lead with valid data', async () => {
      (prisma.lead.create as any).mockResolvedValue(mockLead);
      const req = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          contactPerson: 'John Doe',
          email: 'john@example.com',
          company: 'Acme Corp',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(prisma.lead.create).toHaveBeenCalled();
    });
  });
});
