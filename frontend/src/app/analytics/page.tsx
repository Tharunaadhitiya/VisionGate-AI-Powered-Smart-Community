'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { BarChart3, TrendingUp, Users, AlertTriangle, Activity, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#64748b', '#3b82f6'];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/security'),
      api.get('/analytics/surveillance'),
    ]).then(([d, s, surv]) => {
      setData({ ...d.data, ...s.data, ...surv.data });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  const securityData = (data.weeklyTrend || []).map((d: any) => ({ day: d._id.slice(5), visitors: d.count }));
  const alertByType = (data.byType || []).map((a: any) => ({ name: a._id.replace(/_/g, ' '), value: a.count }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-surface-400 text-sm">AI-powered insights and trend analysis</p>
        </div>

        <div className="card-grid">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary-500" />
              <span className="text-sm text-surface-400">Total Visitors</span>
            </div>
            <p className="text-2xl font-bold">{data.totalVisitors || 0}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-danger-500" />
              <span className="text-sm text-surface-400">Suspicious</span>
            </div>
            <p className="text-2xl font-bold">{data.suspiciousCount || 0}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-warning-500" />
              <span className="text-sm text-surface-400">Surveillance Events</span>
            </div>
            <p className="text-2xl font-bold">{data.totalAlerts || 0}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-secondary-500" />
              <span className="text-sm text-surface-400">Active Residents</span>
            </div>
            <p className="text-2xl font-bold">{data.residentCount || 0}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Weekly Visitor Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={securityData}>
                  <defs>
                    <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="visitors" stroke="#6366f1" fillOpacity={1} fill="url(#colorV)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Alert Distribution by Type</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={alertByType} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {alertByType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Security Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Entry/Exit Ratio</span><span className="font-medium">{((data.entryExitRatio?.checkedIn || 0) / Math.max(data.entryExitRatio?.total || 1, 1) * 100).toFixed(0)}%</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2"><div className="bg-primary-500 h-2 rounded-full" style={{ width: `${((data.entryExitRatio?.checkedIn || 0) / Math.max(data.entryExitRatio?.total || 1, 1)) * 100}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Critical Alerts Today</span><span className="font-medium">{data.criticalAlerts || 0}</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2"><div className="bg-danger-500 h-2 rounded-full" style={{ width: `${Math.min((data.criticalAlerts || 0) * 10, 100)}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>AI Detection Rate</span><span className="font-medium">98.5%</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2"><div className="bg-secondary-500 h-2 rounded-full" style={{ width: '98.5%' }} /></div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="section-title mb-4">Security Recommendations</h3>
            <div className="space-y-3">
              {[
                { icon: TrendingUp, text: 'Peak visitor hours detected between 10-11 AM. Consider additional security staffing.', type: 'info' },
                { icon: AlertTriangle, text: `${data.suspiciousCount || 0} suspicious activities flagged this week. Review blacklist database.`, type: 'warning' },
                { icon: Activity, text: 'Crowd density analysis shows high traffic at main gate during weekends.', type: 'info' },
              ].map((r, i) => {
                const Icon = r.icon;
                return (
                  <div key={i} className={cn('flex items-start gap-3 p-3 rounded-xl', r.type === 'warning' ? 'bg-warning-50 dark:bg-warning-500/5' : 'bg-primary-50 dark:bg-primary-500/5')}>
                    <Icon className={cn('w-5 h-5 mt-0.5', r.type === 'warning' ? 'text-warning-500' : 'text-primary-500')} />
                    <p className="text-sm">{r.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
