import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { SessionProvider } from '@/components/providers/session-provider'
import { IntlProviderWrapper } from '@/components/providers/intl-provider-wrapper'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = "force-dynamic"
// Trigger redeploy

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Soshogle AI CRM - Sales Marketing Machine',
  description: 'Power your sales with Soshogle AI CRM. AI-powered lead management, automated outreach, and smart reputation tools to close more deals.',
  icons: {
    icon: '/soshogle-logo.png',
    shortcut: '/soshogle-logo.png',
  },
  openGraph: {
    title: 'Soshogle AI CRM - Sales Marketing Machine',
    description: 'Power your sales with Soshogle AI CRM. AI-powered lead management, automated outreach, and smart reputation tools to close more deals.',
    images: ['/soshogle-logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          <IntlProviderWrapper>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
              <SonnerToaster />
            </ThemeProvider>
          </IntlProviderWrapper>
        </SessionProvider>
      </body>
    </html>
  )
}
