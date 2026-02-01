export const dynamic = 'force-dynamic';


import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CampaignDetail } from '@/components/campaigns/campaign-detail'

export const dynamic = 'force-dynamic'

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  return <CampaignDetail campaignId={params.id} />
}
