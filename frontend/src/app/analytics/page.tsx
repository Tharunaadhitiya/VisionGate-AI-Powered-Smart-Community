'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { BarChart3, TrendingUp, Users, AlertTriangle, Activity, Eye, DollarSign, Package, Search, Shield, Clock, CheckCircle, XCircle, Home, CreditCard, FileText, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animation';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

function formatDay(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, secRes, survRes, lostRes] = await Promise.allSettled([
        api.get('/analytics/admin-dashboard'),
        api.get('/analytics/security-dashboard'),
        api.get('/analytics/surveillance'),
        api.get('/lost-found/stats'),
      ]);
      const merged: any = {};
      if (dashRes.status === 'fulfilled') Object.assign(merged, dashRes.value.data || {});
      if (secRes.status === 'fulfilled') Object.assign(merged, secRes.value.data || {});
      if (survRes.status === 'fulfilled') Object.assign(merged, survRes.value.data || {});
      if (lostRes.status === 'fulfilled') Object.assign(merged, lostRes.value.data || {});
      setData(merged);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const weeklyTrend = (data.weeklyTrend || []).map((d: any) => ({ day: formatDay(d._id), visitors: d.count }));
  const alertByType = (data.byType || []).map((a: any) => ({ name: a._id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), value: a.count }));
  const visitorStats = (data.visitorStats || []).map((s: any) => ({ name: s._id, value: s.count }));
  const complaintStats = (data.complaintStats || []).map((s: any) => ({ name: s._id, value: s.count }));
  const peakHours = (data.peakHours || []).map((s: any) => ({ hour: `${s._id}:00`, visitors: s.count }));

  const totalSurvEvents = data.humanDetections + data.vehicleDetections || 0;
  const totalDetections = totalSurvEvents;
  const aiDetectionRate = totalDetections > 0 ? Math.min(100, Math.round((totalDetections / Math.max(data.totalAlerts || 1, 1)) * 100)) : 0;
  const entryRate = data.entryExitRatio?.total > 0 ? Math.round((data.entryExitRatio.checkedIn / data.entryExitRatio.total) * 100) : 0;
  const exitRate = data.entryExitRatio?.total > 0 ? Math.round((data.entryExitRatio.checkedOut / data.entryExitRatio.total) * 100) : 0;
  const recoveryRate = data.totalLost > 0 ? Math.round(((data.recoveredLost || 0) / data.totalLost) * 100) : 0;
  const totalItems = (data.totalLost || 0) + (data.totalFound || 0);

  const recommendations = [
    ...(data.peakHours?.length ? [{
      icon: TrendingUp, type: 'info' as const,
      text: `Peak visitor hours: ${data.peakHours.map((h: any) => `${h._id}:00`).join(', ')}. Consider additional security staffing during these times.`,
    }] : []),
    ...(data.suspiciousCount > 0 ? [{
      icon: AlertTriangle, type: 'warning' as const,
      text: `${data.suspiciousCount} suspicious ${data.suspiciousCount === 1 ? 'activity was' : 'activities were'} flagged. Review security logs and blacklist database.`,
    }] : []),
    ...(data.openLostItems > 0 ? [{
      icon: Search, type: 'warning' as const,
      text: `${data.openLostItems} lost ${data.openLostItems === 1 ? 'item remains' : 'items remain'} unrecovered. Encourage residents to check lost & found.`,
    }] : []),
    ...(data.totalIncidents > 0 ? [{
      icon: Shield, type: 'info' as const,
      text: `${data.totalIncidents} ${data.totalIncidents === 1 ? 'incident has' : 'incidents have'} been reported. Review incident reports for pattern analysis.`,
    }] : []),
    ...(data.emergencyCount > 0 ? [{
      icon: AlertTriangle, type: 'warning' as const,
      text: `${data.emergencyCount} emergency ${data.emergencyCount === 1 ? 'alert' : 'alerts'} require immediate attention.`,
    }] : []),
    ...(data.pendingApprovals > 3 ? [{
      icon: Clock, type: 'info' as const,
      text: `${data.pendingApprovals} visitor ${data.pendingApprovals === 1 ? 'request is' : 'requests are'} pending approval. Clear the queue to avoid resident inconvenience.`,
    }] : []),
  ];

  if (recommendations.length === 0) {
    recommendations.push({
      icon: Activity, type: 'info' as const,
      text: 'All metrics within normal range. Continue standard monitoring procedures.',
    });
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-56 mb-1" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-6"><Skeleton className="h-10 w-10 rounded-xl mb-3" /><Skeleton className="h-7 w-20 mb-2" /><Skeleton className="h-4 w-24" /></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="glass-card p-6"><Skeleton className="h-5 w-40 mb-4" /><Skeleton className="h-60 w-full rounded-xl" /></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-surface-400 text-sm">AI-powered insights and trend analysis</p>
        </motion.div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Some analytics failed to load.
            <button onClick={fetchData} className="ml-auto btn-secondary text-xs px-3 py-1">Retry</button>
          </div>
        )}

        {/* KPI Cards */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="card-grid grid grid-cols-4 gap-6">
          <motion.div variants={staggerItem} className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-primary-500" /><span className="text-sm text-surface-400">Total Visitors</span></div>
            <p className="text-2xl font-bold">{data.totalVisitors ?? 0}</p>
          </motion.div>
          <motion.div variants={staggerItem} className="stat-card">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-danger-500" /><span className="text-sm text-surface-400">Suspicious</span></div>
            <p className="text-2xl font-bold">{data.suspiciousCount ?? 0}</p>
          </motion.div>
          <motion.div variants={staggerItem} className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Eye className="w-4 h-4 text-warning-500" /><span className="text-sm text-surface-400">Surveillance Events</span></div>
            <p className="text-2xl font-bold">{totalSurvEvents + (data.surveillanceEvents || 0)}</p>
          </motion.div>
          <motion.div variants={staggerItem} className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-secondary-500" /><span className="text-sm text-surface-400">Active Residents</span></div>
            <p className="text-2xl font-bold">{data.residentCount ?? 0}</p>
          </motion.div>
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-6">
          {/* Weekly Visitor Trend */}
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Weekly Visitor Trend</h3>
            {weeklyTrend.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-surface-400 text-sm">No analytics data available</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrend}>
                    <defs><linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="visitors" stroke="#6366f1" fillOpacity={1} fill="url(#colorV)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Alert Distribution */}
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Alert Distribution by Type</h3>
            {alertByType.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-surface-400 text-sm">No analytics data available</div>
            ) : (
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
            )}
          </div>
        </motion.div>

        {/* Security & Recommendations Row */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-3 gap-6">
          {/* Security Overview */}
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Security Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Entry/Exit Ratio</span><span className="font-medium">{entryRate}% / {exitRate}%</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2">
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-500 h-2" style={{ width: `${entryRate}%` }} />
                    <div className="bg-warning-500 h-2" style={{ width: `${exitRate}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[11px] text-surface-400 mt-1"><span>Entry ({data.entryExitRatio?.checkedIn || 0})</span><span>Exit ({data.entryExitRatio?.checkedOut || 0})</span></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Critical Alerts Today</span><span className="font-medium">{data.criticalAlerts || 0}</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2"><div className="bg-danger-500 h-2 rounded-full" style={{ width: `${Math.min((data.criticalAlerts || 0) * 10, 100)}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>AI Detection Rate</span><span className="font-medium">{aiDetectionRate}%</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2"><div className="bg-secondary-500 h-2 rounded-full" style={{ width: `${Math.max(aiDetectionRate, 5)}%` }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-100 dark:border-surface-700/50">
                <div className="text-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50"><p className="text-lg font-bold text-secondary-500">{data.humanDetections || 0}</p><p className="text-[11px] text-surface-400">Human</p></div>
                <div className="text-center p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50"><p className="text-lg font-bold text-warning-500">{data.vehicleDetections || 0}</p><p className="text-[11px] text-surface-400">Vehicle</p></div>
              </div>
            </div>
          </div>

          {/* Security Recommendations */}
          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="section-title mb-4">Security Recommendations</h3>
            <div className="space-y-3">
              {recommendations.map((r, i) => {
                const Icon = r.icon;
                return (
                  <div key={i} className={cn('flex items-start gap-3 p-3 rounded-xl', r.type === 'warning' ? 'bg-warning-50 dark:bg-warning-500/5' : 'bg-primary-50 dark:bg-primary-500/5')}>
                    <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', r.type === 'warning' ? 'text-warning-500' : 'text-primary-500')} />
                    <p className="text-sm">{r.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Analytics Grid */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-6">
          {/* Surveillance Analytics */}
          <div className="glass-card p-6">
            <h3 className="section-title mb-4 flex items-center gap-2"><Camera className="w-4 h-4" /> Surveillance Analytics</h3>
            {totalSurvEvents === 0 && (data.surveillanceEvents || 0) === 0 ? (
              <div className="h-48 flex items-center justify-center text-surface-400 text-sm">No analytics data available</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10"><p className="text-2xl font-bold text-primary-500">{data.humanDetections || 0}</p><p className="text-xs text-surface-500 mt-1">Human Detections</p></div>
                  <div className="text-center p-4 rounded-xl bg-warning-50 dark:bg-warning-500/10"><p className="text-2xl font-bold text-warning-500">{data.vehicleDetections || 0}</p><p className="text-xs text-surface-500 mt-1">Vehicle Detections</p></div>
                  <div className="text-center p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50"><p className="text-2xl font-bold text-surface-700 dark:text-surface-300">{data.surveillanceEvents || 0}</p><p className="text-xs text-surface-500 mt-1">Total Events</p></div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Human', count: data.humanDetections || 0 },
                      { name: 'Vehicle', count: data.vehicleDetections || 0 },
                      { name: 'Other', count: Math.max(0, (data.surveillanceEvents || 0) - (data.humanDetections || 0) - (data.vehicleDetections || 0)) },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Complaint Analytics */}
          <div className="glass-card p-6">
            <h3 className="section-title mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Complaint Analytics</h3>
            {complaintStats.length === 0 && (data.totalComplaints || 0) === 0 ? (
              <div className="h-48 flex items-center justify-center text-surface-400 text-sm">No analytics data available</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10"><p className="text-2xl font-bold text-primary-500">{data.totalComplaints || 0}</p><p className="text-xs text-surface-500 mt-1">Total</p></div>
                  <div className="text-center p-4 rounded-xl bg-secondary-50 dark:bg-secondary-500/10"><p className="text-2xl font-bold text-secondary-500">{complaintStats.find((c: any) => c.name === 'resolved')?.value || 0}</p><p className="text-xs text-surface-500 mt-1">Resolved</p></div>
                  <div className="text-center p-4 rounded-xl bg-warning-50 dark:bg-warning-500/10"><p className="text-2xl font-bold text-warning-500">{complaintStats.find((c: any) => c.name === 'submitted' || c.name === 'in_progress')?.value || 0}</p><p className="text-xs text-surface-500 mt-1">Open</p></div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Analytics */}
          <div className="glass-card p-6">
            <h3 className="section-title mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Payment Analytics</h3>
            {(data.totalRevenue || 0) === 0 && (data.pendingRevenue || 0) === 0 ? (
              <div className="h-48 flex items-center justify-center text-surface-400 text-sm">No analytics data available</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-4 rounded-xl bg-secondary-50 dark:bg-secondary-500/10"><p className="text-2xl font-bold text-secondary-500">₹{(data.totalRevenue || 0).toLocaleString()}</p><p className="text-xs text-surface-500 mt-1">Collected</p></div>
                  <div className="text-center p-4 rounded-xl bg-warning-50 dark:bg-warning-500/10"><p className="text-2xl font-bold text-warning-500">₹{(data.pendingRevenue || 0).toLocaleString()}</p><p className="text-xs text-surface-500 mt-1">Pending</p></div>
                  <div className="text-center p-4 rounded-xl bg-danger-50 dark:bg-danger-500/10"><p className="text-2xl font-bold text-danger-500">₹{(((data.maintenanceStats || []).find((m: any) => m._id === 'overdue')?.total || 0) + (data.pendingRevenue || 0)).toLocaleString()}</p><p className="text-xs text-surface-500 mt-1">Overdue</p></div>
                </div>
              </div>
            )}
          </div>

          {/* Lost & Found Analytics */}
          <div className="glass-card p-6">
            <h3 className="section-title mb-4 flex items-center gap-2"><Search className="w-4 h-4" /> Lost & Found Analytics</h3>
            {totalItems === 0 ? (
              <div className="h-48 flex items-center justify-center text-surface-400 text-sm">No analytics data available</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10"><p className="text-lg font-bold text-amber-500">{data.totalLost || 0}</p><p className="text-[10px] text-surface-500 mt-0.5">Lost</p></div>
                  <div className="text-center p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10"><p className="text-lg font-bold text-primary-500">{data.totalFound || 0}</p><p className="text-[10px] text-surface-500 mt-0.5">Found</p></div>
                  <div className="text-center p-3 rounded-xl bg-secondary-50 dark:bg-secondary-500/10"><p className="text-lg font-bold text-secondary-500">{data.recoveredLost || 0}</p><p className="text-[10px] text-surface-500 mt-0.5">Recovered</p></div>
                  <div className="text-center p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50"><p className="text-lg font-bold">{recoveryRate}%</p><p className="text-[10px] text-surface-500 mt-0.5">Rate</p></div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Peak Hours */}
        {peakHours.length > 0 && (
          <motion.div variants={fadeUp} className="glass-card p-6">
            <h3 className="section-title mb-4">Peak Entry Hours</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="visitors" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}