'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Calculator, FileText } from 'lucide-react';

export default function SellerNetSheetPage() {
  const { toast } = useToast();
  const [address, setAddress] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [mortgageBalance, setMortgageBalance] = useState('');
  const [commissionRate, setCommissionRate] = useState('6');
  const [closingCostsRate, setClosingCostsRate] = useState('2');
  const [titleInsuranceRate, setTitleInsuranceRate] = useState('0.5');
  const [transferTaxRate, setTransferTaxRate] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  const salePriceNum = parseFloat(salePrice) || 0;
  const mortgageNum = parseFloat(mortgageBalance) || 0;
  const commissionNum = parseFloat(commissionRate) || 0;
  const closingRateNum = parseFloat(closingCostsRate) || 0;
  const titleRateNum = parseFloat(titleInsuranceRate) || 0;
  const transferRateNum = parseFloat(transferTaxRate) || 0;

  const commission = salePriceNum * (commissionNum / 100);
  const closingCosts = salePriceNum * (closingRateNum / 100);
  const titleInsurance = salePriceNum * (titleRateNum / 100);
  const transferTax = salePriceNum * (transferRateNum / 100);
  const totalDeductions = commission + closingCosts + titleInsurance + transferTax + mortgageNum;
  const netProceeds = salePriceNum - totalDeductions;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  useEffect(() => {
    const loadLastSheet = async () => {
      try {
        const res = await fetch('/api/real-estate/net-sheet?limit=1');
        if (!res.ok) return;
        const data = await res.json();
        const latest = Array.isArray(data?.netSheets) ? data.netSheets[0] : null;
        if (!latest) return;
        setAddress(latest.address || '');
        setSalePrice(latest.salePrice ? String(latest.salePrice) : '');
        setMortgageBalance(latest.mortgagePayoff ? String(latest.mortgagePayoff) : '');
        setCommissionRate(latest.commissionRate ? String(latest.commissionRate) : '6');
        if (latest.salePrice) {
          setClosingCostsRate(latest.closingCosts ? ((latest.closingCosts / latest.salePrice) * 100).toFixed(2) : '2');
          setTitleInsuranceRate(latest.titleInsurance ? ((latest.titleInsurance / latest.salePrice) * 100).toFixed(2) : '0.5');
          setTransferTaxRate(latest.transferTax ? ((latest.transferTax / latest.salePrice) * 100).toFixed(2) : '1');
        }
      } catch {
        // Keep defaults if no prior sheet exists
      }
    };
    loadLastSheet();
  }, []);

  const handleGeneratePdf = async () => {
    if (!address || salePriceNum <= 0) {
      toast({ title: 'Missing fields', description: 'Address and sale price are required.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const savePayload = {
        address,
        salePrice: salePriceNum,
        mortgagePayoff: mortgageNum,
        commissionRate: commissionNum,
        commissionAmount: commission,
        listingAgentComm: commission / 2,
        buyerAgentComm: commission / 2,
        closingCosts,
        titleInsurance,
        transferTax,
        estimatedNet: netProceeds,
      };
      const saveRes = await fetch('/api/real-estate/net-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      });
      if (!saveRes.ok) throw new Error('Failed to save net sheet');

      const pdfPayload = {
        propertyAddress: address,
        salePrice: salePriceNum,
        state: '',
        mortgageBalance: mortgageNum,
        commissionRate: commissionNum,
        closingCosts: {
          commission,
          transferTax,
          titleInsurance,
          escrowFee: 0,
          recordingFees: 0,
          total: commission + transferTax + titleInsurance,
        },
        prepaidItems: {
          propertyTaxProration: 0,
          hoaProration: 0,
          homeWarranty: 0,
          total: 0,
        },
        estimatedProceeds: netProceeds,
      };
      const pdfRes = await fetch('/api/real-estate/net-sheet/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfPayload),
      });
      if (!pdfRes.ok) throw new Error('Failed to generate PDF');

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `net-sheet-${address.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Saved', description: 'Net sheet saved to CRM and PDF downloaded.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Could not generate net sheet PDF.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-500 rounded-xl">
          <DollarSign className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Seller Net Sheet</h1>
          <p className="text-muted-foreground">Calculate seller proceeds and closing costs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Property Details
            </CardTitle>
            <CardDescription>Enter the sale details to calculate net proceeds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Property Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Sale Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="salePrice"
                  type="number"
                  placeholder="450000"
                  className="pl-9"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mortgage">Mortgage Balance</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mortgage"
                  type="number"
                  placeholder="250000"
                  className="pl-9"
                  value={mortgageBalance}
                  onChange={(e) => setMortgageBalance(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input
                id="commission"
                type="number"
                placeholder="6"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="closingRate">Closing Costs (%)</Label>
                <Input id="closingRate" type="number" value={closingCostsRate} onChange={(e) => setClosingCostsRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleRate">Title Insurance (%)</Label>
                <Input id="titleRate" type="number" value={titleInsuranceRate} onChange={(e) => setTitleInsuranceRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferRate">Transfer Tax (%)</Label>
                <Input id="transferRate" type="number" value={transferTaxRate} onChange={(e) => setTransferTaxRate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Sheet Summary</CardTitle>
            <CardDescription>Estimated seller proceeds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Sale Price</span>
                <span className="font-medium">{formatCurrency(salePriceNum)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Commission ({commissionRate}%)</span>
                <span className="font-medium text-red-500">-{formatCurrency(commission)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Closing Costs ({closingCostsRate}%)</span>
                <span className="font-medium text-red-500">-{formatCurrency(closingCosts)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Title Insurance ({titleInsuranceRate}%)</span>
                <span className="font-medium text-red-500">-{formatCurrency(titleInsurance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Transfer Tax ({transferTaxRate}%)</span>
                <span className="font-medium text-red-500">-{formatCurrency(transferTax)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Mortgage Payoff</span>
                <span className="font-medium text-red-500">-{formatCurrency(mortgageNum)}</span>
              </div>
              <div className="flex justify-between py-3 bg-muted rounded-lg px-3">
                <span className="font-semibold">Estimated Net Proceeds</span>
                <span className={`font-bold text-lg ${netProceeds >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(netProceeds)}
                </span>
              </div>
            </div>
            <Button className="w-full gap-2" onClick={handleGeneratePdf} disabled={isSaving}>
              <FileText className="h-4 w-4" />
              {isSaving ? 'Saving & Generating...' : 'Save to CRM + Generate PDF'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
