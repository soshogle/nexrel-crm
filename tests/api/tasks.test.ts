/**
 * API Tests for /api/tasks
 * Tests GET (list/filter) and POST (create) endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/tasks/route';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

vi.mock('next-auth');

describe('Tasks API', () => {
  const mockSession = { user: { id: 'user-1' } };

  const mockTask = {
    id: 'task-1',
    title: 'Follow up with client',
    description: 'Send proposal by EOD',
    status: 'TODO',
    priority: 'HIGH',
    userId: 'user-1',
    dueDate: new Date('2026-03-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  describe('GET /api/tasks', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);
      const req = new NextRequest('http://localhost:3000/api/tasks');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns tasks for authenticated user', async () => {
      (prisma.task.findMany as any).mockResolvedValue([mockTask]);
      const req = new NextRequest('http://localhost:3000/api/tasks');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toBeDefined();
    });

    it('filters tasks by status', async () => {
      (prisma.task.findMany as any).mockResolvedValue([mockTask]);
      const req = new NextRequest('http://localhost:3000/api/tasks?status=TODO');
      await GET(req);
      expect(prisma.task.findMany).toHaveBeenCalled();
    });

    it('filters tasks by priority', async () => {
      (prisma.task.findMany as any).mockResolvedValue([mockTask]);
      const req = new NextRequest('http://localhost:3000/api/tasks?priority=HIGH');
      await GET(req);
      expect(prisma.task.findMany).toHaveBeenCalled();
    });
  });

  describe('POST /api/tasks', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as any).mockResolvedValue(null);
      const req = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'New task' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('creates a task with valid data', async () => {
      (prisma.task.create as any).mockResolvedValue(mockTask);
      const req = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Follow up with client',
          description: 'Send proposal by EOD',
          priority: 'HIGH',
          dueDate: '2026-03-01',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(prisma.task.create).toHaveBeenCalled();
    });

    it('rejects task creation without title', async () => {
      const req = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ description: 'No title' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
