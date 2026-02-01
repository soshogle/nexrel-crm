'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Calculator, FileText } from 'lucide-react';

export default function SellerNetSheetPage() {
  const [salePrice, setSalePrice] = useState('');
  const [mortgageBalance, setMortgageBalance] = useState('');
  const [commissionRate, setCommissionRate] = useState('6');

  const salePriceNum = parseFloat(salePrice) || 0;
  const mortgageNum = parseFloat(mortgageBalance) || 0;
  const commissionNum = parseFloat(commissionRate) || 0;

  const commission = salePriceNum * (commissionNum / 100);
  const closingCosts = salePriceNum * 0.02; // Estimated 2%
  const titleInsurance = salePriceNum * 0.005; // Estimated 0.5%
  const transferTax = salePriceNum * 0.01; // Estimated 1%
  const totalDeductions = commission + closingCosts + titleInsurance + transferTax + mortgageNum;
  const netProceeds = salePriceNum - totalDeductions;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
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
                <span className="text-muted-foreground">Closing Costs (est. 2%)</span>
                <span className="font-medium text-red-500">-{formatCurrency(closingCosts)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Title Insurance (est. 0.5%)</span>
                <span className="font-medium text-red-500">-{formatCurrency(titleInsurance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Transfer Tax (est. 1%)</span>
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
            <Button className="w-full gap-2">
              <FileText className="h-4 w-4" />
              Generate PDF Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
