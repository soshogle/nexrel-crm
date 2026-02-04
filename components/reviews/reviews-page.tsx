'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Plus,
  RefreshCw,
  Loader2,
  Sparkles,
  Shield,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import CreateReviewDialog from './create-review-dialog';

interface Review {
  id: string;
  rating: number;
  reviewText: string | null;
  reviewUrl: string | null;
  source: string;
  isPublic: boolean;
  createdAt: string;
  lead: {
    id: string;
    businessName: string;
    contactPerson: string | null;
  };
  campaign: {
    id: string;
    name: string;
  };
}

interface ReviewStats {
  total: number;
  averageRating: number;
  bySource: Record<string, number>;
  recent: number;
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    averageRating: 0,
    bySource: {},
    recent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reviews');
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data.reviews || []);
      calculateStats(data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsList: Review[]) => {
    const total = reviewsList.length;
    const averageRating =
      total > 0
        ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / total
        : 0;
    const bySource: Record<string, number> = {};
    reviewsList.forEach((r) => {
      bySource[r.source] = (bySource[r.source] || 0) + 1;
    });
    const recent = reviewsList.filter(
      (r) =>
        new Date(r.createdAt).getTime() >
        Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length;

    setStats({ total, averageRating, bySource, recent });
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !searchQuery ||
      review.lead.businessName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      review.lead.contactPerson
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      review.reviewText?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = selectedSource === 'all' || review.source === selectedSource;
    const matchesRating =
      selectedRating === 'all' || review.rating.toString() === selectedRating;

    return matchesSearch && matchesSource && matchesRating;
  });

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      GOOGLE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      FACEBOOK: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
      YELP: 'bg-red-500/20 text-red-400 border-red-500/30',
      TRUSTPILOT: 'bg-green-500/20 text-green-400 border-green-500/30',
      OTHER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[source] || colors.OTHER;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-purple-400/50'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Reviews & Reputation
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage your business reviews across all platforms
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Review
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-indigo-950/90 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Total Reviews
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <p className="text-xs text-white/60 mt-1">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-indigo-950/90 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Average Rating
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex gap-0.5 mt-1">
              {renderStars(Math.round(stats.averageRating))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-indigo-950/90 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              This Month
            </CardTitle>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.recent}</div>
            <p className="text-xs text-white/60 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-indigo-950/90 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Platforms
            </CardTitle>
            <Shield className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Object.keys(stats.bySource).length}
            </div>
            <p className="text-xs text-white/60 mt-1">Active sources</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-indigo-950/90 border-purple-500/30 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-400/50"
              />
            </div>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent className="bg-purple-900/90 border-purple-500/30 backdrop-blur-xl">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="GOOGLE">Google</SelectItem>
                <SelectItem value="FACEBOOK">Facebook</SelectItem>
                <SelectItem value="YELP">Yelp</SelectItem>
                <SelectItem value="TRUSTPILOT">Trustpilot</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedRating} onValueChange={setSelectedRating}>
              <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="All Ratings" />
              </SelectTrigger>
              <SelectContent className="bg-purple-900/90 border-purple-500/30 backdrop-blur-xl">
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchReviews}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card className="bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-indigo-950/90 border-purple-500/30 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              No reviews found
            </h3>
            <p className="text-white/60 mb-4">
              {searchQuery || selectedSource !== 'all' || selectedRating !== 'all'
                ? 'Try adjusting your filters'
                : 'Start collecting reviews from your satisfied customers'}
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReviews.map((review) => (
            <Card
              key={review.id}
              className="bg-gradient-to-br from-indigo-950/90 via-purple-950/90 to-indigo-950/90 border-purple-500/30 backdrop-blur-sm hover:border-purple-400/50 transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm font-medium text-white/90 ml-1">
                          {review.rating}.0
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={getSourceColor(review.source)}
                      >
                        {review.source}
                      </Badge>
                      {review.isPublic && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Public
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-white mb-1">
                          {review.lead.businessName}
                          {review.lead.contactPerson &&
                            ` - ${review.lead.contactPerson}`}
                        </h3>
                        {review.reviewText && (
                          <p className="text-white/80 leading-relaxed">
                            {review.reviewText}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span>
                          Campaign: {review.campaign.name}
                        </span>
                        <span>•</span>
                        <span>
                          {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {review.reviewUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(review.reviewUrl!, '_blank')}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Review Dialog */}
      <CreateReviewDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchReviews}
      />
    </div>
  );
}
