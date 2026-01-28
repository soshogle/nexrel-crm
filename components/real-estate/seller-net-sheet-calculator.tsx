'use client';

import { useState } from 'react';
import {
  Calculator,
  DollarSign,
  FileText,
  Download,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface SellerNetSheetCalculatorProps {
  initialPrice?: number;
  propertyAddress?: string;
}

interface CostBreakdown {
  category: string;
  items: {
    name: string;
    amount: number;
    isEditable?: boolean;
  }[];
  total: number;
}

export function SellerNetSheetCalculator({ initialPrice = 500000, propertyAddress }: SellerNetSheetCalculatorProps) {
  const [salePrice, setSalePrice] = useState(initialPrice);
  const [state, setState] = useState('CA');
  const [mortgageBalance, setMortgageBalance] = useState(250000);
  const [commissionRate, setCommissionRate] = useState(5);
  const [expandedSections, setExpandedSections] = useState<string[]>(['closing', 'prepaid']);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // State-specific transfer tax rates (per $1000)
  const transferTaxRates: Record<string, number> = {
    'CA': 1.10,
    'NY': 4.00,
    'TX': 0,
    'FL': 7.00,
    'IL': 1.50,
    'PA': 10.00,
    'OH': 1.00,
    'GA': 1.00,
    'NC': 2.00,
    'MI': 8.60,
    'ON': 0.5, // Ontario
    'BC': 1.0, // British Columbia
    'QC': 0.5, // Quebec
    'AB': 0,   // Alberta
  };

  const calculateTransferTax = () => {
    const rate = transferTaxRates[state] || 1.10;
    return (salePrice / 1000) * rate;
  };

  const commission = salePrice * (commissionRate / 100);
  const transferTax = calculateTransferTax();
  const titleInsurance = salePrice * 0.005; // 0.5%
  const escrowFee = Math.min(Math.max(salePrice * 0.001, 500), 2500);
  const recordingFees = 150;
  const homeWarranty = 500;
  const propertyTaxProration = (salePrice * 0.012) / 12 * 2; // 2 months prorated
  const hoaProration = 150;

  const closingCosts: CostBreakdown = {
    category: 'Closing Costs',
    items: [
      { name: 'Real Estate Commission', amount: commission, isEditable: true },
      { name: 'Transfer Tax', amount: transferTax },
      { name: 'Title Insurance', amount: titleInsurance },
      { name: 'Escrow Fee', amount: escrowFee },
      { name: 'Recording Fees', amount: recordingFees },
    ],
    total: commission + transferTax + titleInsurance + escrowFee + recordingFees,
  };

  const prepaidItems: CostBreakdown = {
    category: 'Prepaid & Prorations',
    items: [
      { name: 'Property Tax Proration', amount: propertyTaxProration },
      { name: 'HOA Proration', amount: hoaProration },
      { name: 'Home Warranty (optional)', amount: homeWarranty },
    ],
    total: propertyTaxProration + hoaProration + homeWarranty,
  };

  const totalCosts = closingCosts.total + prepaidItems.total + mortgageBalance;
  const estimatedProceeds = salePrice - totalCosts;

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await fetch('/api/real-estate/net-sheet/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyAddress,
          salePrice,
          state,
          mortgageBalance,
          commissionRate,
          closingCosts: {
            commission,
            transferTax,
            titleInsurance,
            escrowFee,
            recordingFees,
            total: closingCosts.total,
          },
          prepaidItems: {
            propertyTaxProration,
            hoaProration,
            homeWarranty,
            total: prepaidItems.total,
          },
          estimatedProceeds,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(error.error || 'Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = propertyAddress 
        ? `Net_Sheet_${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        : `Seller_Net_Sheet_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-slate-300">Sale Price</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(parseInt(e.target.value) || 0)}
              className="pl-9 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-300">State/Province</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="mt-1 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CA">California</SelectItem>
              <SelectItem value="NY">New York</SelectItem>
              <SelectItem value="TX">Texas</SelectItem>
              <SelectItem value="FL">Florida</SelectItem>
              <SelectItem value="IL">Illinois</SelectItem>
              <SelectItem value="ON">Ontario</SelectItem>
              <SelectItem value="BC">British Columbia</SelectItem>
              <SelectItem value="QC">Quebec</SelectItem>
              <SelectItem value="AB">Alberta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-slate-300">Mortgage Balance</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="number"
              value={mortgageBalance}
              onChange={(e) => setMortgageBalance(parseInt(e.target.value) || 0)}
              className="pl-9 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-300">Commission Rate: {commissionRate}%</Label>
          <Slider
            value={[commissionRate]}
            onValueChange={(v) => setCommissionRate(v[0])}
            min={0}
            max={7}
            step={0.25}
            className="mt-3"
          />
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Closing Costs */}
        <Collapsible
          open={expandedSections.includes('closing')}
          onOpenChange={() => toggleSection('closing')}
        >
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  {closingCosts.category}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-violet-400 font-semibold">
                    ${closingCosts.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  {expandedSections.includes('closing') ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-2">
                {closingCosts.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-slate-300 text-sm">{item.name}</span>
                    <span className="text-white font-medium">
                      ${item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Prepaid Items */}
        <Collapsible
          open={expandedSections.includes('prepaid')}
          onOpenChange={() => toggleSection('prepaid')}
        >
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  {prepaidItems.category}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-semibold">
                    ${prepaidItems.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  {expandedSections.includes('prepaid') ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-2">
                {prepaidItems.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-slate-300 text-sm">{item.name}</span>
                    <span className="text-white font-medium">
                      ${item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-br from-slate-900/80 via-emerald-900/20 to-slate-900/80 border-emerald-500/30">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-300">Sale Price</span>
              <span className="text-white font-semibold text-lg">${salePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-300">Mortgage Payoff</span>
              <span className="text-red-400">-${mortgageBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-300">Closing Costs</span>
              <span className="text-red-400">
                -${closingCosts.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-300">Prepaid & Prorations</span>
              <span className="text-red-400">
                -${prepaidItems.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="border-t border-slate-700 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-semibold text-lg">Estimated Net Proceeds</span>
                <span className={`font-bold text-2xl ${estimatedProceeds >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${estimatedProceeds.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          className="border-slate-700"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </>
          )}
        </Button>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500">
          <Send className="w-4 h-4 mr-2" />
          Send to Client
        </Button>
      </div>
    </div>
  );
}
