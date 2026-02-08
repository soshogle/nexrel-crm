/**
 * Team Performance Card Component
 * Phase 4: Team productivity and performance metrics
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Award, Target } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  production: number;
  cases: number;
  efficiency: number;
  trend: 'up' | 'down' | 'stable';
}

interface TeamPerformanceCardProps {
  teamMembers: TeamMember[];
  onViewDetails?: () => void;
}

export function TeamPerformanceCard({ teamMembers, onViewDetails }: TeamPerformanceCardProps) {
  const topPerformer = teamMembers.reduce((prev, current) => 
    (prev.production > current.production) ? prev : current
  );

  return (
    <Card 
      className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={onViewDetails}
    >
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900">Team Performance</CardTitle>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {teamMembers.length} members
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-3">
          {/* Top Performer */}
          <div className="p-2 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{topPerformer.name}</p>
                  <p className="text-xs text-gray-600">{topPerformer.role}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900">${topPerformer.production.toLocaleString()}</p>
                <p className="text-xs text-gray-600">{topPerformer.cases} cases</p>
              </div>
            </div>
          </div>

          {/* Team Members List */}
          {teamMembers.slice(0, 4).map((member) => (
            <div key={member.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{member.name}</p>
                  <p className="text-xs text-gray-600">{member.role}</p>
                </div>
              </div>
              <div className="text-right ml-2">
                <p className="text-xs font-bold text-gray-900">${member.production.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Target className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">{member.efficiency}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
