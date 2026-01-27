'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, FileText, MapPin, Calculator } from 'lucide-react';

export default function CMAToolsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-500 rounded-xl">
          <TrendingUp className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">CMA Tools</h1>
          <p className="text-muted-foreground">Generate Comparative Market Analysis reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Create New CMA
            </CardTitle>
            <CardDescription>Enter property details to generate a market analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Property Address</Label>
              <Input id="address" placeholder="123 Main Street, City, State ZIP" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beds">Bedrooms</Label>
                <Input id="beds" type="number" placeholder="3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baths">Bathrooms</Label>
                <Input id="baths" type="number" placeholder="2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sqft">Square Feet</Label>
                <Input id="sqft" type="number" placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year Built</Label>
                <Input id="year" type="number" placeholder="2000" />
              </div>
            </div>
            <Button className="w-full gap-2">
              <FileText className="h-4 w-4" />
              Generate CMA Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent CMA Reports</CardTitle>
            <CardDescription>Your generated market analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No CMA Reports Yet</h3>
              <p className="text-muted-foreground max-w-md">
                Create your first Comparative Market Analysis to help clients understand property values.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
