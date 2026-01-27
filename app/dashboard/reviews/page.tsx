
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Star } from 'lucide-react'

export const dynamic = "force-dynamic"

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Star className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Reviews & Reputation</h1>
          <p className="text-muted-foreground">Monitor and manage your business reviews</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
        <Star className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-white">Reviews Coming Soon</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Track and respond to reviews from Google, Yelp, Facebook, and other platforms 
          all in one place.
        </p>
      </div>
    </div>
  )
}
