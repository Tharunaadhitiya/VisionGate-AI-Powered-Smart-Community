'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Users, Camera, AlertTriangle, FileText, Bell, CreditCard, BarChart3, Shield, Activity, TrendingUp, Clock, CheckCircle, XCircle, MessageSquare, Send, UserPlus, Search, Package } from 'lucide-react';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import NotificationComposer from '@/components/dashboard/NotificationComposer';
import UserManagement from '@/components/dashboard/UserManagement';
import PaymentManagement from '@/components/dashboard/PaymentManagement';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import AIInsights from '@/components/dashboard/AIInsights';
import RecoveryRequests from '@/components/dashboard/RecoveryRequests';
import { useAuth } from '@/hooks/useAuth';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#64748b', '#3b82f6'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(0);
  const [skillAnalytics, setSkillAnalytics] = useState<any>(null);
  const [lostFoundStats, setLostFoundStats] = useState<any>({});

  useEffect(() => {
    api.get('/analytics/dashboard').then((res) => setData(res.data)).finally(() => setLoading(false));
    api.get('/recovery-requests').then((res) => setRecoveryPending((res.data?.requests || []).filter((r: any) => r.status === 'Pending').length)).catch(() => {});
    api.get('/skills/analytics').then((res) => setSkillAnalytics(res.data?.data || null)).catch(() => {});
    api.get('/lost-found/stats').then((res) => setLostFoundStats(res.data?.data || {})).catch(() => {});
  }, []);

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  const visitorChartData = (data.visitorStats || []).map((s: any) => ({ name: s._id, value: s.count }));
  const complaintChartData = (data.complaintStats || []).map((s: any) => ({ name: s._id, value: s.count }));
  const peakHours = (data.peakHours || []).map((s: any) => ({ hour: `${s._id}:00`, visitors: s.count }));

  const statCards = [
    { label: 'Total Residents', value: data.residentCount || 0, icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: "Today's Visitors", value: data.todayVisitors || 0, icon: Activity, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
    { label: 'Active Alerts', value: (data.alertStats || []).reduce((s: number, a: any) => s + a.count, 0), icon: Bell, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
    { label: 'Total Complaints', value: (data.complaintStats || []).reduce((s: number, c: any) => s + c.count, 0), icon: FileText, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Recovery Requests', value: recoveryPending, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <p className="text-surface-400 text-sm">Complete community overview & analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <OnlineStatusBadge userId={user?._id || ''} />
            <button onClick={() => setShowDirectory(true)} className="btn-secondary text-sm"><Users className="w-4 h-4" /> Directory</button>
            <button onClick={() => setShowNotifications(true)} className="btn-secondary text-sm"><Send className="w-4 h-4" /> Notify</button>
            <button onClick={() => setShowSos(true)} className="btn-danger flex items-center gap-2 px-4 py-2.5 rounded-xl">
              <AlertTriangle className="w-4 h-4" /> SOS Emergency
            </button>
          </div>
        </div>

        <div className="card-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                    <Icon className={cn('w-5 h-5', card.color)} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-surface-300" />
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-surface-400">{card.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <button onClick={() => setShowUsers(true)} className="glass-card p-4 flex items-center gap-3 hover:shadow-xl transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">User Management</p>
              <p className="text-xs text-surface-400">Add, edit, or deactivate users</p>
            </div>
          </button>
          <button onClick={() => setShowPayments(true)} className="glass-card p-4 flex items-center gap-3 hover:shadow-xl transition-all">
            <div className="w-10 h-10 rounded-xl bg-secondary-50 dark:bg-secondary-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-secondary-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Payments & Fines</p>
              <p className="text-xs text-surface-400">Send payment requests</p>
            </div>
          </button>
          <button onClick={() => setShowNotifications(true)} className="glass-card p-4 flex items-center gap-3 hover:shadow-xl transition-all">
            <div className="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-warning-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Send Notification</p>
              <p className="text-xs text-surface-400">Targeted announcements</p>
            </div>
          </button>
          <button onClick={() => setShowDirectory(true)} className="glass-card p-4 flex items-center gap-3 hover:shadow-xl transition-all">
            <div className="w-10 h-10 rounded-xl bg-info-50 dark:bg-info-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-info-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">User Directory</p>
              <p className="text-xs text-surface-400">Search all community members</p>
            </div>
          </button>
          <button onClick={() => setShowRecovery(true)} className="glass-card p-4 flex items-center gap-3 hover:shadow-xl transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Recovery Requests {recoveryPending > 0 && <span className="badge badge-danger ml-1">{recoveryPending}</span>}</p>
              <p className="text-xs text-surface-400">Manage credential recovery</p>
            </div>
          </button>
          <Link href="/lost-and-found" className="glass-card p-4 flex items-center gap-3 hover:shadow-xl transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Lost & Found <span className="text-xs font-normal text-surface-400">({lostFoundStats.openLost || 0} open)</span></p>
              <p className="text-xs text-surface-400">Manage lost & found items</p>
            </div>
          </Link>
        </div>

        <AIInsights />

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Visitor Status Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={visitorChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {visitorChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {visitorChartData.map((s: any, i: number) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {s.name}: {s.value}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Peak Entry Hours</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="visitors" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Complaint Status</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complaintChartData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                    {complaintChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Recent Alerts</h3>
            <div className="space-y-2">
              {(data.recentAlerts || []).length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-4">No recent alerts</p>
              ) : (
                (data.recentAlerts || []).map((a: any) => (
                  <div key={a._id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                    <AlertTriangle className={cn('w-3.5 h-3.5', a.severity === 'critical' ? 'text-danger-500' : 'text-warning-500')} />
                    <span className="text-xs truncate flex-1">{a.title}</span>
                    <span className={cn('badge text-[10px]', a.severity === 'critical' ? 'badge-danger' : 'badge-warning')}>{a.severity}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Security Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2">
                <span className="text-sm">Cameras Online</span>
                <span className="text-sm font-semibold text-secondary-500">7/8</span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2">
                <div className="bg-secondary-500 h-2 rounded-full" style={{ width: '87.5%' }} />
              </div>
              <div className="flex justify-between items-center p-2">
                <span className="text-sm">System Uptime</span>
                <span className="text-sm font-semibold text-secondary-500">99.9%</span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '99.9%' }} />
              </div>
              <div className="flex justify-between items-center p-2">
                <span className="text-sm">AI Detection Rate</span>
                <span className="text-sm font-semibold text-secondary-500">98.5%</span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2">
                <div className="bg-warning-500 h-2 rounded-full" style={{ width: '98.5%' }} />
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-secondary-500" />
              Resident Skills Analytics
            </h3>
            {!skillAnalytics ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-secondary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : skillAnalytics.categories.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-4">No professionals registered yet</p>
            ) : (
              <div className="space-y-2">
                {skillAnalytics.categories.slice(0, 8).map((cat: any) => (
                  <div key={cat._id} className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                    <span className="text-sm">{cat._id}</span>
                    <span className="text-sm font-semibold text-secondary-500">{cat.count}</span>
                  </div>
                ))}
                {skillAnalytics.categories.length > 8 && (
                  <p className="text-xs text-surface-400 text-center pt-1">+{skillAnalytics.categories.length - 8} more</p>
                )}
                <div className="pt-2 border-t border-surface-100 dark:border-surface-700/50 flex justify-between">
                  <span className="text-xs font-medium">Total Professionals</span>
                  <span className="text-xs font-bold">{skillAnalytics.totalProfessionals}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="section-title mb-4">Lost & Found Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lostFoundStats.openLost || 0}</p>
              <p className="text-xs text-surface-500 mt-1">Open Lost Items</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-secondary-50 dark:bg-secondary-500/10">
              <p className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">{lostFoundStats.recoveredLost || 0}</p>
              <p className="text-xs text-surface-500 mt-1">Recovered</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-warning-50 dark:bg-warning-500/10">
              <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">{lostFoundStats.pendingMatches || 0}</p>
              <p className="text-xs text-surface-500 mt-1">Pending Claims</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{(lostFoundStats.totalFound || 0) + (lostFoundStats.totalLost || 0)}</p>
              <p className="text-xs text-surface-500 mt-1">Total Items</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link href="/lost-and-found" className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">Manage Lost & Found →</Link>
          </div>
        </div>
      </div>

      {showSos && <SOSEmergency onClose={() => setShowSos(false)} />}
      {showNotifications && <NotificationComposer onClose={() => setShowNotifications(false)} />}
      {showUsers && <UserManagement onClose={() => setShowUsers(false)} />}
      {showPayments && <PaymentManagement onClose={() => setShowPayments(false)} />}
      {showDirectory && <UserDirectory onClose={() => setShowDirectory(false)} />}
      {showRecovery && <RecoveryRequests onClose={() => setShowRecovery(false)} />}
    </DashboardLayout>
  );
}
