'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animation';
import { Skeleton } from '@/components/ui/Skeleton';
import { Users, Camera, AlertTriangle, FileText, Bell, CreditCard, BarChart3, Shield, Activity, TrendingUp, TrendingDown, Minus, Clock, CheckCircle, XCircle, MessageSquare, Send, UserPlus, Search, Package, DollarSign, FileBarChart, RefreshCw, Home, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import TiltCard from '@/components/ui/TiltCard';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import NotificationComposer from '@/components/dashboard/NotificationComposer';
import UserManagement from '@/components/dashboard/UserManagement';
import PaymentManagement from '@/components/dashboard/PaymentManagement';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import RecoveryRequests from '@/components/dashboard/RecoveryRequests';
import { useAuth } from '@/hooks/useAuth';

import DynamicGreeting from '@/components/dashboard/DynamicGreeting';
import TodaySummary from '@/components/dashboard/TodaySummary';
import NeedsAttention, { type AttentionItem } from '@/components/dashboard/NeedsAttention';
import ActivityFeed, { type ActivityEvent } from '@/components/dashboard/ActivityFeed';
import AIInsightsPanel, { type Insight } from '@/components/dashboard/AIInsightsPanel';
import CommunityHealthScore, { type HealthFactor } from '@/components/dashboard/CommunityHealthScore';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#64748b', '#3b82f6'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [complaintSummary, setComplaintSummary] = useState<any>({});
  const [paymentSummary, setPaymentSummary] = useState<any>({});
  const [visitorSummary, setVisitorSummary] = useState<any>({});
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
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);

  const hasDataRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/analytics/admin-dashboard'),
        api.get('/alerts?limit=5&status=new'),
        api.get('/complaints/analytics/summary'),
        api.get('/payments/summary'),
        api.get('/visitors/summary'),
        api.get('/skills/analytics'),
        api.get('/lost-found/stats'),
        api.get('/recovery-requests'),
        api.get('/user-notifications/unread-count'),
      ]);

      const [
        dashRes, alertsRes, complaintRes, paymentRes,
        visitorRes, skillsRes, lostRes, recoveryRes, notifRes,
      ] = results.map((r) => (r.status === 'fulfilled' ? r.value : { data: {} }));

      if (dashRes?.data) { setData(dashRes.data || {}); hasDataRef.current = true; setError(false); }
      else if (!hasDataRef.current) setError(true);

      if (alertsRes?.data?.alerts) setAlerts(alertsRes.data.alerts);
      if (complaintRes?.data) setComplaintSummary(complaintRes.data);
      if (paymentRes?.data) setPaymentSummary(paymentRes.data);
      if (visitorRes?.data) setVisitorSummary(visitorRes.data);
      if (skillsRes?.data?.data) setSkillAnalytics(skillsRes.data.data);
      if (lostRes?.data?.data) setLostFoundStats(lostRes.data.data);
      if (notifRes?.data?.count !== undefined) setUnreadNotifCount(notifRes.data.count);

      const events: ActivityEvent[] = [];
      if (alertsRes?.data?.alerts) {
        (alertsRes.data.alerts || []).slice(0, 4).forEach((a: any) => {
          events.push({ id: `alert-${a._id}`, type: a.severity === 'critical' ? 'sos_triggered' : 'alert_raised', description: a.title || 'Alert', timestamp: a.createdAt });
        });
      }
      if (dashRes?.data?.recentAlerts) {
        (dashRes.data.recentAlerts || []).slice(0, 3).forEach((a: any) => {
          if (!events.find(e => e.id === `alert-${a._id}`)) {
            events.push({ id: `alert2-${a._id}`, type: a.severity === 'critical' ? 'sos_triggered' : 'alert_raised', description: a.title || 'Alert', timestamp: a.createdAt });
          }
        });
      }
      setRecentActivity(events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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
  }, [fetchData]);

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-5">
        <Skeleton className="h-8 w-48 mb-1" /><Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="glass-card p-5"><Skeleton className="h-5 w-5 rounded-lg mb-3" /><Skeleton className="h-6 w-20 mb-2" /><Skeleton className="h-3 w-16" /></div>))}
        </div>
      </div>
    </DashboardLayout>
  );

  const pendingApprovals = data?.pendingApprovals ?? visitorSummary?.pending ?? 0;
  const overdueAmount = paymentSummary?.overdue?.total || 0;
  const pendingPackages = data?.packagesPending ?? 0;
  const unresolvedComplaints = (data?.complaintStats || []).find((s: any) => s._id === 'submitted' || s._id === 'in_progress');
  const totalAlerts = data?.totalAlerts || 0;

  // ROW 1: Overview Metrics (4 cards)
  const kpiCards = [
    { label: 'Residents', value: data?.residentCount ?? 0, icon: Home, color: 'text-primary-500', bg: 'bg-primary-500/10' },
    { label: "Today's Visitors", value: data?.todayVisitors ?? 0, icon: Users, color: 'text-secondary-500', bg: 'bg-secondary-500/10' },
    { label: 'Active Alerts', value: totalAlerts, icon: Bell, color: 'text-danger-500', bg: 'bg-danger-500/10' },
    { label: 'Revenue Collected', value: '₹' + (data?.totalRevenue ?? 0).toLocaleString(), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  // ROW 2: Today Summary items
  const todaySummaryItems = [
    { icon: Users, label: 'Visitors Today', value: data?.todayVisitors ?? 0, color: 'text-secondary-400 bg-secondary-500/10' },
    { icon: Package, label: 'Packages Awaiting', value: pendingPackages, color: 'text-amber-400 bg-amber-500/10' },
    { icon: FileText, label: 'Total Complaints', value: data?.totalComplaints ?? 0, color: 'text-warning-400 bg-warning-500/10' },
    { icon: Bell, label: 'Active Alerts', value: totalAlerts, color: 'text-danger-400 bg-danger-500/10' },
    { icon: Users, label: 'Total Residents', value: data?.residentCount ?? 0, color: 'text-primary-400 bg-primary-500/10' },
    { icon: AlertTriangle, label: 'Incidents', value: data?.totalIncidents ?? 0, color: 'text-rose-400 bg-rose-500/10' },
  ];

  // ── RECOMMENDED ACTIONS — scan ALL modules ──
  const attentionItems: AttentionItem[] = [];

  // ════════════════════════════════════════════════
  // PAYMENTS — overdue, pending invoices, unpaid charges, outstanding balances
  // ════════════════════════════════════════════════
  const pendingPaymentCount = paymentSummary?.pending?.count || 0;
  const pendingPaymentTotal = paymentSummary?.pending?.total || 0;
  const overduePaymentCount = paymentSummary?.overdue?.count || 0;
  console.debug('[Recommender] Payments:', { overdueCount: overduePaymentCount, overdueAmount, pendingCount: pendingPaymentCount, pendingTotal: pendingPaymentTotal });

  if (overdueAmount > 0) {
    attentionItems.push({ id: `overdue-payments-${overduePaymentCount}`, icon: 'CreditCard', label: `${overduePaymentCount} Overdue Payment${overduePaymentCount > 1 ? 's' : ''}`, description: `₹${overdueAmount.toLocaleString()} overdue — collect immediately`, priority: 'critical', link: '/maintenance', count: overduePaymentCount });
  }
  if (pendingPaymentCount > 0) {
    attentionItems.push({ id: `pending-payments-${pendingPaymentCount}`, icon: 'CreditCard', label: `${pendingPaymentCount} Pending Invoice${pendingPaymentCount > 1 ? 's' : ''}`, description: `₹${(pendingPaymentTotal || 0).toLocaleString()} unpaid — send reminders`, priority: 'high', link: '/maintenance', count: pendingPaymentCount });
  }
  if (data?.pendingRevenue > 0 && overdueAmount === 0 && pendingPaymentCount === 0) {
    attentionItems.push({ id: `outstanding-balance-${Math.round(data.pendingRevenue)}`, icon: 'DollarSign', label: 'Outstanding Balance', description: `₹${(data.pendingRevenue || 0).toLocaleString()} total collectible`, priority: 'medium', link: '/maintenance' });
  }

  // ════════════════════════════════════════════════
  // ALERTS — active, critical, unacknowledged
  // ════════════════════════════════════════════════
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  console.debug('[Recommender] Alerts:', { total: totalAlerts, critical: criticalAlerts.length, unacknowledged: alerts.length });

  if (totalAlerts > 0) {
    attentionItems.push({ id: `active-alerts-${totalAlerts}`, icon: 'Bell', label: `${totalAlerts} Active Alert${totalAlerts > 1 ? 's' : ''}`, description: `${criticalAlerts.length} critical — require immediate attention`, priority: 'critical', link: '/alerts', count: alerts.length });
  }

  // ════════════════════════════════════════════════
  // COMPLAINTS — open, in progress, unresolved
  // ════════════════════════════════════════════════
  const unresolvedCount = unresolvedComplaints?.count || 0;
  console.debug('[Recommender] Complaints:', { unresolved: unresolvedCount });

  if (unresolvedCount > 0) {
    attentionItems.push({ id: `open-complaints-${unresolvedCount}`, icon: 'FileText', label: `${unresolvedCount} Pending Complaint${unresolvedCount > 1 ? 's' : ''}`, description: 'Awaiting resolution or action', priority: 'high', link: '/complaints', count: unresolvedCount });
  }

  // ════════════════════════════════════════════════
  // RECOVERY REQUESTS — pending credential recovery
  // ════════════════════════════════════════════════
  const pendingRecovery = data?.pendingRecovery || 0;
  console.debug('[Recommender] Recovery:', { pendingRecovery });

  if (pendingRecovery > 0) {
    attentionItems.push({ id: `recovery-${pendingRecovery}`, icon: 'Clock', label: `${pendingRecovery} Recovery Request${pendingRecovery > 1 ? 's' : ''}`, description: 'Pending credential recovery', priority: 'high', link: '/recovery', count: pendingRecovery });
  }

  // ════════════════════════════════════════════════
  // INCIDENTS — reported, active
  // ════════════════════════════════════════════════
  const totalIncidents = data?.totalIncidents || 0;
  console.debug('[Recommender] Incidents:', { total: totalIncidents });

  if (totalIncidents > 0) {
    attentionItems.push({ id: `incidents-${totalIncidents}`, icon: 'AlertTriangle', label: `${totalIncidents} Active Incident${totalIncidents > 1 ? 's' : ''}`, description: 'Reported — review and take action', priority: 'high', link: '/incidents', count: totalIncidents });
  }

  // ════════════════════════════════════════════════
  // VISITORS — pending approvals, awaiting entry
  // ════════════════════════════════════════════════
  console.debug('[Recommender] Visitors:', { pendingApprovals });

  if (pendingApprovals > 0) {
    attentionItems.push({ id: `pending-approvals-${pendingApprovals}`, icon: 'UserPlus', label: `${pendingApprovals} Visitor Approval${pendingApprovals > 1 ? 's' : ''} Pending`, description: 'Awaiting admin response', priority: 'medium', link: '/visitors', count: pendingApprovals });
  }

  // ════════════════════════════════════════════════
  // PACKAGES — undelivered, awaiting pickup, pending verification
  // ════════════════════════════════════════════════
  console.debug('[Recommender] Packages:', { pending: pendingPackages });

  if (pendingPackages > 0) {
    attentionItems.push({ id: `pending-packages-${pendingPackages}`, icon: 'Package', label: `${pendingPackages} Package${pendingPackages > 1 ? 's' : ''} Awaiting Pickup`, description: 'Pending delivery or security clearance', priority: 'medium', link: '/packages', count: pendingPackages });
  }

  // ════════════════════════════════════════════════
  // LOST & FOUND — awaiting match, awaiting verification
  // ════════════════════════════════════════════════
  const openLost = lostFoundStats?.openLost || 0;
  const recoveredLost = lostFoundStats?.recoveredLost || 0;
  console.debug('[Recommender] Lost & Found:', { openLost, recoveredLost, totalLost: lostFoundStats?.totalLost || 0 });

  if (openLost > 0) {
    attentionItems.push({ id: `lost-items-${openLost}`, icon: 'Search', label: `${openLost} Lost Item${openLost > 1 ? 's' : ''} Awaiting Match`, description: `${recoveredLost} recovered so far — review open cases`, priority: 'medium', link: '/lost-and-found', count: openLost });
  }

  // ════════════════════════════════════════════════
  // POLLS — active nearing deadline
  // ════════════════════════════════════════════════
  const activePolls = data?.activePolls || 0;
  console.debug('[Recommender] Polls:', { active: activePolls });

  if (activePolls > 0) {
    attentionItems.push({ id: `active-polls-${activePolls}`, icon: 'BarChart3', label: `${activePolls} Active Poll${activePolls > 1 ? 's' : ''}`, description: 'Open for voting — encourage participation', priority: 'low', link: '/polls', count: activePolls });
  }

  // ════════════════════════════════════════════════
  // SUMMARY LOG
  // ════════════════════════════════════════════════
  console.debug('[Recommender] Total recommendations:', attentionItems.length, attentionItems.map((i) => i.label));

  // ROW 2: AI Insights
  const insights: Insight[] = [];
  if (data?.visitorTrend !== undefined) {
    insights.push({
      id: 'visitor-trend', icon: data.visitorTrend > 0 ? 'trending_up' : data.visitorTrend < 0 ? 'trending_down' : 'stable',
      text: `Visitor traffic ${data.visitorTrend > 0 ? 'increased' : data.visitorTrend < 0 ? 'decreased' : 'remained steady'} by ${Math.abs(data.visitorTrend)}% vs yesterday.`,
      type: data.visitorTrend > 0 ? 'positive' : data.visitorTrend < 0 ? 'negative' : 'neutral',
    });
  }
  if (data?.complaintTrend !== undefined && data.complaintTrend < 0) {
    insights.push({ id: 'complaints-down', icon: 'complaints', text: `Complaint volume decreased ${Math.abs(data.complaintTrend)}% compared to last period.`, type: 'positive' });
  }
  if ((data?.totalAlerts || 0) === 0) {
    insights.push({ id: 'no-alerts', icon: 'security', text: 'No active security alerts. Community status is normal.', type: 'positive' });
  }
  if (data?.pendingRevenue > 0) {
    insights.push({ id: 'revenue-pending', icon: 'payments', text: `₹${(data.pendingRevenue || 0).toLocaleString()} in pending revenue. Consider sending reminders.`, type: 'warning' });
  }
  if ((lostFoundStats?.openLost || 0) > 0 && (lostFoundStats?.recoveredLost || 0) > 0) {
    insights.push({ id: 'lostfound', icon: 'lost_found', text: `${lostFoundStats.recoveredLost} of ${lostFoundStats.totalLost} lost items recovered. Continue matching.`, type: 'neutral' });
  }
  if ((data?.todayVisitors || 0) > 20) {
    insights.push({ id: 'busy-day', icon: 'users', text: `High visitor traffic today (${data.todayVisitors}). Ensure security is prepared.`, type: 'warning' });
  }

  // ROW 2: Community Health Score
  const totalComplaintsHealth = data?.totalComplaints || 0;
  const resolvedComplaints = (data?.complaintStats || []).find((s: any) => s._id === 'resolved')?.count || 0;
  const complaintScore = totalComplaintsHealth > 0 ? Math.round((resolvedComplaints / totalComplaintsHealth) * 100) : 100;
  const totalPaymentsCount = (paymentSummary?.paid?.count || 0) + (paymentSummary?.pending?.count || 0) + (paymentSummary?.overdue?.count || 0);
  const paidPayments = paymentSummary?.paid?.count || 0;
  const paymentScore = totalPaymentsCount > 0 ? Math.round((paidPayments / totalPaymentsCount) * 100) : 100;
  const securityScore = (data?.totalIncidents || 0) === 0 ? 100 : Math.max(0, 100 - (data?.totalIncidents || 0) * 15);
  const alertScore = totalAlerts === 0 ? 100 : Math.max(0, 100 - totalAlerts * 10);
  const engagementScore = Math.min(100, Math.round(((data?.todayVisitors || 0) + (data?.totalComplaints || 0) + unreadNotifCount) / Math.max(data?.residentCount || 1, 1) * 50));
  const healthFactors: HealthFactor[] = [
    { key: 'complaints', label: 'Complaints', score: complaintScore, weight: 25, explanation: totalComplaintsHealth > 0 ? `${resolvedComplaints}/${totalComplaintsHealth} resolved` : undefined },
    { key: 'payments', label: 'Pending Payments', score: paymentScore, weight: 20, explanation: totalPaymentsCount > 0 ? `${paidPayments}/${totalPaymentsCount} paid on time` : undefined },
    { key: 'security', label: 'Security Incidents', score: securityScore, weight: 20, explanation: (data?.totalIncidents || 0) > 0 ? `${data?.totalIncidents || 0} active` : undefined },
    { key: 'alerts', label: 'Active Alerts', score: alertScore, weight: 15, explanation: totalAlerts > 0 ? `${totalAlerts} active` : undefined },
    { key: 'engagement', label: 'Resident Engagement', score: engagementScore, weight: 20 },
  ];

  // ROW 4: Chart data
  const visitorChartData = (data?.visitorStats || []).map((s: any) => ({ name: s._id, value: s.count }));
  const complaintChartData = (data?.complaintStats || []).map((s: any) => ({ name: s._id, value: s.count }));
  const peakHours = (data?.peakHours || []).map((s: any) => ({ hour: `${s._id}:00`, visitors: s.count }));

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Unable to load some data. Showing cached values.
            <button onClick={fetchData} className="ml-auto btn-secondary text-xs px-3 py-1"><RefreshCw className="w-3 h-3" /> Retry</button>
          </div>
        )}

        <DynamicGreeting role="Admin" name={user?.name} />

        {/* ROW 1: Overview Metrics — 4 cards */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} variants={staggerItem} className="glass-card p-4 flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', card.bg)}>
                  <Icon className={cn('w-5 h-5', card.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-surface-900 dark:text-surface-100 leading-tight">{card.value}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{card.label}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ROW 2: 3-column — Today Summary | Community Health | AI Insights */}
        <div className="grid lg:grid-cols-3 gap-5">
          <TodaySummary items={todaySummaryItems} compact />
          <CommunityHealthScore factors={healthFactors} />
          <AIInsightsPanel insights={insights} />
        </div>

        {/* ROW 3: 2-column — Recommended Actions | Activity Feed */}
        <div className="grid lg:grid-cols-2 gap-5">
          <NeedsAttention items={attentionItems} title="Recommended Actions" userId={user?._id} />
          <ActivityFeed events={recentActivity} />
        </div>

        {/* ROW 4: Analytics Snapshot — full width charts */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-200 mb-4">Visitor Status Distribution</h4>
            {visitorChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-surface-500 text-sm">No data</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={visitorChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {visitorChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {visitorChartData.length > 0 && (
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {visitorChartData.map((s: any, i: number) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-surface-500">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {s.name}: {s.value}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-200 mb-4">Complaint Status</h4>
            {complaintChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-surface-500 text-sm">No data</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={complaintChartData} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                      {complaintChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {complaintChartData.length > 0 && (
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {complaintChartData.map((s: any, i: number) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-surface-500">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {s.name}: {s.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions row */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Tools</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'User Management', desc: 'Add, edit users', icon: UserPlus, color: 'text-primary-500', bg: 'bg-primary-500/10', onClick: () => setShowUsers(true) },
              { label: 'Payments & Fines', desc: 'Send payment requests', icon: CreditCard, color: 'text-secondary-500', bg: 'bg-secondary-500/10', onClick: () => setShowPayments(true) },
              { label: 'Send Notification', desc: 'Announcements to residents', icon: Bell, color: 'text-warning-500', bg: 'bg-warning-500/10', onClick: () => setShowNotifications(true) },
              { label: 'User Directory', desc: 'Search community members', icon: Search, color: 'text-info-500', bg: 'bg-info-500/10', onClick: () => setShowDirectory(true) },
              { label: 'Recovery Requests', desc: 'Manage credential recovery', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10', onClick: () => setShowRecovery(true) },
              { label: 'Lost & Found', desc: 'Manage items', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10', onClick: () => router.push('/lost-and-found') },
              { label: 'Billing & Invoices', desc: 'Payment history', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', onClick: () => router.push('/maintenance') },
              { label: 'System Reports', desc: 'Analytics & exports', icon: FileBarChart, color: 'text-cyan-500', bg: 'bg-cyan-500/10', onClick: () => router.push('/analytics') },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <motion.div key={a.label} variants={staggerItem}>
                  <TiltCard>
                    <button onClick={a.onClick} className="action-card w-full">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 action-icon', a.bg)}>
                        <Icon className={cn('w-5 h-5', a.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold mb-0.5">{a.label}</p>
                        <p className="text-xs text-surface-400">{a.desc}</p>
                      </div>
                    </button>
                  </TiltCard>
                </motion.div>
              );
            })}
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
