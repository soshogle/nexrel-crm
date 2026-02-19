import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { SessionProvider } from '@/components/providers/session-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { IntlProviderWrapper } from '@/components/providers/intl-provider-wrapper'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = "force-dynamic"
// Trigger redeploy

function getMetadataBase(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://nexrel.soshogle.com'
}

export const metadata: Metadata = {
  metadataBase: new URL(getMetadataBase()),
  title: 'Soshogle AI Business Automation Ecosystem',
  description: 'Power your business with Soshogle AI CRM. AI-powered lead management, automated outreach, and smart reputation management to close more deals.',
  icons: {
    icon: '/soshogle-logo.png',
    shortcut: '/soshogle-logo.png',
  },
  openGraph: {
  title: 'Soshogle AI Business Automation Ecosystem',
    title: '',
    description: 'Power your businesswith Soshogle AI CRM. AI-powered lead management, automated outreach, and smart reputation management tools to close more deals.',
    images: [
      {
        url: '/soshogle-logo.png',
        width: 512,
        height: 512,
        alt: 'Soshogle AI CRM',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soshogle AI CRM - Business Automation Ecosystem',
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
          <QueryProvider>
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
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
