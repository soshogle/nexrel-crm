
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CreditCard, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

interface BnplCheckoutProps {
  purchaseAmount: number; // in cents
  merchantName?: string;
  productDescription?: string;
  orderId?: string;
  onSuccess?: (applicationId: string) => void;
  onCancel?: () => void;
}

interface EligibilityResult {
  eligible: boolean;
  creditScore: number;
  riskLevel: string;
  maxAllowed: number;
  message: string;
}

export function BnplCheckout({
  purchaseAmount,
  merchantName = 'Merchant',
  productDescription,
  orderId,
  onSuccess,
  onCancel,
}: BnplCheckoutProps) {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Available installment plans
  const plans = [
    {
      installments: 4,
      interestRate: 0,
      description: '4 payments, 0% APR',
      popular: true,
    },
    {
      installments: 6,
      interestRate: 5,
      description: '6 payments, 5% APR',
      popular: false,
    },
    {
      installments: 12,
      interestRate: 12,
      description: '12 payments, 12% APR',
      popular: false,
    },
  ];

  useEffect(() => {
    checkEligibility();
  }, [purchaseAmount]);

  const checkEligibility = async () => {
    try {
      setChecking(true);
      const response = await fetch('/api/payments/bnpl/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseAmount }),
      });

      if (response.ok) {
        const data = await response.json();
        setEligibility(data);
      } else {
        toast.error('Failed to check BNPL eligibility');
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast.error('Failed to check BNPL eligibility');
    } finally {
      setChecking(false);
    }
  };

  const calculateInstallmentAmount = (planInstallments: number, planInterestRate: number) => {
    const downPayment = Math.floor(purchaseAmount * 0.1); // 10% down
    const financedAmount = purchaseAmount - downPayment;
    const interest = Math.floor(financedAmount * (planInterestRate / 100) * (planInstallments / 12));
    const totalRepayment = financedAmount + interest;
    return Math.ceil(totalRepayment / planInstallments);
  };

  const handleApply = async () => {
    if (!selectedPlan) {
      toast.error('Please select a payment plan');
      return;
    }

    try {
      setLoading(true);
      const plan = plans.find(p => p.installments === selectedPlan)!;
      
      const response = await fetch('/api/payments/bnpl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseAmount,
          downPayment: Math.floor(purchaseAmount * 0.1),
          installmentCount: plan.installments,
          interestRate: plan.interestRate,
          merchantName,
          productDescription,
          orderId,
          autoApprove: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.approved) {
          toast.success('BNPL application approved!');
          onSuccess?.(result.applicationId);
        } else {
          toast.error(`Application denied: ${result.denialReason}`);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to process BNPL application');
      }
    } catch (error) {
      console.error('Error applying for BNPL:', error);
      toast.error('Failed to process BNPL application');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buy Now, Pay Later</CardTitle>
          <CardDescription>Checking eligibility...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility?.eligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buy Now, Pay Later</CardTitle>
          <CardDescription>
            <Badge variant="outline" className="mr-2">Demo Mode</Badge>
            Split your purchase into easy payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Not Eligible</p>
              <p className="text-sm text-red-700 mt-1">{eligibility?.message}</p>
              <p className="text-xs text-red-600 mt-2">
                Your credit score: {eligibility?.creditScore} | Risk level: {eligibility?.riskLevel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Buy Now, Pay Later
        </CardTitle>
        <CardDescription>
          <Badge variant="outline" className="mr-2">Demo Mode</Badge>
          Split your purchase into easy installments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Eligibility Status */}
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">You're Eligible!</p>
            <p className="text-sm text-green-700 mt-1">{eligibility.message}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-green-600">
              <span>Credit Score: {eligibility.creditScore}</span>
              <span>•</span>
              <span>Risk Level: {eligibility.riskLevel}</span>
            </div>
          </div>
        </div>

        {/* Purchase Summary */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Purchase Amount</span>
            <span className="font-medium">${(purchaseAmount / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Down Payment (10%)</span>
            <span className="font-medium text-green-600">
              -${(Math.floor(purchaseAmount * 0.1) / 100).toFixed(2)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Amount to Finance</span>
            <span className="font-bold">
              ${(Math.floor(purchaseAmount * 0.9) / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Plans */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Choose Your Payment Plan
          </Label>
          <RadioGroup value={selectedPlan?.toString() || ''} onValueChange={(value) => setSelectedPlan(parseInt(value))}>
            <div className="space-y-3">
              {plans.map((plan) => {
                const installmentAmount = calculateInstallmentAmount(plan.installments, plan.interestRate);
                return (
                  <div
                    key={plan.installments}
                    className={`relative flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedPlan === plan.installments
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPlan(plan.installments)}
                  >
                    <RadioGroupItem value={plan.installments.toString()} id={`plan-${plan.installments}`} />
                    <div className="flex-1">
                      <Label
                        htmlFor={`plan-${plan.installments}`}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{plan.description}</span>
                            {plan.popular && (
                              <Badge variant="default" className="text-xs">Popular</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Pay ${(installmentAmount / 100).toFixed(2)} every 2 weeks
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            ${(installmentAmount / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">per payment</p>
                        </div>
                      </Label>
                    </div>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        {/* Summary */}
        {selectedPlan && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Payment Summary
            </div>
            <Separator />
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Today's payment:</span>
                <span className="font-medium">
                  ${(Math.floor(purchaseAmount * 0.1) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Remaining payments:</span>
                <span className="font-medium">
                  {selectedPlan} × ${(calculateInstallmentAmount(selectedPlan, plans.find(p => p.installments === selectedPlan)!.interestRate) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>First payment due:</span>
                <span>In 14 days</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleApply}
            disabled={!selectedPlan || loading}
            className="flex-1"
            size="lg"
          >
            {loading ? 'Processing...' : 'Apply for BNPL'}
          </Button>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              size="lg"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center">
          This is a demo mode. No actual credit check or payment processing will occur.
        </p>
      </CardContent>
    </Card>
  );
}
