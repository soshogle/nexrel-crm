'use client';

import { useState, useEffect } from 'react';
import { Calculator, ExternalLink, Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Website {
  id: string;
  name: string;
  type: string;
  templateType?: string;
  vercelDeploymentUrl?: string;
  status: string;
}

export function PropertyEvaluationPanel() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/websites')
      .then((r) => r.ok ? r.json() : { websites: [] })
      .then((data) => setWebsites(data.websites || []))
      .catch(() => setWebsites([]))
      .finally(() => setLoading(false));
  }, []);

  const serviceSites = websites.filter(
    (w) => (w.templateType === 'SERVICE' || w.type === 'SERVICE') && w.vercelDeploymentUrl && (w.status === 'READY' || w.status === 'PUBLISHED')
  );

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl border-pink-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30">
              <Calculator className="w-8 h-8 text-pink-400" />
            </div>
            <div>
              <CardTitle className="text-white">Property Evaluation</CardTitle>
              <CardDescription className="text-slate-400">
                Clients get instant valuations on your site. Enter property details → receive estimate by email → lead captured in CRM.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-4">
            <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-pink-400" />
              How it works
            </h4>
            <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
              <li>Client enters address, beds, baths on your Property Evaluation page</li>
              <li>System finds comparable sold/active listings in the area</li>
              <li>Client enters contact info to receive the report</li>
              <li>Estimate + comparables sent by email; lead created in your CRM</li>
            </ol>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your websites…
            </div>
          ) : serviceSites.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No published real estate sites found. Publish a site to enable Property Evaluation.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Open your Property Evaluation page:</p>
              <div className="flex flex-wrap gap-3">
                {serviceSites.map((site) => {
                  const baseUrl = site.vercelDeploymentUrl!.replace(/\/$/, '');
                  const evalUrl = `${baseUrl}/market-appraisal`;
                  return (
                    <Button
                      key={site.id}
                      variant="outline"
                      className="border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-200"
                      asChild
                    >
                      <a href={evalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {site.name}
                      </a>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
