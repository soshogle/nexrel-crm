'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Target,
  Zap,
  Briefcase,
  Users,
  Phone,
  AtSign,
  Globe,
  Newspaper,
  Search,
  UserPlus,
  Calendar,
  Mail,
  Bot,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface AIJob {
  id: string;
  jobType: string;
  status: string;
  progress: number;
  input?: any;
  output?: any;
  employee: {
    name: string;
    type: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface JobResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJob: AIJob | null;
  loading: boolean;
}

function getEmployeeIcon(type: string) {
  switch (type) {
    case 'LEAD_RESEARCHER':
      return <Search className="h-5 w-5" />;
    case 'CUSTOMER_ONBOARDING':
      return <UserPlus className="h-5 w-5" />;
    case 'BOOKING_COORDINATOR':
      return <Calendar className="h-5 w-5" />;
    case 'PROJECT_MANAGER':
      return <Briefcase className="h-5 w-5" />;
    case 'COMMUNICATION_SPECIALIST':
      return <Mail className="h-5 w-5" />;
    default:
      return <Bot className="h-5 w-5" />;
  }
}

export function JobResultsDialog({ open, onOpenChange, selectedJob, loading }: JobResultsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedJob && getEmployeeIcon(selectedJob.employee.type)}
            {selectedJob?.employee.name} - Results
          </DialogTitle>
          <DialogDescription suppressHydrationWarning>
            {(selectedJob?.jobType || '').replace(/_/g, ' ')} • 
            {selectedJob?.status === 'COMPLETED' ? ' Completed' : ' Failed'} on{' '}
            {selectedJob?.completedAt && (typeof selectedJob.completedAt === 'string' ? new Date(selectedJob.completedAt).toLocaleString() : String(selectedJob.completedAt))}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedJob?.output?.enrichedData ? (
            <div className="space-y-6">
              {selectedJob.output.enrichedData.companyInfo && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Company Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{selectedJob.output.enrichedData.companyInfo.name}</p>
                    </div>
                    {selectedJob.output.enrichedData.companyInfo.website && (
                      <div>
                        <span className="text-muted-foreground">Website:</span>
                        <p className="font-medium">
                          <a href={selectedJob.output.enrichedData.companyInfo.website.startsWith('http') 
                            ? selectedJob.output.enrichedData.companyInfo.website 
                            : `https://${selectedJob.output.enrichedData.companyInfo.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {selectedJob.output.enrichedData.companyInfo.website}
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedJob.output.enrichedData.companyInfo.industry && (
                      <div>
                        <span className="text-muted-foreground">Industry:</span>
                        <p className="font-medium">{selectedJob.output.enrichedData.companyInfo.industry}</p>
                      </div>
                    )}
                    {selectedJob.output.enrichedData.companyInfo.headquarters && (
                      <div>
                        <span className="text-muted-foreground">Headquarters:</span>
                        <p className="font-medium">{selectedJob.output.enrichedData.companyInfo.headquarters}</p>
                      </div>
                    )}
                    {selectedJob.output.enrichedData.companyInfo.foundedYear && (
                      <div>
                        <span className="text-muted-foreground">Founded:</span>
                        <p className="font-medium">{selectedJob.output.enrichedData.companyInfo.foundedYear}</p>
                      </div>
                    )}
                  </div>
                  {selectedJob.output.enrichedData.companyInfo.description && (
                    <div>
                      <span className="text-muted-foreground text-sm">Description:</span>
                      <p className="text-sm mt-1">{selectedJob.output.enrichedData.companyInfo.description}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedJob.output.enrichedData.businessMetrics && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Business Metrics
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedJob.output.enrichedData.businessMetrics.estimatedRevenue && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Est. Revenue</p>
                        <p className="font-semibold">{selectedJob.output.enrichedData.businessMetrics.estimatedRevenue}</p>
                      </div>
                    )}
                    {selectedJob.output.enrichedData.businessMetrics.employeeCount && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Employees</p>
                        <p className="font-semibold">{selectedJob.output.enrichedData.businessMetrics.employeeCount}</p>
                      </div>
                    )}
                    {selectedJob.output.enrichedData.businessMetrics.companySize && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Company Size</p>
                        <p className="font-semibold">{selectedJob.output.enrichedData.businessMetrics.companySize}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedJob.output.enrichedData.techStack && selectedJob.output.enrichedData.techStack.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Tech Stack
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.output.enrichedData.techStack.map((tech: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.output.enrichedData.funding && (selectedJob.output.enrichedData.funding.amount || selectedJob.output.enrichedData.funding.stage) && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Funding
                  </h3>
                  <div className="p-3 bg-muted rounded-lg">
                    {selectedJob.output.enrichedData.funding.amount && (
                      <p><span className="text-muted-foreground">Amount:</span> {selectedJob.output.enrichedData.funding.amount}</p>
                    )}
                    {selectedJob.output.enrichedData.funding.stage && (
                      <p><span className="text-muted-foreground">Stage:</span> {selectedJob.output.enrichedData.funding.stage}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedJob.output.enrichedData.leadScore !== undefined && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Lead Score
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-primary">
                      {selectedJob.output.enrichedData.leadScore}
                    </div>
                    <div className="text-sm text-muted-foreground">/ 100</div>
                    <Badge variant={
                      selectedJob.output.enrichedData.leadScore >= 70 ? 'default' :
                      selectedJob.output.enrichedData.leadScore >= 40 ? 'secondary' : 'outline'
                    }>
                      {selectedJob.output.enrichedData.leadScore >= 70 ? 'Hot Lead' :
                       selectedJob.output.enrichedData.leadScore >= 40 ? 'Warm Lead' : 'Cold Lead'}
                    </Badge>
                  </div>
                </div>
              )}

              {selectedJob.output.enrichedData.keyPeople && selectedJob.output.enrichedData.keyPeople.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Key Decision Makers
                  </h3>
                  <div className="space-y-2">
                    {selectedJob.output.enrichedData.keyPeople.map((person: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{person.name}</p>
                            <p className="text-sm text-muted-foreground">{person.title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {person.linkedIn && (
                              <a href={person.linkedIn} target="_blank" rel="noopener noreferrer" 
                                 className="text-primary hover:underline text-sm">
                                LinkedIn
                              </a>
                            )}
                            {person.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {person.confidence}% verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        {person.email && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <AtSign className="h-3 w-3 text-muted-foreground" />
                            <a href={`mailto:${person.email}`} className="text-primary hover:underline">
                              {person.email}
                            </a>
                          </div>
                        )}
                        {person.phone && (
                          <div className="mt-1 flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a href={`tel:${person.phone}`} className="text-primary hover:underline">
                              {person.phone}
                            </a>
                          </div>
                        )}
                        {person.emailAlternatives && person.emailAlternatives.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Alt emails: {person.emailAlternatives.slice(0, 3).join(', ')}
                          </div>
                        )}
                        {person.source && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {person.source.includes('Hunter') || person.source.includes('Apollo') ? '✅' : '⚠️'} {person.source?.replace(/Hunter|Apollo/gi, 'Soshogle AI') || person.source}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.output.enrichedData.contactInfo && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedJob.output.enrichedData.contactInfo.email && (
                      <div className="flex items-center gap-2">
                        <AtSign className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedJob.output.enrichedData.contactInfo.email}</span>
                      </div>
                    )}
                    {selectedJob.output.enrichedData.contactInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedJob.output.enrichedData.contactInfo.phone}</span>
                      </div>
                    )}
                    {selectedJob.output.enrichedData.contactInfo.socialMedia?.linkedin && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={selectedJob.output.enrichedData.contactInfo.socialMedia.linkedin} 
                           target="_blank" rel="noopener noreferrer" 
                           className="text-primary hover:underline">
                          LinkedIn
                        </a>
                      </div>
                    )}
                    {selectedJob.output.enrichedData.contactInfo.socialMedia?.twitter && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={selectedJob.output.enrichedData.contactInfo.socialMedia.twitter} 
                           target="_blank" rel="noopener noreferrer" 
                           className="text-primary hover:underline">
                          Twitter
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedJob.output.enrichedData.intentSignals && (selectedJob.output.enrichedData.intentSignals.hiring || selectedJob.output.enrichedData.intentSignals.jobPostings?.length) && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Intent Signals
                  </h3>
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    {selectedJob.output.enrichedData.intentSignals.hiring && (
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Company is hiring – potential buying signal</p>
                    )}
                    {selectedJob.output.enrichedData.intentSignals.careersPage && (
                      <a href={selectedJob.output.enrichedData.intentSignals.careersPage} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block mt-1">
                        Careers page
                      </a>
                    )}
                    {selectedJob.output.enrichedData.intentSignals.jobPostings && selectedJob.output.enrichedData.intentSignals.jobPostings.length > 0 && (
                      <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                        {selectedJob.output.enrichedData.intentSignals.jobPostings.slice(0, 5).map((j: string, i: number) => (
                          <li key={i}>{j}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {selectedJob.output.enrichedData.recentNews && selectedJob.output.enrichedData.recentNews.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Newspaper className="h-5 w-5 text-primary" />
                    Recent News
                  </h3>
                  <div className="space-y-2">
                    {selectedJob.output.enrichedData.recentNews.map((news: any, idx: number) => (
                      <div key={idx} className="p-2 bg-muted rounded-lg">
                        <p className="font-medium text-sm">{news.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {news.date && <span>{news.date}</span>}
                          {news.source && <span>• {news.source}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.output.enrichedData.recommendedApproach && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Recommended Sales Approach
                  </h3>
                  <p className="text-sm p-3 bg-primary/10 rounded-lg border border-primary/20">
                    {selectedJob.output.enrichedData.recommendedApproach}
                  </p>
                </div>
              )}
            </div>
          ) : selectedJob?.output ? (
            <div className="space-y-4">
              {selectedJob.employee.type === 'CUSTOMER_ONBOARDING' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200">
                    <h3 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="h-5 w-5" />
                      Customer Onboarding Complete
                    </h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <p><strong>Customer:</strong> {selectedJob.output?.customerName || selectedJob.input?.customerName || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedJob.output?.customerEmail || selectedJob.input?.customerEmail || 'N/A'}</p>
                      {selectedJob.output?.invoiceNumber && <p><strong>Invoice:</strong> #{selectedJob.output.invoiceNumber}</p>}
                      {selectedJob.output?.amount && <p><strong>Amount:</strong> ${selectedJob.output.amount}</p>}
                      <p className="text-green-600 mt-2">✅ Customer record created in database</p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedJob.employee.type === 'BOOKING_COORDINATOR' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200">
                    <h3 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                      <Calendar className="h-5 w-5" />
                      Booking Task Complete
                    </h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <p><strong>Status:</strong> {selectedJob.output?.calendarChecked ? '✅ Calendar checked' : '⏳ Pending'}</p>
                      {selectedJob.output?.slotsFound && <p><strong>Available Slots:</strong> {selectedJob.output.slotsFound} found</p>}
                      {selectedJob.output?.bookingLink && (
                        <p><strong>Booking Link:</strong> <a href={selectedJob.output.bookingLink} className="text-primary underline">View</a></p>
                      )}
                      <p className="text-purple-600 mt-2">📅 Appointment scheduling processed</p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedJob.employee.type === 'PROJECT_MANAGER' && (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200">
                    <h3 className="font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <Briefcase className="h-5 w-5" />
                      Project Management Complete
                    </h3>
                    <div className="mt-3 space-y-2 text-sm">
                      {selectedJob.output?.projectId && <p><strong>Project ID:</strong> {selectedJob.output.projectId}</p>}
                      {selectedJob.output?.projectName && <p><strong>Project:</strong> {selectedJob.output.projectName}</p>}
                      {selectedJob.output?.tasksCreated && <p><strong>Tasks Created:</strong> {selectedJob.output.tasksCreated}</p>}
                      {selectedJob.output?.teamAssigned && <p><strong>Team:</strong> {selectedJob.output.teamAssigned}</p>}
                      <p className="text-orange-600 mt-2">✅ Project & tasks created in database</p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedJob.employee.type === 'COMMUNICATION_SPECIALIST' && (
                <div className="space-y-4">
                  <div className="p-4 bg-pink-50 dark:bg-pink-950 rounded-lg border border-pink-200">
                    <h3 className="font-semibold flex items-center gap-2 text-pink-700 dark:text-pink-300">
                      <Mail className="h-5 w-5" />
                      Communication Complete
                    </h3>
                    <div className="mt-3 space-y-2 text-sm">
                      {selectedJob.output?.emailsSent > 0 && <p>✉️ <strong>Emails Sent:</strong> {selectedJob.output.emailsSent}</p>}
                      {selectedJob.output?.smsSent > 0 && <p>📱 <strong>SMS Sent:</strong> {selectedJob.output.smsSent}</p>}
                      {selectedJob.output?.voiceCallsInitiated > 0 && <p>📞 <strong>Voice Calls:</strong> {selectedJob.output.voiceCallsInitiated}</p>}
                      {selectedJob.output?.recipientEmail && <p><strong>Recipient:</strong> {selectedJob.output.recipientEmail}</p>}
                      <p className="text-pink-600 mt-2">✅ Welcome package delivered</p>
                    </div>
                  </div>
                </div>
              )}
              
              {!['LEAD_RESEARCHER', 'CUSTOMER_ONBOARDING', 'BOOKING_COORDINATOR', 'PROJECT_MANAGER', 'COMMUNICATION_SPECIALIST'].includes(selectedJob.employee.type) && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Job Complete</h3>
                  <p className="text-sm text-muted-foreground">Task completed successfully.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No results data available for this job.
              {selectedJob?.status === 'FAILED' && (
                <p className="mt-2 text-red-500">The job failed to complete.</p>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
