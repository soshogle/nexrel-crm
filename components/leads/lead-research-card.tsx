'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Play, Loader2, Building2, Target, Zap, Briefcase, AtSign, Globe, User, Phone } from 'lucide-react';
import { toast } from 'sonner';

export function LeadResearchCard() {
  const [leadBusinessName, setLeadBusinessName] = useState('');
  const [leadWebsite, setLeadWebsite] = useState('');
  const [leadIndustry, setLeadIndustry] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [activeResearchJobId, setActiveResearchJobId] = useState<string | null>(null);
  const [activeResearchJob, setActiveResearchJob] = useState<{ progress: number; progressMessage: string | null; status: string } | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const handleLeadResearch = async () => {
    if (!leadBusinessName) {
      toast.error('Business name is required');
      return;
    }

    setResearchLoading(true);
    toast.info('Starting lead research...');

    try {
      const response = await fetch('/api/ai-employees/lead-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: leadBusinessName,
          website: leadWebsite || undefined,
          industry: leadIndustry || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Lead research started!');
        setLeadBusinessName('');
        setLeadWebsite('');
        setLeadIndustry('');
        if (data.jobId) {
          setActiveResearchJobId(data.jobId);
          setActiveResearchJob({ progress: 0, progressMessage: 'Starting research...', status: 'RUNNING' });
        }
      } else {
        toast.error(data.error || 'Failed to start lead research');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start lead research');
    } finally {
      setResearchLoading(false);
    }
  };

  useEffect(() => {
    if (!activeResearchJobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/ai-employees/jobs/${activeResearchJobId}`);
        const data = await res.json();
        if (!data.success || !data.data) return;

        const job = data.data;
        const progress = job.progress ?? 0;
        const progressMessage = job.logs?.[0]?.message ?? null;
        const status = job.status;

        setActiveResearchJob({ progress, progressMessage, status });

        if (status === 'COMPLETED' || status === 'FAILED') {
          setActiveResearchJobId(null);
          setActiveResearchJob(null);

          if (status === 'COMPLETED' && job.output) {
            setSelectedJob(job);
            setShowResultsDialog(true);
            toast.success('Research complete! View results below.');
          } else if (status === 'FAILED') {
            toast.error('Research failed. Check Monitor Jobs for details.');
          }
        }
      } catch {
        // Ignore poll errors
      }
    };

    const interval = setInterval(poll, 2000);
    poll();
    return () => clearInterval(interval);
  }, [activeResearchJobId]);

  const enrichedData = selectedJob?.output?.enrichedData;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Lead Research & Enrichment
          </CardTitle>
          <CardDescription>
            AI Employee: Sarah - Lead Researcher | Estimated time: 3-4 minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                placeholder="e.g., Acme Corp"
                value={leadBusinessName}
                onChange={(e) => setLeadBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="e.g., acmecorp.com"
                value={leadWebsite}
                onChange={(e) => setLeadWebsite(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Technology"
                value={leadIndustry}
                onChange={(e) => setLeadIndustry(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleLeadResearch}
            disabled={researchLoading || !!activeResearchJobId}
            className="w-full"
          >
            {researchLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Researching...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Lead Research
              </>
            )}
          </Button>
          {activeResearchJobId && activeResearchJob && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {activeResearchJob.progressMessage || 'Researching...'}
                </span>
                <span className="font-medium">{activeResearchJob.progress}%</span>
              </div>
              <Progress value={activeResearchJob.progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Lead Research Results
            </DialogTitle>
            <DialogDescription suppressHydrationWarning>
              {(selectedJob?.jobType || '').replace(/_/g, ' ')} • Completed on{' '}
              {selectedJob?.completedAt && (typeof selectedJob.completedAt === 'string' ? new Date(selectedJob.completedAt).toLocaleString() : String(selectedJob.completedAt))}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {enrichedData ? (
              <div className="space-y-6">
                {enrichedData.companyInfo && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Company Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">{enrichedData.companyInfo.name}</p>
                      </div>
                      {enrichedData.companyInfo.website && (
                        <div>
                          <span className="text-muted-foreground">Website:</span>
                          <p className="font-medium">
                            <a
                              href={enrichedData.companyInfo.website.startsWith('http') ? enrichedData.companyInfo.website : `https://${enrichedData.companyInfo.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {enrichedData.companyInfo.website}
                            </a>
                          </p>
                        </div>
                      )}
                      {enrichedData.companyInfo.industry && (
                        <div>
                          <span className="text-muted-foreground">Industry:</span>
                          <p className="font-medium">{enrichedData.companyInfo.industry}</p>
                        </div>
                      )}
                      {enrichedData.companyInfo.description && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground text-sm">Description:</span>
                          <p className="text-sm mt-1">{enrichedData.companyInfo.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {enrichedData.businessMetrics && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Business Metrics
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {enrichedData.businessMetrics.estimatedRevenue && (
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Est. Revenue</p>
                          <p className="font-semibold">{enrichedData.businessMetrics.estimatedRevenue}</p>
                        </div>
                      )}
                      {enrichedData.businessMetrics.employeeCount && (
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Employees</p>
                          <p className="font-semibold">{enrichedData.businessMetrics.employeeCount}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {enrichedData.leadScore !== undefined && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Lead Score
                    </h3>
                    <Badge
                      variant={enrichedData.leadScore >= 70 ? 'default' : enrichedData.leadScore >= 40 ? 'secondary' : 'outline'}
                    >
                      {enrichedData.leadScore >= 70 ? 'Hot Lead' : enrichedData.leadScore >= 40 ? 'Warm Lead' : 'Cold Lead'} - {enrichedData.leadScore}
                    </Badge>
                  </div>
                )}

                {enrichedData.contactInfo && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <AtSign className="h-5 w-5 text-primary" />
                      Contact Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      {enrichedData.contactInfo.email && (
                        <div className="flex items-center gap-2">
                          <AtSign className="h-4 w-4 text-muted-foreground" />
                          <span>{enrichedData.contactInfo.email}</span>
                        </div>
                      )}
                      {enrichedData.contactInfo.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{enrichedData.contactInfo.phone}</span>
                        </div>
                      )}
                      {enrichedData.contactInfo.socialMedia?.linkedin && (
                        <div>
                          <a
                            href={enrichedData.contactInfo.socialMedia.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {enrichedData.keyPeople && enrichedData.keyPeople.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Key People
                    </h3>
                    <div className="space-y-2">
                      {enrichedData.keyPeople.map((person: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium">{person.name}</p>
                          {person.title && <p className="text-muted-foreground">{person.title}</p>}
                          {person.email && <p className="text-xs">{person.email}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {enrichedData.recommendedApproach && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Recommended Approach
                    </h3>
                    <p className="text-sm p-3 bg-muted rounded-lg">{enrichedData.recommendedApproach}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No enrichment data available.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
