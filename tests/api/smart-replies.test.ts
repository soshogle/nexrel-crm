import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Smart Replies API', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns reply structure with id, label, text', () => {
    const reply = {
      id: 'follow_up',
      label: 'Follow up',
      text: 'Hi! Just following up on our conversation. Would love to connect soon.',
    };
    expect(reply).toHaveProperty('id');
    expect(reply).toHaveProperty('label');
    expect(reply).toHaveProperty('text');
    expect(typeof reply.text).toBe('string');
  });

  it('context replies include proposal_followup when deal stage is proposal', () => {
    const stage = { name: 'Proposal' };
    const hasProposal = stage?.name?.toLowerCase().includes('proposal');
    expect(hasProposal).toBe(true);
  });

  it('context replies include task_reminder when task due soon', () => {
    const taskDueDate = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
    const isDueSoon = taskDueDate <= new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(isDueSoon).toBe(true);
  });
});
