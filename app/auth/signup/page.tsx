'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, AlertCircle, Mail } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <UserPlus className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign Up Disabled</CardTitle>
          <CardDescription>
            Public account creation is not available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              To use this CRM, you must either purchase a subscription plan or be invited by an administrator.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Button asChild className="w-full" variant="outline">
              <a href="mailto:sales@soshogle.com">
                <Mail className="mr-2 h-4 w-4" />
                Contact sales@soshogle.com
              </a>
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-purple-600 hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-purple-600 hover:underline">
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
