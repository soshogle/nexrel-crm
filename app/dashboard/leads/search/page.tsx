
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GooglePlacesSearch } from '@/components/leads/google-places-search'

export default async function SearchLeadsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Search Google Places</h1>
          <p className="text-muted-foreground">Find and import leads from Google Places API</p>
        </div>
      </div>

      <GooglePlacesSearch />
    </div>
  )
}
