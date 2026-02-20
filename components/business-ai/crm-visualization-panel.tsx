'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Activity, Target, X } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CrmVisualizationPanelProps {
  crmStatistics: any;
  onClose: () => void;
}

export function CrmVisualizationPanel({ crmStatistics, onClose }: CrmVisualizationPanelProps) {
  return (
    <Card
      data-visualization-section
      className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          CRM Statistics Visualization
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scenario Result */}
          {crmStatistics.scenarioResult && (
            <Card className="md:col-span-2 border-2 border-emerald-200/50 shadow-xl bg-gradient-to-br from-white/95 to-emerald-50/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  <Target className="h-5 w-5 text-emerald-600" />
                  What If: {crmStatistics.scenarioResult.scenario}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{crmStatistics.scenarioResult.assumption}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-white/60 rounded-lg border border-emerald-200">
                    <p className="text-xs text-gray-500">Projected Impact</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {crmStatistics.scenarioResult.unit === 'revenue' ? '$' : ''}
                      {crmStatistics.scenarioResult.impact.toLocaleString()}
                      {crmStatistics.scenarioResult.unit === 'revenue' ? '' : ' potential'}
                    </p>
                  </div>
                  {crmStatistics.scenarioResult.impactPercent != null && (
                    <div className="p-3 bg-white/60 rounded-lg border border-emerald-200">
                      <p className="text-xs text-gray-500">Increase</p>
                      <p className="text-xl font-bold text-emerald-600">+{crmStatistics.scenarioResult.impactPercent.toFixed(0)}%</p>
                    </div>
                  )}
                  <div className="p-3 bg-white/60 rounded-lg border border-emerald-200">
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className="text-xl font-bold text-emerald-600">{crmStatistics.scenarioResult.confidence}%</p>
                  </div>
                  <div className="p-3 bg-white/60 rounded-lg border border-emerald-200 col-span-2 md:col-span-1">
                    <p className="text-xs text-gray-500">Formula</p>
                    <p className="text-sm font-medium text-gray-700">{crmStatistics.scenarioResult.formula}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dynamic Charts */}
          {crmStatistics.dynamicCharts && crmStatistics.dynamicCharts.length > 0 && (
            <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {crmStatistics.dynamicCharts.map((chart: any, idx: number) => (
                <Card key={idx} className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{chart.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      {chart.chartType === 'pie' ? (
                        <PieChart>
                          <Pie data={chart.data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value" animationDuration={1000}>
                            {chart.data.map((_: any, i: number) => {
                              const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
                              return <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />;
                            })}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      ) : chart.chartType === 'bar' ? (
                        <BarChart data={chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip formatter={(v: any) => chart.dimension?.includes('revenue') ? `$${Number(v).toLocaleString()}` : v} />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} animationDuration={1000} />
                        </BarChart>
                      ) : (
                        <LineChart data={chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => chart.dimension?.includes('revenue') ? `$${v}` : String(v)} />
                          <Tooltip formatter={(v: any) => chart.dimension?.includes('revenue') ? `$${Number(v).toLocaleString()}` : v} />
                          <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} animationDuration={1000} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white/50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Total Leads</p>
              <p className="text-3xl font-bold text-purple-600">{crmStatistics.totalLeads}</p>
            </div>
            <div className="text-center p-4 bg-white/50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Open Deals</p>
              <p className="text-3xl font-bold text-green-600">{crmStatistics.openDeals}</p>
            </div>
            <div className="text-center p-4 bg-white/50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-600">${crmStatistics.totalRevenue?.toLocaleString() || 0}</p>
            </div>
            <div className="text-center p-4 bg-white/50 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Campaigns</p>
              <p className="text-3xl font-bold text-orange-600">{crmStatistics.totalCampaigns}</p>
            </div>
          </div>

          {/* Enhanced Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {crmStatistics.monthlyRevenue && (
              <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {crmStatistics.comparisonData ? 'Sales Comparison (Last 7 Months)' : 'Monthly Revenue Trend'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={Object.entries(crmStatistics.monthlyRevenue).map(([month, revenue]) => ({
                        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                        current: revenue as number,
                        ...(crmStatistics.comparisonData?.monthlyRevenue && { previous: crmStatistics.comparisonData.monthlyRevenue[month] || 0 }),
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                        </linearGradient>
                        {crmStatistics.comparisonData && (
                          <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.1}/>
                          </linearGradient>
                        )}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value: any) => `$${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="current" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} name="Current Period" animationDuration={1000} />
                      {crmStatistics.comparisonData && (
                        <Line type="monotone" dataKey="previous" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', r: 4 }} activeDot={{ r: 6 }} name="Previous Period" animationDuration={1000} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card className="border-2 border-pink-200/50 shadow-xl bg-gradient-to-br from-white/95 to-pink-50/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">CRM Metrics Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart margin={{ top: 10, right: 10, bottom: 70, left: 10 }}>
                    <Pie
                      data={[
                        { name: 'Leads', value: crmStatistics.totalLeads },
                        { name: 'Deals', value: crmStatistics.totalDeals },
                        { name: 'Open Deals', value: crmStatistics.openDeals },
                        { name: 'Campaigns', value: crmStatistics.totalCampaigns },
                      ].filter(item => item.value > 0)}
                      cx="50%" cy="50%" labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100} fill="#8884d8" dataKey="value" animationDuration={1000} animationBegin={0}
                    >
                      {[
                        { name: 'Leads', value: crmStatistics.totalLeads },
                        { name: 'Deals', value: crmStatistics.totalDeals },
                        { name: 'Open Deals', value: crmStatistics.openDeals },
                        { name: 'Campaigns', value: crmStatistics.totalCampaigns },
                      ].filter(item => item.value > 0).map((_, index) => {
                        const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={56} wrapperStyle={{ paddingTop: 8 }} formatter={(value) => <span className="text-sm text-gray-700">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Leads */}
          {crmStatistics.recentLeads && crmStatistics.recentLeads.length > 0 && (
            <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-blue-50/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {crmStatistics.recentLeads.slice(0, 5).map((lead: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.status}</p>
                      </div>
                      <Badge variant="outline">{new Date(lead.createdAt).toLocaleDateString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
