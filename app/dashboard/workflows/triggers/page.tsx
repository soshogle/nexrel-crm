/**
 * Workflow Triggers View Page
 * Shows all workflow triggers organized by category
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Zap, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Eye, 
  Clock,
  TrendingUp,
  FileText,
  MessageSquare,
  Calendar,
  Tag,
  Search,
  Filter
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  status: string;
  industry: string;
  createdAt: string;
}

const TRIGGER_CATEGORIES = {
  website: {
    label: 'Website',
    icon: FileText,
    triggers: [
      'WEBSITE_VISITOR',
      'WEBSITE_FORM_SUBMITTED',
      'WEBSITE_PAYMENT_RECEIVED',
      'WEBSITE_BOOKING_CREATED',
      'WEBSITE_CTA_CLICKED',
      'WEBSITE_PAGE_VIEWED',
      'WEBSITE_ORDER_CREATED',
      'WEBSITE_PRODUCT_LOW_STOCK',
      'WEBSITE_PRODUCT_OUT_OF_STOCK',
      'WEBSITE_PRODUCT_BACK_IN_STOCK',
    ],
  },
  payment: {
    label: 'Payment & E-commerce',
    icon: DollarSign,
    triggers: [
      'WEBSITE_PAYMENT_RECEIVED',
      'WEBSITE_PAYMENT_AMOUNT_THRESHOLD',
      'WEBSITE_ORDER_CREATED',
      'WEBSITE_PRODUCT_PURCHASED',
      'WEBSITE_CART_VALUE_THRESHOLD',
      'WEBSITE_REVENUE_MILESTONE',
      'WEBSITE_ORDER_COUNT_MILESTONE',
      'WEBSITE_DAILY_REVENUE_THRESHOLD',
    ],
  },
  customer: {
    label: 'Customer',
    icon: Users,
    triggers: [
      'WEBSITE_CUSTOMER_TIER_CHANGED',
      'WEBSITE_REPEAT_CUSTOMER',
      'WEBSITE_FIRST_TIME_CUSTOMER',
      'WEBSITE_VISITOR_RETURNING',
    ],
  },
  visitor: {
    label: 'Visitor Behavior',
    icon: Eye,
    triggers: [
      'WEBSITE_VISITOR_PAGE_VIEWED',
      'WEBSITE_VISITOR_TIME_ON_SITE',
      'WEBSITE_VISITOR_PAGES_VIEWED',
      'WEBSITE_VISITOR_CTA_CLICKED',
      'WEBSITE_VISITOR_ABANDONED_CART',
    ],
  },
  inventory: {
    label: 'Inventory',
    icon: ShoppingCart,
    triggers: [
      'WEBSITE_PRODUCT_LOW_STOCK',
      'WEBSITE_PRODUCT_OUT_OF_STOCK',
      'WEBSITE_PRODUCT_BACK_IN_STOCK',
    ],
  },
  crm: {
    label: 'CRM',
    icon: MessageSquare,
    triggers: [
      'LEAD_CREATED',
      'LEAD_STATUS_CHANGED',
      'DEAL_CREATED',
      'DEAL_STAGE_CHANGED',
      'DEAL_WON',
      'DEAL_LOST',
      'FORM_SUBMITTED',
      'TAG_ADDED',
      'TAG_REMOVED',
      'APPOINTMENT_BOOKED',
    ],
  },
  communication: {
    label: 'Communication',
    icon: MessageSquare,
    triggers: [
      'EMAIL_OPENED',
      'EMAIL_CLICKED',
      'SMS_REPLIED',
      'MESSAGE_RECEIVED',
      'MESSAGE_WITH_KEYWORDS',
      'AFTER_HOURS_MESSAGE',
      'CONVERSATION_STARTED',
    ],
  },
};

const getTriggerLabel = (triggerType: string) => {
  return triggerType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const getTriggerIcon = (triggerType: string) => {
  if (triggerType.includes('PAYMENT') || triggerType.includes('REVENUE')) return DollarSign;
  if (triggerType.includes('PRODUCT') || triggerType.includes('CART') || triggerType.includes('ORDER')) return ShoppingCart;
  if (triggerType.includes('CUSTOMER') || triggerType.includes('VISITOR')) return Users;
  if (triggerType.includes('PAGE') || triggerType.includes('VIEW')) return Eye;
  if (triggerType.includes('EMAIL') || triggerType.includes('SMS') || triggerType.includes('MESSAGE')) return MessageSquare;
  if (triggerType.includes('APPOINTMENT') || triggerType.includes('BOOKING')) return Calendar;
  if (triggerType.includes('TAG')) return Tag;
  return Zap;
};

export default function WorkflowTriggersPage() {
  const { data: session } = useSession();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (session) {
      fetchWorkflows();
    }
  }, [session]);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group workflows by trigger type
  const workflowsByTrigger = workflows.reduce((acc, workflow) => {
    const triggerType = workflow.triggerType;
    if (!acc[triggerType]) {
      acc[triggerType] = [];
    }
    acc[triggerType].push(workflow);
    return acc;
  }, {} as Record<string, Workflow[]>);

  // Filter workflows based on search and category
  const filteredTriggers = Object.entries(workflowsByTrigger).filter(([triggerType]) => {
    const matchesSearch = getTriggerLabel(triggerType)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'all') {
      return matchesSearch;
    }
    
    const category = TRIGGER_CATEGORIES[selectedCategory as keyof typeof TRIGGER_CATEGORIES];
    const matchesCategory = category?.triggers.includes(triggerType);
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Triggers</h1>
          <p className="text-gray-600 mt-2">
            View all workflow triggers organized by category
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search triggers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.entries(TRIGGER_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                <Icon className="h-4 w-4" />
                {category.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4 mt-6">
          {filteredTriggers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No triggers found</h3>
                <p className="text-gray-600 text-center">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'No workflows with this trigger type yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTriggers.map(([triggerType, workflows]) => {
                const Icon = getTriggerIcon(triggerType);
                return (
                  <Card key={triggerType}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-lg">
                          {getTriggerLabel(triggerType)}
                        </CardTitle>
                      </div>
                      <CardDescription>
                        {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} using this trigger
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {workflows.map((workflow) => (
                          <div
                            key={workflow.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{workflow.name}</p>
                              <p className="text-xs text-gray-500">{workflow.industry}</p>
                            </div>
                            <Badge
                              variant={
                                workflow.status === 'ACTIVE'
                                  ? 'default'
                                  : workflow.status === 'PAUSED'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {workflow.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
