
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  AlertCircle, 
  Search, 
  MapPin, 
  Star,
  Phone,
  Globe,
  Mail,
  Plus,
  Settings,
  ExternalLink,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface Place {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  website?: string
  rating?: number
  user_ratings_total?: number
  business_status?: string
  types: string[]
}

export function GooglePlacesSearch() {
  const router = useRouter()
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<Place[]>([])
  const [error, setError] = useState('')
  const [addingLead, setAddingLead] = useState<string | null>(null)

  useEffect(() => {
    checkApiKey()
  }, [])

  const checkApiKey = async () => {
    try {
      const response = await fetch('/api/api-keys/google-places')
      if (response.ok) {
        const data = await response.json()
        setHasApiKey(data.hasKey)
      } else {
        setHasApiKey(false)
      }
    } catch (error) {
      console.error('Error checking API key:', error)
      setHasApiKey(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    setError('')
    setResults([])

    if (!location.trim() || !category.trim()) {
      setError('Please enter both location and business category')
      setIsSearching(false)
      return
    }

    try {
      const response = await fetch('/api/google-places/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          category,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
        if (data.results?.length === 0) {
          setError('No businesses found. Try different search terms.')
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      setError('An error occurred during search')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddLead = async (place: Place) => {
    setAddingLead(place.place_id)
    
    try {
      const leadData = {
        businessName: place.name,
        email: '', // Google Places API doesn't provide email
        phone: place.formatted_phone_number || '',
        website: place.website || '',
        address: place.formatted_address || '',
        businessCategory: place.types?.[0]?.replace(/_/g, ' ') || '',
        googlePlaceId: place.place_id,
        rating: place.rating || null,
        status: 'NEW',
        source: 'google_places'
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      })

      if (response.ok) {
        const lead = await response.json()
        router.push(`/dashboard/leads/${lead.id}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add lead')
      }
    } catch (error) {
      console.error('Add lead error:', error)
      setError('An error occurred while adding the lead')
    } finally {
      setAddingLead(null)
    }
  }

  if (hasApiKey === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (hasApiKey === false) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Google Places API Key Required
          </CardTitle>
          <CardDescription>
            To search for leads using Google Places, you need to configure your API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need a Google Places API key to use this feature. The key will be stored securely in your account.
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center">
            <Button asChild>
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4 mr-2" />
                Configure API Key
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/leads">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Form */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Search Parameters
              </CardTitle>
              <CardDescription>
                Enter location and business type to find leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., New York, NY"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Business Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., restaurants, dentists, lawyers"
                    required
                  />
                </div>

                <Button type="submit" className="w-full gradient-primary text-white hover:opacity-90" disabled={isSearching}>
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search Places
                    </>
                  )}
                </Button>
              </form>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Search Results</h2>
                <p className="text-sm text-muted-foreground">
                  {results.length} businesses found
                </p>
              </div>

              <div className="space-y-4">
                {results.map((place) => (
                  <Card key={place.place_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg">{place.name}</h3>
                            {place.business_status === 'OPERATIONAL' && (
                              <Badge variant="secondary" className="bg-success/10 text-success border border-success/20">
                                Open
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>{place.formatted_address}</span>
                            </div>
                            
                            {place.formatted_phone_number && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span>{place.formatted_phone_number}</span>
                              </div>
                            )}
                            
                            {place.website && (
                              <div className="flex items-center">
                                <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                                <a 
                                  href={place.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center"
                                >
                                  {place.website}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            )}
                            
                            {place.rating && (
                              <div className="flex items-center">
                                <Star className="h-4 w-4 mr-2 text-yellow-500 fill-current" />
                                <span>
                                  {place.rating} ({place.user_ratings_total} reviews)
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {place.types?.slice(0, 3).map((type) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button 
                          onClick={() => handleAddLead(place)}
                          disabled={addingLead === place.place_id}
                          className="ml-4"
                        >
                          {addingLead === place.place_id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Lead
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && !isSearching && !error && (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start Your Search</h3>
                  <p className="text-muted-foreground">
                    Enter a location and business category to find potential leads
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
