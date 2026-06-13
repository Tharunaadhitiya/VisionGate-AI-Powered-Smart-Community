'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animation';
import { Skeleton } from '@/components/ui/Skeleton';
import { Users, Camera, AlertTriangle, FileText, Bell, CreditCard, BarChart3, Shield, Activity, TrendingUp, TrendingDown, Minus, Clock, CheckCircle, XCircle, MessageSquare, Send, UserPlus, Search, Package, DollarSign, FileBarChart, RefreshCw } from 'lucide-react';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TiltCard from '@/components/ui/TiltCard';
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

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) return null;
  const isUp = trend > 0;
  return (
    <span className={cn('flex items-center gap-0.5 text-[11px] font-medium', isUp ? 'text-emerald-500' : 'text-red-500')}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(trend)}%
    </span>
  );
}

function ErrorCard({ label, icon: Icon, color, bg }: { label: string; icon: any; color: string; bg: string }) {
  return (
    <div className="glass-card p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
      </div>
      <p className="text-sm text-surface-400">Unable to load</p>
      <p className="text-sm text-surface-400 mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [skillAnalytics, setSkillAnalytics] = useState<any>(null);
  const [lostFoundStats, setLostFoundStats] = useState<any>({});

  const hasDataRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, skillsRes, lostRes, recoveryRes] = await Promise.all([
        api.get('/analytics/admin-dashboard'),
        api.get('/skills/analytics'),
        api.get('/lost-found/stats'),
        api.get('/recovery-requests'),
      ]);
      setData(dashRes.data || {});
      setSkillAnalytics(skillsRes.data?.data || null);
      setLostFoundStats(lostRes.data?.data || {});
      hasDataRef.current = true;
      setError(false);
    } catch {
      if (!hasDataRef.current) setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-6"><Skeleton className="h-10 w-10 rounded-xl mb-3" /><Skeleton className="h-7 w-20 mb-2" /><Skeleton className="h-4 w-24" /></div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );

  const visitorChartData = (data?.visitorStats || []).map((s: any) => ({ name: s._id, value: s.count }));
  const complaintChartData = (data?.complaintStats || []).map((s: any) => ({ name: s._id, value: s.count }));
  const peakHours = (data?.peakHours || []).map((s: any) => ({ hour: `${s._id}:00`, visitors: s.count }));
  const totalAlerts = data?.totalAlerts || 0;
  const totalComplaints = data?.totalComplaints || 0;

  const statCards = error ? [] : [
    { label: 'Total Residents', value: data?.residentCount ?? 'Unable to load', icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10', trend: 0 },
    { label: "Today's Visitors", value: data?.todayVisitors ?? 'Unable to load', icon: Activity, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10', trend: data?.visitorTrend },
    { label: 'Active Alerts', value: totalAlerts, icon: Bell, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10', trend: data?.alertTrend },
    { label: 'Complaints', value: totalComplaints, icon: FileText, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10', trend: data?.complaintTrend },
    { label: 'Recovery Requests', value: data?.pendingRecovery ?? 0, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', trend: 0 },
    { label: 'Packages', value: data?.totalPackages ?? 0, icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', trend: 0 },
    { label: 'Incidents', value: data?.totalIncidents ?? 0, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', trend: 0 },
    { label: 'Revenue', value: '₹' + (data?.totalRevenue ?? 0).toLocaleString(), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', trend: 0 },
  ];

  const quickActions = [
    { label: 'User Management', desc: 'Add, edit, or deactivate users', icon: UserPlus, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10', onClick: () => setShowUsers(true) },
    { label: 'Payments & Fines', desc: 'Send payment requests', icon: CreditCard, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10', onClick: () => setShowPayments(true) },
    { label: 'Send Notification', desc: 'Targeted announcements to residents', icon: Bell, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10', onClick: () => setShowNotifications(true) },
    { label: 'User Directory', desc: 'Search all community members', icon: Search, color: 'text-info-500', bg: 'bg-info-50 dark:bg-info-500/10', onClick: () => setShowDirectory(true) },
    { label: 'Recovery Requests', desc: 'Manage credential recovery', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', onClick: () => setShowRecovery(true) },
    { label: 'Lost & Found', desc: 'Manage lost & found items', icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', onClick: () => { console.log('Lost & Found Clicked'); router.push('/lost-and-found'); } },
    { label: 'Billing & Invoices', desc: 'View payment history & invoices', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', onClick: () => { console.log('Billing & Invoices Clicked'); router.push('/maintenance'); } },
    { label: 'System Reports', desc: 'Analytics & export reports', icon: FileBarChart, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10', onClick: () => { console.log('System Reports Clicked'); router.push('/analytics'); } },
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

        {/* --- Section: Overview --- */}
        <div>
          <h3 className="section-title mb-6">Overview</h3>
          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Unable to load some data. Showing cached values.
              <button onClick={fetchData} className="ml-auto btn-secondary text-xs px-3 py-1"><RefreshCw className="w-3 h-3" /> Retry</button>
            </div>
          )}
          <motion.div className="grid grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" animate="visible">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.label} variants={staggerItem} className="glass-card p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                      <Icon className={cn('w-5 h-5', card.color)} />
                    </div>
                    <TrendBadge trend={card.trend} />
                  </div>
                  <p className="text-2xl font-bold mb-1">{card.value}</p>
                  <p className="text-sm text-surface-400">{card.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* --- Section: Quick Actions --- */}
        <div className="mt-8">
          <h3 className="section-title mb-6">Quick Actions</h3>
          <motion.div className="grid grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" animate="visible">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.div key={action.label} variants={staggerItem}>
                  <TiltCard>
                    <button onClick={action.onClick} className="action-card">
                      <svg className="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 action-icon', action.bg)}>
                        <Icon className={cn('w-6 h-6', action.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold mb-0.5">{action.label}</p>
                        <p className="text-xs text-surface-400">{action.desc}</p>
                      </div>
                    </button>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* --- Section: AI Insights --- */}
        <div className="mt-8">
          <AIInsights />
        </div>

        {/* --- Section: Analytics & Monitoring --- */}
        <div className="mt-8">
          <h3 className="section-title mb-6">Analytics & Monitoring</h3>
          <motion.div className="grid grid-cols-2 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}>
            <motion.div variants={fadeUp} className="glass-card p-6">
              <h4 className="text-sm font-semibold mb-4">Visitor Status Distribution</h4>
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
            </motion.div>

            <motion.div variants={fadeUp} className="glass-card p-6">
              <h4 className="text-sm font-semibold mb-4">Peak Entry Hours</h4>
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
            </motion.div>
          </motion.div>
        </div>

        {/* --- Section: Recent Activity --- */}
        <div className="mt-8">
          <h3 className="section-title mb-6">Recent Activity</h3>
          <motion.div className="grid grid-cols-2 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}>
            <motion.div variants={fadeUp} className="glass-card p-6">
              <h4 className="text-sm font-semibold mb-4">Complaint Status</h4>
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
            </motion.div>

            <motion.div variants={fadeUp} className="glass-card p-6">
              <h4 className="text-sm font-semibold mb-4">Recent Alerts</h4>
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
            </motion.div>

            <motion.div variants={fadeUp} className="glass-card p-6">
              <h4 className="text-sm font-semibold mb-4">Security Overview</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2"><span className="text-sm">Cameras Online</span><span className="text-sm font-semibold text-secondary-500">7/8</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2"><div className="bg-secondary-500 h-2 rounded-full" style={{ width: '87.5%' }} /></div>
                <div className="flex justify-between items-center p-2"><span className="text-sm">System Uptime</span><span className="text-sm font-semibold text-secondary-500">99.9%</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2"><div className="bg-primary-500 h-2 rounded-full" style={{ width: '99.9%' }} /></div>
                <div className="flex justify-between items-center p-2"><span className="text-sm">AI Detection Rate</span><span className="text-sm font-semibold text-secondary-500">98.5%</span></div>
                <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2"><div className="bg-warning-500 h-2 rounded-full" style={{ width: '98.5%' }} /></div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="glass-card p-6">
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-secondary-500" />
                Resident Skills Analytics
              </h4>
              {!skillAnalytics ? (
                <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-secondary-500 border-t-transparent rounded-full animate-spin" /></div>
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
            </motion.div>
          </motion.div>
        </div>

        {/* --- Section: Reports --- */}
        <div className="mt-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} className="glass-card p-6">
            <h3 className="section-title mb-4">Lost & Found Overview</h3>
            <div className="grid grid-cols-4 gap-4">
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
          </motion.div>
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
