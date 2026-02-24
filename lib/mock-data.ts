/**
 * Shared mock data for CRM when database is empty.
 * Used across AI Brain, contacts, leads, tasks, and stats APIs.
 */

const MOCK_IDS = {
  lead1: 'mock-lead-1',
  lead2: 'mock-lead-2',
  lead3: 'mock-lead-3',
  lead4: 'mock-lead-4',
  lead5: 'mock-lead-5',
  task1: 'mock-task-1',
  task2: 'mock-task-2',
  task3: 'mock-task-3',
  task4: 'mock-task-4',
  task5: 'mock-task-5',
};

export const MOCK_CONTACTS = [
  {
    id: MOCK_IDS.lead1,
    businessName: 'Acme Corp',
    contactPerson: 'Sarah Johnson',
    email: 'sarah.johnson@acme.com',
    phone: '555-123-4567',
    status: 'QUALIFIED',
    contactType: 'customer',
    tags: ['vip', 'enterprise'],
    lastContactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dateOfBirth: null,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { deals: 2, messages: 5, callLogs: 3 },
  },
  {
    id: MOCK_IDS.lead2,
    businessName: 'TechStart Inc',
    contactPerson: 'Michael Chen',
    email: 'michael@techstart.io',
    phone: '555-234-5678',
    status: 'CONTACTED',
    contactType: 'prospect',
    tags: ['startup'],
    lastContactedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dateOfBirth: null,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { deals: 1, messages: 3, callLogs: 2 },
  },
  {
    id: MOCK_IDS.lead3,
    businessName: 'Global Solutions',
    contactPerson: 'Emily Rodriguez',
    email: 'emily@gsl.com',
    phone: '555-345-6789',
    status: 'NEW',
    contactType: 'prospect',
    tags: [],
    lastContactedAt: null,
    dateOfBirth: null,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { deals: 0, messages: 0, callLogs: 0 },
  },
  {
    id: MOCK_IDS.lead4,
    businessName: 'Summit Partners',
    contactPerson: 'David Kim',
    email: 'david@summitpartners.com',
    phone: '555-456-7890',
    status: 'CONVERTED',
    contactType: 'customer',
    tags: ['partner', 'enterprise'],
    lastContactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dateOfBirth: null,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { deals: 2, messages: 12, callLogs: 8 },
  },
  {
    id: MOCK_IDS.lead5,
    businessName: 'Innovate Labs',
    contactPerson: 'Jessica Martinez',
    email: 'jessica@innovatelabs.com',
    phone: '555-567-8901',
    status: 'QUALIFIED',
    contactType: 'prospect',
    tags: ['hot-lead'],
    lastContactedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dateOfBirth: null,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    _count: { deals: 1, messages: 7, callLogs: 4 },
  },
];

export const MOCK_LEADS = MOCK_CONTACTS.map((c) => ({
  ...c,
  website: null,
  address: null,
  city: null,
  state: null,
  zipCode: null,
  country: null,
  source: 'Website',
  notes: [],
  messages: [],
}));

export const MOCK_TASKS = [
  {
    id: MOCK_IDS.task1,
    title: 'Follow up with Acme Corp',
    description: 'Schedule demo call for next week',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: null,
    lead: { id: MOCK_IDS.lead1, businessName: 'Acme Corp', contactPerson: 'Sarah Johnson', phone: '555-123-4567' },
    deal: null,
    dependsOn: null,
    subtasks: [],
    _count: { comments: 0, attachments: 0, subtasks: 0 },
    category: 'Sales',
    tags: [],
  },
  {
    id: MOCK_IDS.task2,
    title: 'Prepare proposal for TechStart',
    description: 'Create pricing proposal for enterprise plan',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: null,
    lead: { id: MOCK_IDS.lead2, businessName: 'TechStart Inc', contactPerson: 'Michael Chen', phone: '555-234-5678' },
    deal: null,
    dependsOn: null,
    subtasks: [],
    _count: { comments: 2, attachments: 1, subtasks: 0 },
    category: 'Sales',
    tags: [],
  },
  {
    id: MOCK_IDS.task3,
    title: 'Send welcome email to new lead',
    description: 'Welcome Emily from Global Solutions',
    status: 'TODO',
    priority: 'LOW',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: null,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: null,
    lead: { id: MOCK_IDS.lead3, businessName: 'Global Solutions', contactPerson: 'Emily Rodriguez', phone: '555-345-6789' },
    deal: null,
    dependsOn: null,
    subtasks: [],
    _count: { comments: 0, attachments: 0, subtasks: 0 },
    category: 'Marketing',
    tags: [],
  },
  {
    id: MOCK_IDS.task4,
    title: 'Review contract with Summit Partners',
    status: 'REVIEW',
    description: 'Final review before signing',
    priority: 'HIGH',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: null,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: null,
    lead: { id: MOCK_IDS.lead4, businessName: 'Summit Partners', contactPerson: 'David Kim', phone: '555-456-7890' },
    deal: null,
    dependsOn: null,
    subtasks: [],
    _count: { comments: 5, attachments: 3, subtasks: 0 },
    category: 'Sales',
    tags: [],
  },
  {
    id: MOCK_IDS.task5,
    title: 'Schedule product demo',
    description: 'Demo for Innovate Labs team',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: null,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: null,
    lead: { id: MOCK_IDS.lead5, businessName: 'Innovate Labs', contactPerson: 'Jessica Martinez', phone: '555-567-8901' },
    deal: null,
    dependsOn: null,
    subtasks: [],
    _count: { comments: 0, attachments: 0, subtasks: 0 },
    category: 'Sales',
    tags: [],
  },
];

export const MOCK_CONTACT_STATS = {
  total: 5,
  newThisMonth: 2,
  customers: 2,
  prospects: 3,
  partners: 1,
  engagementRate: 72,
};

export const MOCK_TASK_STATS = {
  summary: {
    total: 5,
    completed: 1,
    inProgress: 1,
    overdue: 1,
    completionRate: 20,
  },
};

export const MOCK_CRM_STATISTICS = {
  leads: 5,
  deals: 8,
  openDeals: 5,
  campaigns: 3,
  totalRevenue: 125000,
  recentLeads: MOCK_CONTACTS.slice(0, 5).map((c) => ({
    businessName: c.businessName,
    contactPerson: c.contactPerson,
    status: c.status,
    createdAt: c.createdAt,
  })),
  monthlyRevenue: (() => {
    const now = new Date();
    const m: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      m[k] = Math.random() * 25000 + 15000;
    }
    return m;
  })(),
  chartData: {
    monthlyRevenueChart: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [{ label: 'Revenue', data: [18000, 22000, 19500, 24000, 21000, 23500, 24500], borderColor: 'rgb(139, 92, 246)', backgroundColor: 'rgba(139, 92, 246, 0.1)' }],
    },
    metricsPieChart: {
      labels: ['Leads', 'Deals', 'Open Deals', 'Campaigns'],
      datasets: [{ label: 'CRM Metrics', data: [5, 8, 5, 3], backgroundColor: ['rgba(139, 92, 246, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)'] }],
    },
    metricsBarChart: {
      labels: ['Leads', 'Deals', 'Open Deals', 'Campaigns'],
      datasets: [{ label: 'Count', data: [5, 8, 5, 3], backgroundColor: 'rgba(139, 92, 246, 0.8)' }],
    },
  },
};

export const MOCK_AI_BRAIN_COMPREHENSIVE = {
  core: {
    overallHealth: 72,
    keyMetrics: {
      totalRevenue: 125000,
      activeLeads: 5,
      openDeals: 5,
      conversionRate: 28,
      customerSatisfaction: 85,
    },
    criticalAlerts: [
      { id: 'a1', title: 'Follow up with overdue leads', severity: 'medium' as const, category: 'Leads' },
      { id: 'a2', title: 'Review pipeline deals', severity: 'low' as const, category: 'Deals' },
    ],
  },
  leftHemisphere: {
    name: 'Current Operations',
    dataPoints: [
      { id: 'dp1', category: 'Sales', subcategory: 'Leads', label: 'Active Leads', value: 5, unit: '', trend: 'up' as const, status: 'healthy' as const },
      { id: 'dp2', category: 'Sales', subcategory: 'Revenue', label: 'Monthly Revenue', value: 21000, unit: 'USD', trend: 'up' as const, status: 'healthy' as const },
      { id: 'dp3', category: 'Deals', subcategory: 'Pipeline', label: 'Open Deals', value: 5, unit: '', trend: 'stable' as const, status: 'healthy' as const },
    ],
    overallHealth: 72,
    criticalAlerts: 1,
    opportunities: 2,
  },
  rightHemisphere: {
    name: 'Future Predictions',
    dataPoints: [
      { id: 'dp4', category: 'Forecast', subcategory: 'Revenue', label: 'Next Month', value: 24000, unit: 'USD', trend: 'up' as const, status: 'healthy' as const },
      { id: 'dp5', category: 'Forecast', subcategory: 'Leads', label: 'Expected New', value: 8, unit: '', trend: 'up' as const, status: 'healthy' as const },
    ],
    overallHealth: 75,
    criticalAlerts: 0,
    opportunities: 0,
  },
  connections: [
    { from: 'Leads', to: 'Deals', strength: 0.8, type: 'conversion' },
    { from: 'Deals', to: 'Revenue', strength: 0.9, type: 'revenue' },
  ],
};

export const MOCK_INSIGHTS = [
  { id: 'i1', type: 'opportunity' as const, priority: 'high' as const, title: 'Active pipeline', description: 'You have 5 qualified leads in your pipeline. Follow up this week to accelerate conversions.', impact: 'high', confidence: 85, actionable: true, suggestedActions: ['Schedule follow-up calls', 'Send nurture emails'], affectedEntities: { leads: 5, deals: 3 }, timestamp: new Date().toISOString() },
  { id: 'i2', type: 'trend' as const, priority: 'medium' as const, title: 'Revenue growth', description: 'Revenue is trending up 12% month over month. Consider scaling outreach.', impact: 'medium', confidence: 78, actionable: true, suggestedActions: ['Increase marketing budget', 'Hire additional sales rep'], timestamp: new Date().toISOString() },
  { id: 'i3', type: 'action' as const, priority: 'high' as const, title: 'Overdue task', description: '1 task is overdue. Review and reschedule or complete.', impact: 'medium', confidence: 100, actionable: true, suggestedActions: ['Complete overdue task', 'Update due dates'], affectedEntities: { tasks: 1 }, timestamp: new Date().toISOString() },
];

export const MOCK_PREDICTIONS = {
  nextWeekForecast: { newLeads: { predicted: 3, confidence: 72 }, dealConversions: { predicted: 2, confidence: 68 }, revenue: { predicted: 18500, confidence: 75, currency: 'USD' } },
  nextMonthForecast: { newLeads: { predicted: 12, confidence: 70 }, dealConversions: { predicted: 4, confidence: 65 }, revenue: { predicted: 24000, confidence: 72, currency: 'USD' } },
  growthTrend: 'steady' as const,
  seasonalPatterns: ['Q4 typically stronger', 'Summer slowdown expected'],
};

export const MOCK_WORKFLOW_RECOMMENDATIONS = [
  { id: 'w1', name: 'Lead follow-up automation', description: 'Automatically send follow-up emails 3 days after initial contact', trigger: 'When lead status is CONTACTED', actions: ['Send email', 'Create task', 'Update lead status'], expectedImpact: 'Increase conversion by 15%', automatable: true, priority: 'high' as const },
  { id: 'w2', name: 'Deal stage notifications', description: 'Notify team when deals move to negotiation stage', trigger: 'When deal stage changes to Negotiation', actions: ['Send Slack notification', 'Create reminder task'], expectedImpact: 'Faster deal closure', automatable: true, priority: 'medium' as const },
  { id: 'w3', name: 'Overdue task escalation', description: 'Escalate overdue tasks after 2 days', trigger: 'When task is 2 days overdue', actions: ['Send reminder', 'Assign to manager'], expectedImpact: 'Reduce overdue tasks', automatable: true, priority: 'high' as const },
];
