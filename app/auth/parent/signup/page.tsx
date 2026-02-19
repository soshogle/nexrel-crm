
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, CheckCircle2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

function ParentSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams?.get('code') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [clubOwnerName, setClubOwnerName] = useState('');
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [clubInfo, setClubInfo] = useState<any>(null);
  const [isLoadingClub, setIsLoadingClub] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    clubCode: codeFromUrl,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get subdomain from cookies (set by middleware) and fetch club info
  useEffect(() => {
    const getSubdomain = () => {
      const cookies = document.cookie.split(';');
      const subdomainCookie = cookies.find(c => c.trim().startsWith('tenant-subdomain='));
      if (subdomainCookie) {
        return subdomainCookie.split('=')[1];
      }
      return null;
    };

    const sub = getSubdomain();
    setSubdomain(sub);

    // If subdomain exists, fetch club info and use it instead of club code
    if (sub) {
      fetchClubInfo(sub);
    }
  }, []);

  const fetchClubInfo = async (sub: string) => {
    setIsLoadingClub(true);
    try {
      const response = await fetch(`/api/subdomain/resolve/${sub}`);
      if (response.ok) {
        const data = await response.json();
        setClubInfo(data);
        setClubOwnerName(data.businessName || '');
        // Don't require club code if we have subdomain
        setFormData(prev => ({ ...prev, clubCode: 'subdomain-' + sub }));
      } else {
        console.error('Unable to load club information');
      }
    } catch (error) {
      console.error('Error fetching club info:', error);
    } finally {
      setIsLoadingClub(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.name) newErrors.name = 'Full name is required';
    if (!formData.clubCode) newErrors.clubCode = 'Club code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/parent/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // CRITICAL FIX: Auto-sign in the parent and redirect to parent portal
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        setSuccess(true);
        setClubOwnerName(data.household?.clubOwnerName || 'the club');
        toast.success('Account created! Redirecting to your portal...');
        
        // Redirect to parent portal immediately
        setTimeout(() => {
          router.push('/dashboard/clubos/parent');
        }, 2000);
      } else {
        // If auto sign-in fails, show success and redirect to signin
        setSuccess(true);
        setClubOwnerName(data.household?.clubOwnerName || 'the club');
        toast.success(data.message);
        
        setTimeout(() => {
          router.push('/auth/signin?callbackUrl=/dashboard/clubos/parent');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Registration Complete!</CardTitle>
            <CardDescription>
              Your account is ready! You can now sign in and start browsing programs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Trophy className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <strong>Instant Access Granted!</strong> You can now sign in, browse programs, register your children, and make payments. Payment is required at the time of registration.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              Redirecting to sign in...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-purple-500/10">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold gradient-text">Parent Signup</CardTitle>
          <CardDescription>
            Create an account to manage your family's sports activities
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Club Code */}
            <div className="space-y-2">
              <Label htmlFor="clubCode">Club Code *</Label>
              <Input
                id="clubCode"
                name="clubCode"
                type="text"
                placeholder="Enter your club code"
                value={formData.clubCode}
                onChange={handleChange}
                disabled={!!codeFromUrl}
                className={errors.clubCode ? 'border-red-500' : ''}
              />
              {errors.clubCode && (
                <p className="text-sm text-red-500">{errors.clubCode}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Get this code from your club administrator
              </p>
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Account Information</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Smith"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john.smith@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information (Optional) */}
            <div className="space-y-4">
              <h3 className="font-semibold">Address (Optional)</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="123 Main St"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    placeholder="Springfield"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    type="text"
                    placeholder="IL"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    placeholder="62701"
                    value={formData.zipCode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact (Optional) */}
            <div className="space-y-4">
              <h3 className="font-semibold">Emergency Contact (Optional)</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContact"
                    name="emergencyContact"
                    type="text"
                    placeholder="Jane Smith"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                  <Input
                    id="emergencyPhone"
                    name="emergencyPhone"
                    type="tel"
                    placeholder="(555) 987-6543"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ParentSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <ParentSignupForm />
    </Suspense>
  );
}
