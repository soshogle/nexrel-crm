'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Star,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Plus,
  RefreshCw,
  Loader2,
  Sparkles,
  Shield,
  MessageSquare,
  Send,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Eye,
  Bot,
  Pencil,
  Globe,
  Radar,
  Newspaper,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import CreateReviewDialog from './create-review-dialog';

interface Review {
  id: string;
  rating: number;
  reviewText: string | null;
  reviewUrl: string | null;
  reviewerName: string | null;
  source: string;
  isPublic: boolean;
  sentiment: string | null;
  sentimentScore: number | null;
  themes: string[] | null;
  aiSummary: string | null;
  aiResponseDraft: string | null;
  aiResponseStatus: string | null;
  ownerResponse: string | null;
  respondedAt: string | null;
  ownerScore: number | null;
  ownerNotes: string | null;
  isFlagged: boolean;
  createdAt: string;
  lead: { id: string; name: string; businessName: string; contactPerson: string | null; email: string | null } | null;
  campaign: { id: string; name: string } | null;
}

interface BrandInsights {
  overallSentiment: string;
  satisfactionScore: number;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  platformBreakdown: Record<string, number>;
  topStrengths: string[];
  topWeaknesses: string[];
  commonThemes: { theme: string; count: number; sentiment: string }[];
  trendDirection: string;
  recentVsPastRating: { recent: number; past: number };
  responseRate: number;
  recommendations: string[];
  webMentions?: {
    total: number;
    sourceBreakdown: Record<string, number>;
    sentimentBreakdown: Record<string, number>;
    recentMentions: {
      source: string;
      title: string | null;
      snippet: string;
      sourceUrl: string | null;
      sentiment: string | null;
      sentimentScore: number | null;
      themes: string[];
      publishedAt: string | null;
      createdAt: string;
    }[];
    topMentionThemes: { theme: string; count: number; sentiment: string }[];
    overallWebSentiment: string;
    overallWebSentimentScore: number;
  };
  lastScanAt?: string | null;
}

const SOURCE_COLORS: Record<string, string> = {
  GOOGLE: 'bg-blue-100 text-blue-700 border-blue-200',
  FACEBOOK: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  YELP: 'bg-red-100 text-red-700 border-red-200',
  TRUSTPILOT: 'bg-green-100 text-green-700 border-green-200',
  INSTAGRAM: 'bg-pink-100 text-pink-700 border-pink-200',
  LINKEDIN: 'bg-sky-100 text-sky-700 border-sky-200',
  TWITTER: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  ZILLOW: 'bg-blue-100 text-blue-800 border-blue-200',
  REALTOR_COM: 'bg-red-100 text-red-800 border-red-200',
  HEALTHGRADES: 'bg-teal-100 text-teal-700 border-teal-200',
  BBB: 'bg-amber-100 text-amber-700 border-amber-200',
  INTERNAL: 'bg-gray-100 text-gray-700 border-gray-200',
};

const ALL_SOURCES = [
  'GOOGLE', 'FACEBOOK', 'YELP', 'TRUSTPILOT', 'INSTAGRAM', 'LINKEDIN',
  'TWITTER', 'BBB', 'ZILLOW', 'REALTOR_COM', 'HEALTHGRADES', 'ZOCDOC',
  'ANGI', 'THUMBTACK', 'INTERNAL', 'OTHER',
];

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const config: Record<string, { icon: typeof ThumbsUp; cls: string }> = {
    POSITIVE: { icon: ThumbsUp, cls: 'bg-green-100 text-green-700 border-green-200' },
    NEGATIVE: { icon: ThumbsDown, cls: 'bg-red-100 text-red-700 border-red-200' },
    NEUTRAL: { icon: Minus, cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    MIXED: { icon: AlertTriangle, cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  };
  const c = config[sentiment] || config.NEUTRAL;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={c.cls}>
      <Icon className="h-3 w-3 mr-1" />
      {sentiment}
    </Badge>
  );
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [insights, setInsights] = useState<BrandInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondDraft, setRespondDraft] = useState('');
  const [generatingResponse, setGeneratingResponse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('reviews');

  // Request review state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestLeadId, setRequestLeadId] = useState('');
  const [requestMethod, setRequestMethod] = useState<'SMS' | 'EMAIL' | 'BOTH'>('SMS');
  const [requestUrl, setRequestUrl] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [leads, setLeads] = useState<{ id: string; name: string; email: string | null; phone: string | null }[]>([]);

  // Brand scan state
  const [scanning, setScanning] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/reviews/analytics');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setInsights(data);
    } catch {
      toast.error('Failed to load insights');
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads?limit=200');
      if (res.ok) {
        const data = await res.json();
        setLeads((data.leads || []).map((l: any) => ({
          id: l.id, name: l.name || l.contactPerson || l.businessName || 'Unknown',
          email: l.email, phone: l.phone,
        })));
      }
    } catch { /* non-critical */ }
  }, []);

  const startBrandScan = useCallback(async () => {
    setScanning(true);
    setScanStatus('RUNNING');
    try {
      const res = await fetch('/api/reviews/brand-scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start scan');
      }
      const data = await res.json();
      setScanId(data.scanId);
      toast.success(`Scanning the web for "${data.businessName}"...`);
      pollScanStatus(data.scanId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start brand scan');
      setScanning(false);
      setScanStatus(null);
    }
  }, []);

  const pollScanStatus = useCallback((id: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/reviews/brand-scan?action=status&id=${id}`);
        if (!res.ok) return;
        const data = await res.json();
        setScanStatus(data.status);
        if (data.status === 'COMPLETED') {
          setScanning(false);
          toast.success(`Scan complete! Found ${data.reviewsFound} reviews and ${data.mentionsFound} web mentions.`);
          fetchInsights();
          fetchReviews();
          return;
        }
        if (data.status === 'FAILED') {
          setScanning(false);
          toast.error('Scan failed: ' + (data.error || 'Unknown error'));
          return;
        }
        setTimeout(poll, 5000);
      } catch {
        setTimeout(poll, 10000);
      }
    };
    setTimeout(poll, 3000);
  }, [fetchInsights, fetchReviews]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  useEffect(() => {
    if (activeTab === 'insights') fetchInsights();
    if (activeTab === 'request') fetchLeads();
  }, [activeTab, fetchInsights, fetchLeads]);

  const generateAIResponse = async (reviewId: string) => {
    setGeneratingResponse(reviewId);
    try {
      const res = await fetch('/api/reviews/auto-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, config: { tone: 'professional' } }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setRespondingId(reviewId);
      setRespondDraft(data.draft);
      toast.success('AI response generated — review and approve');
      fetchReviews();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate response');
    } finally {
      setGeneratingResponse(null);
    }
  };

  const approveResponse = async (reviewId: string, response: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiResponseStatus: 'APPROVED', ownerResponse: response }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Response approved');
      setRespondingId(null);
      fetchReviews();
    } catch {
      toast.error('Failed to approve response');
    }
  };

  const toggleFlag = async (reviewId: string, flagged: boolean) => {
    try {
      await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFlagged: !flagged }),
      });
      fetchReviews();
    } catch {
      toast.error('Failed to update');
    }
  };

  const sendReviewRequest = async () => {
    if (!requestLeadId) { toast.error('Select a customer'); return; }
    setSendingRequest(true);
    try {
      const res = await fetch('/api/reviews/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: requestLeadId,
          method: requestMethod,
          reviewUrl: requestUrl || undefined,
          customMessage: requestMessage || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Review request sent!');
      setRequestDialogOpen(false);
      setRequestLeadId('');
      setRequestMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setSendingRequest(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        r.reviewText?.toLowerCase().includes(q) ||
        r.reviewerName?.toLowerCase().includes(q) ||
        r.lead?.name?.toLowerCase().includes(q) ||
        r.lead?.businessName?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (selectedSource !== 'all' && r.source !== selectedSource) return false;
    if (selectedSentiment !== 'all' && r.sentiment !== selectedSentiment) return false;
    return true;
  });

  const needsResponseCount = reviews.filter((r) => !r.ownerResponse && r.aiResponseStatus !== 'PUBLISHED').length;

  // Stats from reviews
  const total = reviews.length;
  const avgRating = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const recent30 = reviews.filter((r) => new Date(r.createdAt) > new Date(Date.now() - 30 * 86400000)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews & Reputation</h1>
          <p className="text-muted-foreground mt-1">
            Monitor reviews, AI auto-respond, and track your brand reputation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRequestDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Request Review
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Review
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Stars rating={Math.round(avgRating)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recent30}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Response</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{needsResponseCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platforms</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(reviews.map((r) => r.source)).size}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reviews">All Reviews</TabsTrigger>
          <TabsTrigger value="responses">AI Responses ({needsResponseCount})</TabsTrigger>
          <TabsTrigger value="insights">Brand Insights</TabsTrigger>
          <TabsTrigger value="request">Request Reviews</TabsTrigger>
        </TabsList>

        {/* ─── Reviews List Tab ─── */}
        <TabsContent value="reviews" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {ALL_SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sentiment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="POSITIVE">Positive</SelectItem>
                <SelectItem value="NEGATIVE">Negative</SelectItem>
                <SelectItem value="NEUTRAL">Neutral</SelectItem>
                <SelectItem value="MIXED">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchReviews}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-lg mb-1">No reviews found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery || selectedSource !== 'all' ? 'Try adjusting your filters' : 'Start collecting reviews from your customers'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <Card key={review.id} className={review.isFlagged ? 'border-red-300 bg-red-50/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Stars rating={review.rating} />
                          <Badge variant="outline" className={SOURCE_COLORS[review.source] || SOURCE_COLORS.INTERNAL}>
                            {review.source.replace('_', ' ')}
                          </Badge>
                          <SentimentBadge sentiment={review.sentiment} />
                          {review.ownerResponse && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Responded
                            </Badge>
                          )}
                          {review.aiResponseStatus === 'PENDING' && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                              <Clock className="h-3 w-3 mr-1" /> AI Draft Ready
                            </Badge>
                          )}
                        </div>

                        <div className="mb-2">
                          <span className="font-medium text-sm">
                            {review.reviewerName || review.lead?.name || review.lead?.contactPerson || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(new Date(review.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>

                        {review.reviewText && (
                          <p className="text-sm text-foreground/80 mb-2">{review.reviewText}</p>
                        )}

                        {review.themes && (review.themes as string[]).length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-2">
                            {(review.themes as string[]).map((t, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        )}

                        {review.ownerResponse && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-1 mb-1">
                              <MessageSquare className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-700">Your Response</span>
                            </div>
                            <p className="text-sm text-blue-900">{review.ownerResponse}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        {!review.ownerResponse && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={generatingResponse === review.id}
                            onClick={() => generateAIResponse(review.id)}
                          >
                            {generatingResponse === review.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Bot className="h-3.5 w-3.5 mr-1" />
                            )}
                            AI Reply
                          </Button>
                        )}
                        {review.reviewUrl && (
                          <Button size="sm" variant="ghost" onClick={() => window.open(review.reviewUrl!, '_blank')}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleFlag(review.id, review.isFlagged)}
                          className={review.isFlagged ? 'text-red-600' : ''}
                        >
                          <Flag className="h-3.5 w-3.5 mr-1" />
                          {review.isFlagged ? 'Unflag' : 'Flag'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── AI Responses Tab ─── */}
        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Auto-Response Management
              </CardTitle>
              <CardDescription>
                Reviews awaiting your response. Generate AI drafts, review, edit, and approve before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.filter((r) => !r.ownerResponse).length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-3" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground">Every review has been responded to.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.filter((r) => !r.ownerResponse).map((review) => (
                    <div key={review.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Stars rating={review.rating} />
                          <Badge variant="outline" className={SOURCE_COLORS[review.source] || ''}>
                            {review.source}
                          </Badge>
                          <span className="text-sm font-medium">
                            {review.reviewerName || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.createdAt), 'MMM d')}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          disabled={generatingResponse === review.id}
                          onClick={() => generateAIResponse(review.id)}
                        >
                          {generatingResponse === review.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-1" />
                          )}
                          Generate AI Response
                        </Button>
                      </div>
                      {review.reviewText && (
                        <p className="text-sm bg-muted/50 rounded p-3">{review.reviewText}</p>
                      )}
                      {review.aiResponseDraft && (
                        <div className="space-y-2">
                          <Label className="text-xs">AI Draft (edit before approving):</Label>
                          <Textarea
                            defaultValue={review.aiResponseDraft}
                            id={`draft-${review.id}`}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const el = document.getElementById(`draft-${review.id}`) as HTMLTextAreaElement;
                                approveResponse(review.id, el?.value || review.aiResponseDraft!);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve & Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateAIResponse(review.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Brand Insights Tab ─── */}
        <TabsContent value="insights" className="space-y-4">
          {/* Scan the Web Banner */}
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Radar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Scan the Web for Brand Mentions</h3>
                    <p className="text-xs text-muted-foreground">
                      {scanning
                        ? `Scanning... ${scanStatus === 'RUNNING' ? 'Collecting reviews & mentions from across the web' : scanStatus}`
                        : insights?.lastScanAt
                          ? `Last scan: ${format(new Date(insights.lastScanAt), 'MMM d, yyyy h:mm a')}`
                          : 'Scrape Google, Yelp, Trustpilot, Reddit, forums & more for what people say about your brand'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={startBrandScan}
                  disabled={scanning}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {scanning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Globe className="h-4 w-4 mr-2" />
                  )}
                  {scanning ? 'Scanning...' : 'Scan the Web'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {insightsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !insights ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Click the Insights tab to generate your brand report.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Score + Trend */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Customer Satisfaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{insights.satisfactionScore}%</div>
                    <Progress value={insights.satisfactionScore} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Rating Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {insights.trendDirection === 'IMPROVING' ? (
                        <TrendingUp className="h-6 w-6 text-green-500" />
                      ) : insights.trendDirection === 'DECLINING' ? (
                        <TrendingDown className="h-6 w-6 text-red-500" />
                      ) : (
                        <Minus className="h-6 w-6 text-gray-400" />
                      )}
                      <div>
                        <span className="text-2xl font-bold">{insights.recentVsPastRating.recent}</span>
                        <span className="text-sm text-muted-foreground ml-1">recent</span>
                        <span className="text-sm text-muted-foreground mx-1">vs</span>
                        <span className="text-lg font-medium">{insights.recentVsPastRating.past}</span>
                        <span className="text-sm text-muted-foreground ml-1">past</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Response Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{insights.responseRate}%</div>
                    <Progress value={insights.responseRate} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">Google recommends 80%+</p>
                  </CardContent>
                </Card>
              </div>

              {/* Rating Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = insights.ratingDistribution[star] || 0;
                      const pct = insights.totalReviews > 0 ? (count / insights.totalReviews) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-16">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{star}</span>
                          </div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${star >= 4 ? 'bg-green-500' : star === 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground w-16 text-right">{count} ({Math.round(pct)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Weaknesses */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      Top Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {insights.topStrengths.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Not enough data yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {insights.topStrengths.map((s, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                      Areas to Improve
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {insights.topWeaknesses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No concerns identified. Great job!</p>
                    ) : (
                      <ul className="space-y-1">
                        {insights.topWeaknesses.map((w, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Common Themes */}
              {insights.commonThemes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">What Customers Are Saying</CardTitle>
                    <CardDescription>Most frequently mentioned themes across all reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {insights.commonThemes.map((t, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className={
                            t.sentiment === 'POSITIVE' ? 'bg-green-50 border-green-200 text-green-700' :
                            t.sentiment === 'NEGATIVE' ? 'bg-red-50 border-red-200 text-red-700' :
                            'bg-gray-50 border-gray-200 text-gray-700'
                          }
                        >
                          {t.theme} ({t.count})
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Platform Breakdown */}
              {Object.keys(insights.platformBreakdown).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Reviews by Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {Object.entries(insights.platformBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([platform, count]) => (
                          <div key={platform} className="flex items-center justify-between p-2 border rounded">
                            <Badge variant="outline" className={SOURCE_COLORS[platform] || ''}>
                              {platform.replace('_', ' ')}
                            </Badge>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ─── Web Mentions Section ─── */}
              {insights.webMentions && insights.webMentions.total > 0 && (
                <>
                  <div className="pt-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Globe className="h-5 w-5 text-purple-600" />
                      Web Presence & Public Sentiment
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      What people are saying about your brand across the internet
                    </p>
                  </div>

                  {/* Web Sentiment Overview */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Web Mentions Found</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold">{insights.webMentions.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across all sources</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Public Sentiment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <SentimentBadge sentiment={insights.webMentions.overallWebSentiment} />
                          <span className="text-lg font-bold">
                            {insights.webMentions.overallWebSentimentScore > 0 ? '+' : ''}{insights.webMentions.overallWebSentimentScore}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Score from -1.0 to +1.0</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Sentiment Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {Object.entries(insights.webMentions.sentimentBreakdown)
                            .filter(([, count]) => count > 0)
                            .sort((a, b) => b[1] - a[1])
                            .map(([sent, count]) => (
                              <div key={sent} className="flex items-center justify-between text-xs">
                                <SentimentBadge sentiment={sent} />
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Mention Sources Breakdown */}
                  {Object.keys(insights.webMentions.sourceBreakdown).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Newspaper className="h-4 w-4" />
                          Mentions by Source
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 sm:grid-cols-4">
                          {Object.entries(insights.webMentions.sourceBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .map(([src, count]) => (
                              <div key={src} className="flex items-center justify-between p-2 border rounded">
                                <Badge variant="outline" className={SOURCE_COLORS[src] || 'bg-purple-50 border-purple-200 text-purple-700'}>
                                  {src.replace('_', ' ')}
                                </Badge>
                                <span className="font-medium text-sm">{count}</span>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Web Mention Themes */}
                  {insights.webMentions.topMentionThemes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Trending Topics About Your Brand
                        </CardTitle>
                        <CardDescription>Themes people mention most across the web</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {insights.webMentions.topMentionThemes.map((t, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className={
                                t.sentiment === 'POSITIVE' ? 'bg-green-50 border-green-200 text-green-700' :
                                t.sentiment === 'NEGATIVE' ? 'bg-red-50 border-red-200 text-red-700' :
                                'bg-gray-50 border-gray-200 text-gray-700'
                              }
                            >
                              {t.theme} ({t.count})
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Web Mentions Feed */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="h-4 w-4 text-purple-600" />
                        Recent Web Mentions
                      </CardTitle>
                      <CardDescription>Latest mentions of your brand found online</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[500px]">
                        <div className="space-y-3">
                          {insights.webMentions.recentMentions.map((m, i) => (
                            <div key={i} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={SOURCE_COLORS[m.source] || 'bg-purple-50 border-purple-200 text-purple-700'}>
                                  {m.source.replace('_', ' ')}
                                </Badge>
                                <SentimentBadge sentiment={m.sentiment} />
                                {m.publishedAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(m.publishedAt), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                              {m.title && (
                                <h4 className="font-medium text-sm">{m.title}</h4>
                              )}
                              <p className="text-sm text-foreground/80">{m.snippet}</p>
                              {m.themes.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {m.themes.slice(0, 5).map((t, ti) => (
                                    <Badge key={ti} variant="secondary" className="text-xs">{t}</Badge>
                                  ))}
                                </div>
                              )}
                              {m.sourceUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => window.open(m.sourceUrl!, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" /> View Source
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* AI Recommendations */}
              {insights.recommendations.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                            {i + 1}
                          </span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" onClick={fetchInsights} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh Brand Insights
              </Button>
            </>
          )}
        </TabsContent>

        {/* ─── Request Reviews Tab ─── */}
        <TabsContent value="request" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Request Reviews from Customers
              </CardTitle>
              <CardDescription>
                Send personalized review requests via SMS or email to satisfied clients.
                You can also automate this through Workflows with the &quot;Request Review&quot; action.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select Customer</Label>
                  <Select value={requestLeadId} onValueChange={setRequestLeadId}>
                    <SelectTrigger><SelectValue placeholder="Choose a customer..." /></SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-60">
                        {leads.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name} {l.email ? `(${l.email})` : ''}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Send Via</Label>
                  <Select value={requestMethod} onValueChange={(v) => setRequestMethod(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="BOTH">Both SMS & Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Review Link (optional)</Label>
                <Input
                  placeholder="https://g.page/your-business/review"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Direct link to your Google, Yelp, or other review page</p>
              </div>
              <div className="space-y-2">
                <Label>Custom Message (optional)</Label>
                <Textarea
                  placeholder="Leave blank for a friendly default message..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={sendReviewRequest} disabled={sendingRequest || !requestLeadId}>
                {sendingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Review Request
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateReviewDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchReviews}
      />
    </div>
  );
}
