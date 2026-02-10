
'use client'

import { ReactNode, useState, useEffect } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { SidebarNav } from './sidebar-nav'
import { AIChatAssistant } from './ai-chat-assistant'
import { GlobalVoiceAssistant } from './global-voice-assistant'
import { AIBrainVoiceProvider } from '@/lib/ai-brain-voice-context'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import { GlobalSearchTrigger } from '@/app/components/unified-search'
import { HITLNotificationBell } from '@/components/real-estate/workflows/hitl-notification-bell'
import { HITLApprovalBanner } from '@/components/real-estate/workflows/hitl-approval-banner'

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

  // Force session refresh on mount ONCE to ensure impersonation state is detected
  useEffect(() => {
    // Only run once when status becomes authenticated and hasn't been checked yet
    if (status === 'authenticated' && !sessionChecked && mounted) {
      setSessionChecked(true) // Prevent future runs
      
      console.log('🔄 Dashboard mounted - checking session once...')
      
      // Check localStorage for impersonation data
      const hasLocalStorageData = typeof window !== 'undefined' && 
        window.localStorage.getItem('impersonationToken');
      
      if (hasLocalStorageData) {
        console.log('📋 Found impersonation data in localStorage, refreshing session...')
        // Only update if we have impersonation data
        update({ trigger: 'checkImpersonation' }).then(async (updatedSession) => {
          console.log('✅ Session refreshed:', {
            hasSession: !!updatedSession,
            userId: updatedSession?.user?.id,
            userName: updatedSession?.user?.name,
            isImpersonating: updatedSession?.user?.isImpersonating,
            superAdminId: updatedSession?.user?.superAdminId,
            superAdminName: updatedSession?.user?.superAdminName,
          })
        }).catch(err => {
          console.error('❌ Session refresh failed:', err)
        })
      } else {
        console.log('✅ No impersonation data - using current session')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mounted, sessionChecked]) // Removed 'update' from dependencies to prevent infinite loop

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

      {/* HITL Approval Banner - Fixed at top */}
      <HITLApprovalBanner />

      {/* Main Content */}
      <main 
        className={`
          flex-1 overflow-y-auto transition-all duration-300 ease-in-out
          ${isSidebarExpanded ? 'ml-64' : 'ml-16'}
        `}
      >
        {/* Top Bar with Search */}
        <div className={`sticky top-0 z-40 bg-white border-b border-gray-200 px-8 py-4 ${mounted && (session?.user as any)?.industry === 'REAL_ESTATE' ? 'pt-20' : ''}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {session?.user?.name ? `Welcome, ${session.user.name}` : 'Dashboard'}
            </h2>
            <div className="flex items-center gap-4">
              {/* HITL Notification Bell - Only for Real Estate users */}
              {mounted && <HITLNotificationBell />}
              <div className="w-96">
                <GlobalSearchTrigger />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {children}
        </div>
      </main>

      {/* AI Assistant */}
      {mounted && <AIChatAssistant />}

      {/* Global Voice Assistant */}
      {mounted && <GlobalVoiceAssistant />}
    </div>
    </AIBrainVoiceProvider>
  )
}
