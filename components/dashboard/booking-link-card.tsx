'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, ExternalLink, Calendar, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { getIndustryBookingConfig } from '@/lib/industry-booking-config';

interface BookingLinkCardProps {
  userId: string;
  businessName?: string | null;
  industry?: string | null;
}

export function BookingLinkCard({ userId, businessName, industry }: BookingLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const config = getIndustryBookingConfig(industry);
  
  const bookingUrl = mounted && typeof window !== 'undefined' 
    ? `${window.location.origin}/booking/${userId}`
    : `/booking/${userId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success(`${config.bookingNoun} link copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewBookingPage = () => {
    window.open(bookingUrl, '_blank');
  };

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Share Your {config.bookingNoun} Link</CardTitle>
              <CardDescription>Let clients book {config.bookingPluralNoun.toLowerCase()} directly</CardDescription>
            </div>
          </div>
          <Link2 className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input 
              value={bookingUrl}
              readOnly 
              className="font-mono text-sm bg-muted/50"
            />
          </div>
          <Button 
            onClick={copyToClipboard}
            variant="outline"
            size="icon"
            className="border-purple-500/20 hover:bg-purple-500/10"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button 
            onClick={previewBookingPage}
            variant="outline"
            size="icon"
            className="border-blue-500/20 hover:bg-blue-500/10"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-sm text-muted-foreground">
            {businessName ? (
              <span>{config.bookingNoun} page for <span className="font-semibold text-foreground">{businessName}</span></span>
            ) : (
              <span>Your {config.bookingNoun.toLowerCase()} page</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
