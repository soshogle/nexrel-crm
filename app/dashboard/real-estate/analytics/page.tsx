'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  Users,
  Phone,
  AlertTriangle,
  Target,
  Zap,
  Clock,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Calendar,
  DollarSign,
  Home,
  UserCheck,
  UserX,
  HandshakeIcon,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Mail,
  CheckCircle2,
  XCircle,
  Timer,
  Award,
  Star,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

// Types
interface PriorityContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  type: 'buyer' | 'seller' | 'both';
  reason: string;
  lastContact: string;
  timeline: string;
  suggestedAction: string;
  callScript: string;
  signals: string[];
}

interface ClosingPrediction {
  period: '30' | '60' | '90';
  probability: number;
  deals: number;
  revenue: number;
  contacts: { name: string; type: string; probability: number }[];
}

interface AtRiskItem {
  id: string;
  type: 'listing' | 'buyer' | 'deal';
  name: string;
  address?: string;
  reason: string;
  daysInactive: number;
  riskLevel: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

interface ReferralOpportunity {
  id: string;
  name: string;
  closedDate: string;
  satisfaction: number;
  lastContact: string;
  reason: string;
}

export default function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [priorityContacts, setPriorityContacts] = useState<PriorityContact[]>([]);
  const [closingPredictions, setClosingPredictions] = useState<ClosingPrediction[]>([]);
  const [atRiskItems, setAtRiskItems] = useState<AtRiskItem[]>([]);
  const [referralOpportunities, setReferralOpportunities] = useState<ReferralOpportunity[]>([]);
  const [selectedContact, setSelectedContact] = useState<PriorityContact | null>(null);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalyticsData = async () => {
    setRefreshing(true);
    try {
      // Fetch priority contacts
      const contactsRes = await fetch('/api/real-estate/analytics/priority-contacts');
      const contactsData = contactsRes.ok ? await contactsRes.json() : { contacts: [] };
      setPriorityContacts(contactsData.contacts || []);

      // Fetch closing predictions
      const predictorRes = await fetch('/api/real-estate/analytics/closing-predictor');
      const predictorData = predictorRes.ok ? await predictorRes.json() : { predictions: [] };
      setClosingPredictions(predictorData.predictions || []);

      // Fetch at-risk items
      const riskRes = await fetch('/api/real-estate/analytics/at-risk');
      const riskData = riskRes.ok ? await riskRes.json() : { items: [] };
      setAtRiskItems(riskData.items || []);

      // Fetch referral opportunities
      const referralRes = await fetch('/api/real-estate/analytics/reengaging');
      const referralData = referralRes.ok ? await referralRes.json() : { contacts: [], referrals: [] };
      setReferralOpportunities(referralData.referrals || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchAnalyticsData();
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/30 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  // Calculate daily action summary
  const dailySummary = {
    calls: priorityContacts.length,
    followUps: atRiskItems.filter(i => i.type === 'buyer').length,
    listingCheckIns: atRiskItems.filter(i => i.type === 'listing').length,
    referralAsks: referralOpportunities.length,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100';
    if (score >= 60) return 'text-violet-600 bg-violet-100';
    if (score >= 40) return 'text-amber-600 bg-amber-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getRiskColor = (level: string) => {
    if (level === 'high') return 'text-red-600 bg-red-100 border-red-200';
    if (level === 'medium') return 'text-amber-600 bg-amber-100 border-amber-200';
    return 'text-emerald-600 bg-emerald-100 border-emerald-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/20 to-white">
      {/* Subtle animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-100/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/25">
                <Brain className="w-8 h-8 text-white" />
              </div>
              AI Priority Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Your daily intelligence briefing — who to call, what&apos;s at risk, where to focus</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => fetchAnalyticsData()}
              disabled={refreshing}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/dashboard/real-estate">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25">
                Command Center
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Daily Action Summary Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-0 shadow-xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-white font-semibold">Today&apos;s Priority Actions</span>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{dailySummary.calls}</p>
                      <p className="text-gray-400 text-xs">Calls</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <UserX className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{dailySummary.followUps}</p>
                      <p className="text-gray-400 text-xs">Follow-ups</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Home className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{dailySummary.listingCheckIns}</p>
                      <p className="text-gray-400 text-xs">Listing Check-ins</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Award className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{dailySummary.referralAsks}</p>
                      <p className="text-gray-400 text-xs">Referral Asks</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Priority Contacts */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Top 5 Priority Contacts */}
            <Card className="bg-white border border-gray-200 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Top 5 Contacts to Call Today
                </CardTitle>
                <CardDescription className="text-violet-100">
                  AI-scored based on likelihood to transact in next 90 days
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-600"></div>
                  </div>
                ) : priorityContacts.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No priority contacts yet</p>
                    <p className="text-gray-400 text-sm mt-1">Add contacts with RE industry tags to see AI recommendations</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {priorityContacts.slice(0, 5).map((contact, index) => (
                      <motion.div
                        key={contact.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 hover:bg-violet-50/50 transition-colors cursor-pointer ${
                          selectedContact?.id === contact.id ? 'bg-violet-50' : ''
                        }`}
                        onClick={() => setSelectedContact(selectedContact?.id === contact.id ? null : contact)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <Avatar className="w-12 h-12 border-2 border-white shadow">
                                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
                                  {contact.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getScoreColor(contact.score)}`}>
                                {contact.score}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                              <Badge className={`${
                                contact.type === 'seller' ? 'bg-amber-100 text-amber-700' :
                                contact.type === 'buyer' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {contact.type === 'both' ? 'Buyer & Seller' : contact.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{contact.reason}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Last contact: {contact.lastContact}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Timeline: {contact.timeline}
                              </span>
                            </div>
                            {/* Signal badges */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {contact.signals.map((signal, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-white">
                                  {signal}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                            selectedContact?.id === contact.id ? 'rotate-90' : ''
                          }`} />
                        </div>
                        
                        {/* Expanded view with call script */}
                        <AnimatePresence>
                          {selectedContact?.id === contact.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 pt-4 border-t border-gray-100"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-4">
                                  <h5 className="font-semibold text-violet-900 flex items-center gap-2 mb-2">
                                    <Phone className="w-4 h-4" />
                                    Suggested Call Opener
                                  </h5>
                                  <p className="text-sm text-violet-800 italic">"{contact.callScript}"</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4">
                                  <h5 className="font-semibold text-emerald-900 flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4" />
                                    Suggested Next Step
                                  </h5>
                                  <p className="text-sm text-emerald-800">{contact.suggestedAction}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                                  <Phone className="w-4 h-4 mr-1" />
                                  Call Now
                                </Button>
                                <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50">
                                  <Mail className="w-4 h-4 mr-1" />
                                  Send Email
                                </Button>
                                <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50">
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  SMS
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* At Risk Section - Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Listings at Risk */}
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Listings at Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
                      </div>
                    ) : atRiskItems.filter(i => i.type === 'listing').length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No listings at risk</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {atRiskItems.filter(i => i.type === 'listing').map((item) => (
                          <div key={item.id} className="p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{item.address}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                              </div>
                              <Badge className={getRiskColor(item.riskLevel)}>
                                {item.riskLevel}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">{item.daysInactive} days inactive</span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                                Take Action
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Buyers About to Ghost / Deals Falling Apart */}
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                    <UserX className="w-5 h-5 text-red-500" />
                    Buyers Ghosting & Deals at Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-500"></div>
                      </div>
                    ) : atRiskItems.filter(i => i.type === 'buyer' || i.type === 'deal').length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">All buyers engaged, all deals on track</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {atRiskItems.filter(i => i.type === 'buyer' || i.type === 'deal').map((item) => (
                          <div key={item.id} className="p-3 rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {item.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                              </div>
                              <Badge className={getRiskColor(item.riskLevel)}>
                                {item.riskLevel}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">{item.daysInactive} days since activity</span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                                Re-engage
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Right Column - Predictions & Referrals */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Next Closing Predictor */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-0 shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Next Closing Predictor
                </CardTitle>
                <CardDescription className="text-gray-400">
                  AI forecast based on pipeline velocity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-400"></div>
                  </div>
                ) : closingPredictions.length === 0 ? (
                  <div className="text-center py-6">
                    <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Add deals to pipeline to see predictions</p>
                  </div>
                ) : (
                  closingPredictions.map((prediction) => (
                    <div key={prediction.period} className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-300 font-medium">Next {prediction.period} Days</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-white">{prediction.probability}%</span>
                          <span className="text-emerald-400 text-sm">likely</span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <Progress value={prediction.probability} className="h-2 bg-gray-700" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          <span className="text-white font-semibold">{prediction.deals}</span> potential deals
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          ${(prediction.revenue / 1000).toFixed(0)}k revenue
                        </span>
                      </div>
                      {prediction.contacts.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400 mb-2">Top contributors:</p>
                          <div className="space-y-1">
                            {prediction.contacts.slice(0, 3).map((c, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-gray-300">{c.name}</span>
                                <Badge className="bg-violet-500/20 text-violet-300 border-0">
                                  {c.probability}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Referral Opportunities */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Referral Opportunities
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  Past clients ready to refer
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-emerald-500"></div>
                    </div>
                  ) : referralOpportunities.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Past clients will appear here</p>
                      <p className="text-gray-400 text-xs mt-1">Based on satisfaction scores and time since close</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {referralOpportunities.map((referral) => (
                        <div key={referral.id} className="p-4 hover:bg-emerald-50/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                                {referral.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{referral.name}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">{referral.reason}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${star <= referral.satisfaction ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">Closed {referral.closedDate}</span>
                              </div>
                            </div>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                              Ask
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-violet-600 to-purple-700 border-0 shadow-xl">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{priorityContacts.length}</p>
                    <p className="text-violet-200 text-sm">Hot Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{atRiskItems.length}</p>
                    <p className="text-violet-200 text-sm">At Risk</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">
                      {closingPredictions.length > 0 ? closingPredictions[0].deals : 0}
                    </p>
                    <p className="text-violet-200 text-sm">30-Day Deals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{referralOpportunities.length}</p>
                    <p className="text-violet-200 text-sm">Referral Ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
