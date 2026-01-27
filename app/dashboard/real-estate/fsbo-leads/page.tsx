'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Search, Phone, Mail, MapPin } from 'lucide-react';

export default function FSBOLeadsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500 rounded-xl">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">FSBO Leads</h1>
            <p className="text-muted-foreground">Find and convert For Sale By Owner listings</p>
          </div>
        </div>
        <Button className="gap-2">
          <Search className="h-4 w-4" />
          Search FSBO Listings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Converted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FSBO Lead Pipeline</CardTitle>
          <CardDescription>Your For Sale By Owner leads will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No FSBO Leads Yet</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Start searching for FSBO listings in your area to build your lead pipeline.
              Our AI will help you identify the best opportunities.
            </p>
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Start Searching
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
