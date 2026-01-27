
'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Users, 
  UserPlus, 
  Trophy, 
  TrendingUp,
  Eye,
  ArrowRight,
  Clock,
  Brain,
  Sparkles
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  totalLeads: number
  newLeads: number
  qualifiedLeads: number
  convertedLeads: number
}

interface RecentLead {
  id: string
  businessName: string
  status: string
  createdAt: string | Date
  email?: string | null
  phone?: string | null
}

interface DashboardOverviewProps {
  stats: DashboardStats
  recentLeads: RecentLead[]
}

export function DashboardOverview({ stats, recentLeads }: DashboardOverviewProps) {
  const statCards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'All leads in system'
    },
    {
      title: 'New Leads',
      value: stats.newLeads,
      icon: UserPlus,
      color: 'text-success',
      bgColor: 'bg-success/10',
      description: 'Leads to contact'
    },
    {
      title: 'Qualified',
      value: stats.qualifiedLeads,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      description: 'Promising prospects'
    },
    {
      title: 'Converted',
      value: stats.convertedLeads,
      icon: Trophy,
      color: 'text-success',
      bgColor: 'bg-success/10',
      description: 'Successful conversions'
    },
  ]

  const getStatusColor = (status: string) => {
    const colors = {
      NEW: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      CONTACTED: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      RESPONDED: 'bg-green-500/20 text-green-300 border border-green-500/30',
      QUALIFIED: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      CONVERTED: 'bg-green-500/20 text-green-300 border border-green-500/30',
      LOST: 'bg-red-500/20 text-red-300 border border-red-500/30',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-700 text-gray-300 border border-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-purple-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-400">
                      {stat.title}
                    </p>
                    <motion.p 
                      className="text-3xl font-bold gradient-text"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      {stat.value}
                    </motion.p>
                    <p className="text-xs text-gray-400">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* AI Brain Feature Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Link href="/dashboard/ai-brain">
          <div className="relative p-8 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-gray-900 rounded-xl border-2 border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer overflow-hidden group">
            {/* Background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-purple-500/20 border border-purple-500/30">
                  <Brain className="h-12 w-12 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      Central AI Brain
                      <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
                    </h3>
                    <Badge className="bg-purple-500 text-white border-0">
                      Powered by AI
                    </Badge>
                  </div>
                  <p className="text-gray-300 text-lg mb-2">
                    Get intelligent insights, predictions, and automation recommendations
                  </p>
                  <p className="text-gray-400 text-sm">
                    AI-powered analysis of your leads, deals, and business performance
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button className="gradient-button group-hover:scale-105 transition-transform" size="lg">
                  View AI Insights
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span>Predictive Analytics</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="flex flex-row items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Recent Leads
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Your latest lead additions
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Link href="/dashboard/leads">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="p-6">
              {recentLeads.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leads yet</p>
                  <Button asChild className="mt-4 gradient-primary text-white hover:opacity-90" size="sm">
                    <Link href="/dashboard/leads/new">Add your first lead</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-purple-500/50 hover:bg-gray-800 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-white">{lead.businessName}</h4>
                          <Badge 
                            variant="secondary" 
                            className={getStatusColor(lead.status)}
                          >
                            {lead.status.toLowerCase()}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-gray-400">
                          {lead.email && (
                            <span className="mr-3">{lead.email}</span>
                          )}
                          {lead.phone && (
                            <span>{lead.phone}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Added {formatDistanceToNow(new Date(lead.createdAt))} ago
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="hover:bg-purple-500/10 hover:text-purple-400 text-gray-400">
                        <Link href={`/dashboard/leads/${lead.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              <p className="text-sm text-gray-400 mt-1">
                Common tasks to manage your leads
              </p>
            </div>
            <div className="p-6 space-y-4">
              <Button asChild className="w-full justify-start gradient-primary text-white hover:opacity-90" size="lg">
                <Link href="/dashboard/leads/new">
                  <UserPlus className="h-5 w-5 mr-3" />
                  Add New Lead
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start border-2 border-gray-700 hover:bg-purple-500/5 hover:border-purple-500/50 text-gray-300 transition-colors" size="lg">
                <Link href="/dashboard/leads/search">
                  <Users className="h-5 w-5 mr-3" />
                  Search Google Places
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start border-2 border-gray-700 hover:bg-purple-500/5 hover:border-purple-500/50 text-gray-300 transition-colors" size="lg">
                <Link href="/dashboard/messages">
                  <TrendingUp className="h-5 w-5 mr-3" />
                  AI Message Generator
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
