
'use client'

import { ReactNode, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { SidebarNav } from './sidebar-nav'
import { Settings } from 'lucide-react'
import { AIChatAssistant } from './ai-chat-assistant'
import { GlobalVoiceAssistant } from './global-voice-assistant'
import { AIBrainVoiceProvider } from '@/lib/ai-brain-voice-context'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import { GlobalSearchTrigger } from '@/app/components/unified-search'
import { HITLNotificationBell } from '@/components/real-estate/workflows/hitl-notification-bell'
import { ErrorBoundary } from '@/components/error-boundary'

interface DashboardWrapperProps {
  children: ReactNode
}

export function DashboardWrapper({ children }: DashboardWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const { data: session, status, update } = useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Force session refresh on mount ONCE for super admins to detect impersonation state
  useEffect(() => {
    if (status === 'authenticated' && !sessionChecked && mounted) {
      setSessionChecked(true)
      const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
      const hasLocalStorageData =
        typeof window !== 'undefined' &&
        window.localStorage.getItem('impersonationToken')
      if (isSuperAdmin && hasLocalStorageData) {
        update({ trigger: 'checkImpersonation' }).catch((err) => {
          console.error('[AUTH] Session refresh failed:', err)
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mounted, sessionChecked])

  return (
    <AIBrainVoiceProvider>
      {/* Impersonation Banner - Always renders but only shows when impersonating */}
      <ImpersonationBanner />
      
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar - Positioned to account for potential impersonation banner */}
      <aside 
        className={`
          bg-gray-900 flex flex-col fixed h-full z-50 transition-all duration-300 ease-in-out
          ${isSidebarExpanded ? 'w-64' : 'w-16'}
        `}
        style={{ top: '0px' }}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        {/* Logo Section */}
        <div className="p-3 border-b border-gray-800 flex items-center gap-3 h-16 flex-shrink-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 relative">
            <Image
              src="/soshogle-logo.png"
              alt="Soshogle Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          {isSidebarExpanded && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <h1 className="text-white font-bold text-sm leading-tight truncate whitespace-nowrap">Soshogle AI CRM</h1>
              <p className="text-gray-400 text-xs truncate whitespace-nowrap">Sales Marketing Machine</p>
            </div>
          )}
        </div>

        {/* Navigation - Fills remaining space */}
        {mounted && <SidebarNav isExpanded={isSidebarExpanded} />}
      </aside>

      {/* Main Content */}
      <main 
        className={`
          flex-1 overflow-y-auto transition-all duration-300 ease-in-out
          ${isSidebarExpanded ? 'ml-64' : 'ml-16'}
        `}
      >
        {/* Top Bar with Search */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {session?.user?.name ?? 'Dashboard'}
            </h2>
            <div className="flex items-center gap-4">
              {/* HITL Notification Bell - Only for Real Estate users */}
              {mounted && (
                <ErrorBoundary>
                  <HITLNotificationBell />
                </ErrorBoundary>
              )}
              <div className="w-96">
                <GlobalSearchTrigger />
              </div>
              {/* Admin Settings - Only for AGENCY_ADMIN or SUPER_ADMIN */}
              {mounted && ((session?.user as any)?.role === 'AGENCY_ADMIN' || (session?.user as any)?.role === 'SUPER_ADMIN') && (
                <Link
                  href="/dashboard/admin"
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Admin"
                  aria-label="Admin settings"
                >
                  <Settings className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <ErrorBoundary fallback={<div className="p-6 text-center text-gray-600">Something went wrong loading this page. Please refresh or try again.</div>}>
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* AI Assistant */}
      {mounted && (
        <ErrorBoundary>
          <AIChatAssistant />
        </ErrorBoundary>
      )}

      {/* Global Voice Assistant */}
      {mounted && (
        <ErrorBoundary>
          <GlobalVoiceAssistant />
        </ErrorBoundary>
      )}
    </div>
    </AIBrainVoiceProvider>
  )
}
