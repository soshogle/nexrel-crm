'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Mail, Lock, Sparkles } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Clear any impersonation data when signin form loads
  // This ensures clean state when user logs out and logs back in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('impersonationToken');
      localStorage.removeItem('impersonatedUserId');
      localStorage.removeItem('impersonatedUserName');
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
        setIsLoading(false)
      } else if (result?.ok) {
        // Give NextAuth time to set the cookie properly
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Fetch user role to determine redirect
        const response = await fetch('/api/user/profile')
        const userData = await response.json()
        
        // Use window.location for proper full-page redirect with cookie
        if (userData.role === 'SUPER_ADMIN') {
          window.location.href = '/platform-admin'
        } else if (userData.parentRole === true || userData.role === 'PARENT') {
          window.location.href = '/dashboard/clubos/parent'
        } else {
          window.location.href = '/dashboard'
        }
        // Don't set isLoading(false) here - page is redirecting
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError('')
    
    try {
      await signIn('google', { 
        callbackUrl: '/dashboard'
      })
    } catch (error) {
      setError('Failed to sign in with Google. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="relative w-12 h-12">
              <Image
                src="/soshogle-logo.png"
                alt="Soshogle AI CRM Logo - Desktop Sidebar"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-2xl font-bold gradient-text">Soshogle AI CRM</span>
              <p className="text-xs text-gray-300">Sales Marketing Machine</p>
            </div>
          </Link>
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6">
            Welcome back to
            <br />
            <span className="gradient-text">your command center</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-md">
            Manage your leads, automate outreach, and grow your business with intelligent AI-powered tools.
          </p>
          
          {/* Decorative Stats */}
          <div className="mt-12 space-y-4">
            <div className="glass-effect rounded-lg p-4 max-w-xs">
              <div className="text-sm text-gray-300 mb-1">Active Users</div>
              <div className="text-2xl font-bold gradient-text">500+</div>
            </div>
            <div className="glass-effect rounded-lg p-4 max-w-xs">
              <div className="text-sm text-gray-300 mb-1">Leads Managed</div>
              <div className="text-2xl font-bold gradient-text">10,000+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="relative w-10 h-10">
              <Image
                src="/soshogle-logo.png"
                alt="Soshogle AI CRM Logo - Mobile"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-xl font-bold gradient-text">Soshogle AI CRM</span>
              <p className="text-xs text-gray-500">Sales Marketing Machine</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">
                <span className="gradient-text">Welcome Back</span>
              </h2>
              <p className="text-gray-400">
                Sign in to access your CRM dashboard
              </p>
            </div>

            {/* Google Sign In */}
            <Button
                type="button"
                variant="outline"
                className="w-full mb-6 h-12 bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors text-white"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in with Google...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-2 text-gray-400">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert
                  variant="destructive"
                  className="border-destructive/50 bg-red-900/20"
                  data-testid="signin-error"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 bg-gray-800 border-gray-700 focus:ring-primary focus:border-primary text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300">Password</Label>
                  <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 bg-gray-800 border-gray-700 focus:ring-primary focus:border-primary text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 gradient-primary text-white hover:opacity-90 transition-opacity font-medium" 
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-400">Don't have an account? </span>
              <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </div>

          {/* Back to Home Link */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
