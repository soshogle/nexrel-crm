
'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  User,
  Menu,
  Plus,
  Search,
  Send,
  UserPlus,
  Phone,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'Voice AI', href: '/dashboard/voice-agents', icon: Phone },
  { name: 'Conversation Intelligence', href: '/dashboard/conversation-intelligence', icon: Activity },
  { name: 'AI Automations', href: '/dashboard/ai-automations', icon: Send },
  { name: 'Referrals', href: '/dashboard/referrals', icon: UserPlus },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface DashboardNavProps {
  session: Session
}

export function DashboardNav({ session }: DashboardNavProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                  <Image
                    src="/soshogle-logo.png"
                    alt="Soshogle AI CRM Logo - Dashboard Navigation Loading"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <span className="font-bold text-xl text-gray-900">
                    Soshogle AI CRM
                  </span>
                  <p className="text-xs text-gray-500">Sales Marketing Machine</p>
                </div>
              </Link>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image
                  src="/soshogle-logo.png"
                  alt="Soshogle AI CRM Logo - Dashboard Navigation"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl text-gray-900">
                  Soshogle AI CRM
                </span>
                <p className="text-xs text-gray-500">Sales Marketing Machine</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:ml-10 md:flex md:space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Actions and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <div className="hidden md:flex items-center space-x-2">
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/dashboard/leads/new">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Lead
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/leads/search">
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </Link>
              </Button>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 rounded-full"
                  aria-label="User menu"
                  title="User menu"
                  onClick={() => {/* Handled by DropdownMenuTrigger */}}
                >
                  <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium" aria-hidden="true">
                      {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session?.user?.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-6">
                  {/* Mobile Quick Actions */}
                  <div className="flex flex-col space-y-2">
                    <Button asChild className="justify-start">
                      <Link href="/dashboard/leads/new" onClick={() => setMobileMenuOpen(false)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Lead
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                      <Link href="/dashboard/leads/search" onClick={() => setMobileMenuOpen(false)}>
                        <Search className="h-4 w-4 mr-2" />
                        Search Leads
                      </Link>
                    </Button>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex flex-col space-y-1">
                    {navigation.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                            pathname === item.href
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          )}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {item.name}
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
