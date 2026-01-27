import { Suspense } from 'react';
import { Metadata } from 'next';
import { AnalyticsDashboard } from '@/components/lead-generation/analytics-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Settings, Play } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Lead Generation | CRM',
  description: 'AI-powered lead generation and analytics',
};

export default function LeadGenerationPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lead Generation</h2>
          <p className="text-muted-foreground">
            AI-powered lead generation, scoring, and outreach automation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="ab-tests">A/B Tests</TabsTrigger>
          <TabsTrigger value="widgets">Widgets</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <Suspense fallback={<div>Loading analytics...</div>}>
            <AnalyticsDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Generation Campaigns</CardTitle>
              <CardDescription>
                Manage automated lead generation campaigns and workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">Google Maps Scraping</CardTitle>
                    <CardDescription>100-200 leads per day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">Active</p>
                        <p className="text-sm text-muted-foreground">Last run: 2 hours ago</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">Email Drip Sequences</CardTitle>
                    <CardDescription>Automated nurture campaigns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">Active</p>
                        <p className="text-sm text-muted-foreground">234 sent today</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">Voice AI Calling</CardTitle>
                    <CardDescription>Automated outbound calls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">Active</p>
                        <p className="text-sm text-muted-foreground">45 calls today</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ab-tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A/B Tests</CardTitle>
              <CardDescription>
                Optimize your outreach with data-driven testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No active A/B tests. Create one to get started.</p>
              <Button className="mt-4">Create A/B Test</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="widgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embeddable Widgets</CardTitle>
              <CardDescription>
                Capture leads directly from your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lead Capture Form</CardTitle>
                    <CardDescription>Simple 3-field contact form</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Lightweight form widget that captures name, email, and phone.
                    </p>
                    <Button variant="outline" size="sm">
                      Get Embed Code
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Voice AI Widget</CardTitle>
                    <CardDescription>Multilingual voice assistant</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      AI-powered voice widget that qualifies leads through natural conversation.
                    </p>
                    <Button variant="outline" size="sm">
                      Get Embed Code
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
