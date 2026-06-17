'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, FileText, CreditCard, Bell, AlertTriangle, MessageSquare, Calendar, ArrowRight, Phone, Clock, Shield, CheckCircle, XCircle, AlertCircle, DollarSign, Home, Banknote, Package, Search, BookOpen, History, Settings, TrendingUp, TrendingDown, RefreshCw, X, Camera, UserPlus, Star, Activity } from 'lucide-react';
import { cn, timeAgo, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import TiltCard from '@/components/ui/TiltCard';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import PushNotificationSettings from '@/components/notifications/PushNotificationSettings';
import NotificationHistoryModal from '@/components/notifications/NotificationHistoryModal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp, modalOverlay, modalContent } from '@/lib/animation';
import { Skeleton } from '@/components/ui/Skeleton';

import DynamicGreeting from '@/components/dashboard/DynamicGreeting';
import TodaySummary from '@/components/dashboard/TodaySummary';
import NeedsAttention, { type AttentionItem } from '@/components/dashboard/NeedsAttention';
import ActivityFeed, { type ActivityEvent } from '@/components/dashboard/ActivityFeed';
import AIInsightsPanel, { type Insight } from '@/components/dashboard/AIInsightsPanel';
import CommunityHealthScore, { type HealthFactor } from '@/components/dashboard/CommunityHealthScore';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState(false);
  const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showNotifHistory, setShowNotifHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [historyPayments, setHistoryPayments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [lostItems, setLostItems] = useState<any[]>([]);
  const [foundItems, setFoundItems] = useState<any[]>([]);
  const [packageCount, setPackageCount] = useState(0);
  const [packages, setPackages] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const hasDataRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    try {
      api.post('/payments/check-overdue').catch(() => {});

      const [dashRes, visitorsRes, complaintsRes, paymentsRes, lostItemsRes, pkgRes, noticesRes] = await Promise.allSettled([
        api.get('/analytics/resident-dashboard'),
        api.get('/visitors', { limit: '5', residentId: String(user._id) }),
        api.get('/complaints', { limit: '3' }),
        api.get('/payments'),
        api.get('/lost-found/my-items'),
        api.get('/packages', { residentId: String(user._id) }),
        api.get('/notices', { limit: '3' }),
      ]);

      if (dashRes.status === 'fulfilled') { setStats(dashRes.value.data || {}); hasDataRef.current = true; setError(false); }
      else if (!hasDataRef.current) setError(true);

      if (visitorsRes.status === 'fulfilled') setRecentVisitors(visitorsRes.value.data.visitors || []);
      if (complaintsRes.status === 'fulfilled') setComplaints(complaintsRes.value.data.complaints || []);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.data.payments || []);
      if (noticesRes.status === 'fulfilled') setNotices(noticesRes.value.data?.notices || noticesRes.value.data || []);
      if (lostItemsRes.status === 'fulfilled') {
        const d = lostItemsRes.value.data || {};
        setLostItems(d.lostItems || []);
        setFoundItems(d.foundItems || []);
      }
      if (pkgRes.status === 'fulfilled') {
        const pkgs = pkgRes.value.data?.packages || [];
        setPackageCount(pkgs.length);
        setPackages(pkgs);
      }

      // Build activity feed
      const events: ActivityEvent[] = [];
      if (visitorsRes.status === 'fulfilled') {
        const vs = visitorsRes.value.data.visitors || [];
        vs.slice(0, 3).forEach((v: any) => {
          events.push({ id: `v-${v._id}`, type: v.status === 'approved' ? 'visitor_approved' : 'visitor_entered', description: `${v.name} - ${v.purpose}`, timestamp: v.createdAt || v.updatedAt });
        });
      }
      if (complaintsRes.status === 'fulfilled') {
        (complaintsRes.value.data.complaints || []).slice(0, 3).forEach((c: any) => {
          events.push({ id: `c-${c._id}`, type: c.status === 'resolved' ? 'complaint_resolved' : 'complaint_submitted', description: c.title, timestamp: c.createdAt || c.updatedAt });
        });
      }
      if (noticesRes.status === 'fulfilled') {
        (noticesRes.value.data?.notices || noticesRes.value.data || []).slice(0, 2).forEach((n: any) => {
          events.push({ id: `n-${n._id}`, type: 'notice_posted', description: n.title, timestamp: n.createdAt });
        });
      }
      if (paymentsRes.status === 'fulfilled') {
        const paid = (paymentsRes.value.data.payments || []).filter((p: any) => p.status === 'paid').slice(0, 2);
        paid.forEach((p: any) => {
          events.push({ id: `pmt-${p._id}`, type: 'payment_received', description: `${p.title || 'Payment'} - ₹${p.amount?.toLocaleString()}`, timestamp: p.paidAt || p.updatedAt });
        });
      }
      setRecentActivity(events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      setLoading(false);
    } catch {
      if (!hasDataRef.current) setError(true);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchPaymentHistory = useCallback(async () => {
    if (!user?._id) return;
    setHistoryLoading(true);
    try {
      const res = await api.get('/payments', { limit: '200' });
      setHistoryPayments(res.data.payments || []);
    } catch {
      toast.error('Failed to load payment history');
    }
    setHistoryLoading(false);
  }, [user]);

  const handlePayClick = (payment: any) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
    setLastReceipt(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) return;
    if (!paymentMethod) { toast.error('Please select a payment method.'); return; }
    setProcessingPayment(true);
    try {
      const res = await api.put('/payments/' + selectedPayment._id + '/pay', { paymentMethod, transactionId: 'TXN' + Date.now() });
      toast.success('Payment successful!');
      setPayments((prev) => prev.map((p) => p._id === selectedPayment._id ? { ...p, status: 'paid', paidAt: new Date().toISOString(), paymentMethod, transactionId: 'TXN' + Date.now() } : p));
      setHistoryPayments((prev) => prev.map((p) => p._id === selectedPayment._id ? { ...p, status: 'paid', paidAt: new Date().toISOString(), paymentMethod, transactionId: 'TXN' + Date.now() } : p));
      if (res.data?.receipt) setLastReceipt(res.data.receipt);
      setShowPaymentModal(false);
      setSelectedPayment(null);
      const dashRes = await api.get('/analytics/resident-dashboard');
      setStats(dashRes.data || {});
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    }
    setProcessingPayment(false);
  };

  const handleVisitorAction = async (id: string, status: string) => {
    try {
      await api.put('/visitors/' + id + '/respond', { status });
      toast.success('Visitor ' + status);
      setRecentVisitors((prev) => prev.map((v) => v._id === id ? { ...v, status } : v));
    } catch { toast.error('Action failed'); }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5"><Skeleton className="h-5 w-5 rounded-lg mb-3" /><Skeleton className="h-5 w-28 mb-2" /><Skeleton className="h-3 w-20" /></div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );

  const allPendingPayments = payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
  const pendingMaintenanceAmount = stats?.pendingMaintenance || 0;

  const todaySummaryItems = [
    { icon: Users, label: 'My Visitors', value: stats?.visitors ?? 0, color: 'text-primary-400 bg-primary-500/10' },
    { icon: Package, label: 'My Packages', value: stats?.packages ?? packageCount, color: 'text-amber-400 bg-amber-500/10' },
    { icon: FileText, label: 'Open Complaints', value: stats?.pendingComplaints ?? 0, color: 'text-warning-400 bg-warning-500/10' },
    { icon: Bell, label: 'Notifications', value: stats?.unreadNotifications ?? 0, color: 'text-secondary-400 bg-secondary-500/10' },
    { icon: CreditCard, label: 'Pending Dues', value: '₹' + (stats?.pendingPaymentsAmount || pendingMaintenanceAmount || 0).toLocaleString(), color: 'text-danger-400 bg-danger-500/10' },
    { icon: Clock, label: 'Pending Payments', value: stats?.pendingPayments ?? allPendingPayments.length, color: 'text-purple-400 bg-purple-500/10' },
  ];

  // ── RECOMMENDED ACTIONS — scan ALL modules ──
  const needsAttentionItems: AttentionItem[] = [];

  // ════════════════════════════════════════════════
  // PAYMENTS — pending invoices, overdue, failed
  // ════════════════════════════════════════════════
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const overduePayments = payments.filter((p) => p.status === 'overdue');
  const failedPayments = payments.filter((p) => p.status === 'failed');
  console.debug('[Recommender] Payments:', { pending: pendingPayments.length, overdue: overduePayments.length, failed: failedPayments.length, total: payments.length });

  if (overduePayments.length > 0) {
    const totalAmount = overduePayments.reduce((s, p) => s + (p.amount || 0), 0);
    needsAttentionItems.push({ id: `overdue-payments-${overduePayments.length}`, icon: 'CreditCard', label: `${overduePayments.length} Overdue Payment${overduePayments.length > 1 ? 's' : ''}`, description: `₹${totalAmount.toLocaleString()} overdue — pay immediately to avoid late fees`, priority: 'critical', link: '/maintenance', count: overduePayments.length });
  }
  if (pendingPayments.length > 0) {
    const totalAmount = pendingPayments.reduce((s, p) => s + (p.amount || 0), 0);
    needsAttentionItems.push({ id: `pending-payments-${pendingPayments.length}`, icon: 'CreditCard', label: `${pendingPayments.length} Pending Payment${pendingPayments.length > 1 ? 's' : ''}`, description: `₹${totalAmount.toLocaleString()} unpaid — due soon`, priority: 'high', link: '/maintenance', count: pendingPayments.length });
  }
  if (failedPayments.length > 0) {
    needsAttentionItems.push({ id: `failed-payments-${failedPayments.length}`, icon: 'AlertCircle', label: `${failedPayments.length} Failed Payment${failedPayments.length > 1 ? 's' : ''}`, description: 'Payment attempts failed — update details and retry', priority: 'high', link: '/maintenance', count: failedPayments.length });
  }

  // ════════════════════════════════════════════════
  // VISITORS — pending approvals, awaiting entry
  // ════════════════════════════════════════════════
  const pendingVisitors = recentVisitors.filter((v) => v.status === 'pending');
  const awaitingEntry = recentVisitors.filter((v) => v.status === 'approved' || v.status === 'scheduled');
  console.debug('[Recommender] Visitors:', { pending: pendingVisitors.length, awaitingEntry: awaitingEntry.length });

  if (pendingVisitors.length > 0) {
    needsAttentionItems.push({ id: `pending-visitors-${pendingVisitors.length}`, icon: 'UserPlus', label: `${pendingVisitors.length} Visitor${pendingVisitors.length > 1 ? 's' : ''} Awaiting Approval`, description: 'Review and respond to visitor requests', priority: 'high', link: '/visitors', count: pendingVisitors.length });
  }

  // ════════════════════════════════════════════════
  // COMPLAINTS — open, in progress, unresolved
  // ════════════════════════════════════════════════
  const openComplaints = complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed');
  const inProgressComplaints = complaints.filter((c) => c.status === 'in_progress');
  console.debug('[Recommender] Complaints:', { open: openComplaints.length, inProgress: inProgressComplaints.length });

  if (openComplaints.length > 0) {
    needsAttentionItems.push({ id: `open-complaints-${openComplaints.length}`, icon: 'FileText', label: `${openComplaints.length} Open Complaint${openComplaints.length > 1 ? 's' : ''}`, description: `${inProgressComplaints.length} in progress, ${openComplaints.length - inProgressComplaints.length} awaiting response`, priority: 'medium', link: '/complaints', count: openComplaints.length });
  }

  // ════════════════════════════════════════════════
  // PACKAGES — undelivered, awaiting pickup, pending verification
  // ════════════════════════════════════════════════
  const undeliveredPkgs = packages.filter((pkg) => pkg.status === 'undelivered' || pkg.status === 'pending_delivery');
  const awaitingPickupPkgs = packages.filter((pkg) => pkg.status === 'awaiting_pickup' || pkg.status === 'delivered');
  const unverifiedPkgs = packages.filter((pkg) => pkg.status === 'pending_verification');
  console.debug('[Recommender] Packages:', { undelivered: undeliveredPkgs.length, awaitingPickup: awaitingPickupPkgs.length, unverified: unverifiedPkgs.length, total: packageCount });

  if (undeliveredPkgs.length > 0) {
    needsAttentionItems.push({ id: `undelivered-packages-${undeliveredPkgs.length}`, icon: 'Package', label: `${undeliveredPkgs.length} Undelivered Package${undeliveredPkgs.length > 1 ? 's' : ''}`, description: 'Pending delivery — check with security', priority: 'medium', link: '/packages', count: undeliveredPkgs.length });
  }
  if (unverifiedPkgs.length > 0) {
    needsAttentionItems.push({ id: `pending-verification-packages-${unverifiedPkgs.length}`, icon: 'Package', label: `${unverifiedPkgs.length} Package${unverifiedPkgs.length > 1 ? 's' : ''} Awaiting Verification`, description: 'Confirm receipt to complete delivery', priority: 'low', link: '/packages', count: unverifiedPkgs.length });
  }
  if (awaitingPickupPkgs.length > 0 && undeliveredPkgs.length === 0 && unverifiedPkgs.length === 0) {
    needsAttentionItems.push({ id: `package-pickup-${awaitingPickupPkgs.length}`, icon: 'Package', label: `${awaitingPickupPkgs.length} Package${awaitingPickupPkgs.length > 1 ? 's' : ''} Ready for Pickup`, description: 'Collect from security office', priority: 'low', link: '/packages', count: awaitingPickupPkgs.length });
  }

  // ════════════════════════════════════════════════
  // LOST & FOUND — awaiting match, awaiting verification, pending recovery
  // ════════════════════════════════════════════════
  const unmatchedLost = lostItems.filter((i) => i.status !== 'recovered' && i.status !== 'matched');
  const pendingVerifyFound = foundItems.filter((i) => i.status === 'pending_verification' || i.status === 'unclaimed');
  console.debug('[Recommender] Lost & Found:', { lost: lostItems.length, unmatched: unmatchedLost.length, foundItems: foundItems.length, pendingVerify: pendingVerifyFound.length });

  if (unmatchedLost.length > 0) {
    needsAttentionItems.push({ id: `lost-items-${unmatchedLost.length}`, icon: 'Search', label: `${unmatchedLost.length} Lost Item${unmatchedLost.length > 1 ? 's' : ''} Not Yet Recovered`, description: 'Check status or update information', priority: 'low', link: '/lost-and-found', count: unmatchedLost.length });
  }

  // ════════════════════════════════════════════════
  // NOTICES — active polls, unread notices
  // ════════════════════════════════════════════════
  const activeNotices = notices.filter((n) => n.status === 'active' || !n.status);
  console.debug('[Recommender] Notices:', { active: activeNotices.length });

  // ════════════════════════════════════════════════
  // SUMMARY LOG
  // ════════════════════════════════════════════════
  console.debug('[Recommender] Total recommendations:', needsAttentionItems.length, needsAttentionItems.map((i) => i.label));

  const insights: Insight[] = [];
  if (overduePayments.length > 0) insights.push({ id: 'pay-warn', icon: 'payments', text: `You have ${overduePayments.length} overdue payment${overduePayments.length > 1 ? 's' : ''}. Pay soon to avoid late fees.`, type: 'warning' });
  if (pendingVisitors.length > 0) insights.push({ id: 'visitor-pending', icon: 'users', text: `${pendingVisitors.length} visitor request${pendingVisitors.length > 1 ? 's' : ''} need${pendingVisitors.length === 1 ? 's' : ''} your response.`, type: 'neutral' });
  if (openComplaints.length === 0 && overduePayments.length === 0) {
    insights.push({ id: 'all-good', icon: 'trending_up', text: 'Everything looks good! No pending complaints or overdue payments.', type: 'positive' });
  }
  if (packageCount > 0) {
    insights.push({ id: 'pkg', icon: 'package', text: `You have ${packageCount} package${packageCount > 1 ? 's' : ''} registered. Check the package status.`, type: 'neutral' });
  }
  if ((stats?.unreadNotifications || 0) > 0) {
    insights.push({ id: 'notif', icon: 'alert', text: `You have ${stats.unreadNotifications} unread notification${stats.unreadNotifications > 1 ? 's' : ''}.`, type: 'neutral' });
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Unable to load dashboard data.
            <button onClick={fetchData} className="ml-auto btn-secondary text-xs px-3 py-1"><RefreshCw className="w-3 h-3" /> Retry</button>
          </div>
        )}

        <DynamicGreeting role="Resident" name={user?.name} />

        {/* ROW 1: Overview Metrics */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'My Visitors', value: stats?.visitors ?? 0, icon: Users, color: 'text-primary-500', bg: 'bg-primary-500/10' },
            { label: 'Packages', value: stats?.packages ?? packageCount, icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Pending Dues', value: '₹' + (stats?.pendingPaymentsAmount || pendingMaintenanceAmount || 0).toLocaleString(), icon: CreditCard, color: 'text-danger-500', bg: 'bg-danger-500/10' },
            { label: 'Notifications', value: stats?.unreadNotifications ?? 0, icon: Bell, color: 'text-secondary-500', bg: 'bg-secondary-500/10' },
          ].map((card) => {
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

        {/* ROW 2: 3-column */}
        <div className="grid lg:grid-cols-3 gap-5">
          <TodaySummary items={todaySummaryItems} compact />
          <CommunityHealthScore factors={[
            { key: 'payments', label: 'Pending Payments', score: overduePayments.length === 0 ? 100 : Math.max(0, 100 - overduePayments.length * 25), weight: 30, explanation: overduePayments.length > 0 ? `${overduePayments.length} overdue` : undefined },
            { key: 'complaints', label: 'Open Complaints', score: openComplaints.length === 0 ? 100 : Math.max(0, 100 - openComplaints.length * 25), weight: 25, explanation: openComplaints.length > 0 ? `${openComplaints.length} unresolved` : undefined },
            { key: 'security', label: 'Security', score: 100, weight: 5 },
            { key: 'alerts', label: 'Notifications', score: (stats?.unreadNotifications || 0) === 0 ? 100 : Math.max(50, 100 - (stats?.unreadNotifications || 0) * 10), weight: 10, explanation: (stats?.unreadNotifications || 0) > 0 ? `${stats?.unreadNotifications || 0} unread` : undefined },
            { key: 'engagement', label: 'Visitor Engagement', score: (stats?.visitors || 0) > 2 ? 100 : (stats?.visitors || 0) > 0 ? 60 : 40, weight: 30, explanation: (stats?.visitors || 0) === 0 ? 'No recent visitors' : undefined },
          ]} />
          <AIInsightsPanel insights={insights} />
        </div>

        {/* ROW 3: 2-column */}
        <div className="grid lg:grid-cols-2 gap-5">
          <NeedsAttention items={needsAttentionItems} title="Recommended Actions" userId={user?._id} />
          <ActivityFeed events={recentActivity} />
        </div>

        {/* ROW 4: Detail sections — 2-col */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Recent Visitors */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold">Recent Visitors</h4>
              <Link href="/visitors" className="text-xs text-primary-400 font-medium flex items-center gap-1 hover:underline">View All <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {recentVisitors.length === 0 ? (
              <div className="text-center py-6 text-surface-400 text-sm">No visitors yet</div>
            ) : (
              <div className="space-y-2">
                {recentVisitors.map((visitor) => (
                  <div key={visitor._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 dark:bg-surface-800/40 border border-white/5 dark:border-surface-700/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {visitor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{visitor.name}</p>
                        <p className="text-xs text-surface-400">{visitor.purpose} &middot; {timeAgo(visitor.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {visitor.status === 'pending' && (
                        <>
                          <button onClick={() => handleVisitorAction(visitor._id, 'approved')} className="p-1.5 rounded-lg bg-secondary-500/10 text-secondary-400 hover:bg-secondary-500/20"><CheckCircle className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleVisitorAction(visitor._id, 'rejected')} className="p-1.5 rounded-lg bg-danger-500/10 text-danger-400 hover:bg-danger-500/20"><XCircle className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                      <span className={cn('badge text-[10px]', getStatusColor(visitor.status))}>{visitor.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Maintenance */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Home className="w-4 h-4" /> Maintenance</h4>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-6 text-surface-400 text-sm">No maintenance records</div>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 3).map((p) => {
                  const isOverdue = p.status === 'overdue';
                  const isPaid = p.status === 'paid';
                  return (
                    <div key={p._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 dark:bg-surface-800/40 border border-white/5 dark:border-surface-700/50">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          isPaid ? 'bg-secondary-500/10' : isOverdue ? 'bg-danger-500/10' : 'bg-warning-500/10'
                        )}>
                          {isPaid ? <CheckCircle className="w-4 h-4 text-secondary-400" /> : isOverdue ? <AlertCircle className="w-4 h-4 text-danger-400" /> : <Clock className="w-4 h-4 text-warning-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.title || p.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Charge'}</p>
                          <p className="text-xs text-surface-400">Due: {new Date(p.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={cn('text-sm font-bold', isPaid ? 'text-secondary-400' : 'text-danger-400')}>₹{p.amount?.toLocaleString()}</p>
                          <span className={cn('badge text-[10px]', isPaid ? 'bg-secondary-500/20 text-secondary-400' : isOverdue ? 'bg-danger-500/20 text-danger-400' : 'bg-warning-500/20 text-warning-400')}>
                            {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                          </span>
                        </div>
                        {!isPaid && <button onClick={() => handlePayClick(p)} className="btn-primary text-xs px-3 py-1.5">Pay</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Complaints */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold">My Complaints</h4>
              <Link href="/complaints" className="text-xs text-primary-400 font-medium flex items-center gap-1 hover:underline">View All <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {complaints.length === 0 ? (
              <div className="text-center py-6 text-surface-400 text-sm">No complaints</div>
            ) : (
              <div className="space-y-2">
                {complaints.map((c: any) => (
                  <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 dark:bg-surface-800/40 border border-white/5 dark:border-surface-700/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-surface-400">{c.category} &middot; {timeAgo(c.createdAt)}</p>
                    </div>
                    <span className={cn('badge text-[10px] ml-2', getStatusColor(c.status))}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lost & Found */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold">Lost & Found</h4>
              <Link href="/lost-and-found" className="text-xs text-primary-400 font-medium flex items-center gap-1 hover:underline">View All <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {lostItems.length === 0 && foundItems.length === 0 ? (
              <div className="text-center py-6 text-surface-400 text-sm">No items reported</div>
            ) : (
              <div className="space-y-2">
                {[...lostItems, ...foundItems].slice(0, 5).map((item: any) => (
                  <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 dark:bg-surface-800/40 border border-white/5 dark:border-surface-700/50">
                    <div>
                      <p className="text-sm font-medium">{item.itemName}</p>
                      <p className="text-xs text-surface-400">{item.location || item.foundLocation || ''}</p>
                    </div>
                    <span className={cn('badge text-[10px]', item.status === 'recovered' ? 'bg-secondary-500/20 text-secondary-400' : item.status === 'matched' ? 'bg-warning-500/20 text-warning-400' : 'bg-primary-500/20 text-primary-400')}>{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Report Complaint', desc: 'Submit new complaint', icon: FileText, color: 'text-warning-500', bg: 'bg-warning-500/10', href: '/complaints' },
            { label: 'Book Amenity', desc: 'Reserve clubhouse, pool, gym', icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-500/10', href: '/amenities' },
            { label: 'User Directory', desc: 'Find community members', icon: Search, color: 'text-info-500', bg: 'bg-info-500/10', onClick: () => setShowDirectory(true) },
            { label: 'Lost & Found', desc: 'Report or find items', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10', href: '/lost-and-found' },
            { label: 'SOS Emergency', desc: 'Send emergency alert', icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-500/10', onClick: () => setShowSos(true) },
            { label: 'Payment History', desc: 'View past transactions', icon: History, color: 'text-emerald-500', bg: 'bg-emerald-500/10', onClick: () => { setShowPaymentHistory(true); fetchPaymentHistory(); } },
            { label: 'Notification Settings', desc: 'Manage push alerts', icon: Settings, color: 'text-purple-500', bg: 'bg-purple-500/10', onClick: () => setShowNotifHistory(true) },
          ].map((a) => {
            const Icon = a.icon;
            const card = (
              <div className="action-card">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 action-icon', a.bg)}>
                  <Icon className={cn('w-5 h-5', a.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold mb-0.5">{a.label}</p>
                  <p className="text-xs text-surface-400">{a.desc}</p>
                </div>
              </div>
            );
            const wrapped = <TiltCard>{card}</TiltCard>;
            if (a.href) return <motion.div key={a.label} variants={staggerItem}><Link href={a.href}>{wrapped}</Link></motion.div>;
            return <motion.div key={a.label} variants={staggerItem}><button onClick={a.onClick} className="w-full text-left">{wrapped}</button></motion.div>;
          })}
        </div>

        <PushNotificationSettings onViewHistory={() => setShowNotifHistory(true)} />
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedPayment && (
          <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { if (!processingPayment) { setShowPaymentModal(false); setSelectedPayment(null); } }}>
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div variants={modalContent} className="relative bg-surface-900 rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden border border-surface-700" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-700">
                <h3 className="text-lg font-bold">Confirm Payment</h3>
                <p className="text-sm text-surface-400">Review payment details before confirming</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                  <span className="text-sm text-surface-400">Amount</span><span className="text-xl font-bold text-danger-400">₹{selectedPayment.amount?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                  <span className="text-sm text-surface-400">Due Date</span><span className="text-sm font-medium">{new Date(selectedPayment.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                  <span className="text-sm text-surface-400">Payment Type</span><span className="text-sm font-medium capitalize">{selectedPayment.type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                  <label className="text-sm text-surface-400 block mb-2">Payment Method</label>
                  <select className="input-field w-full" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="upi">UPI</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="net_banking">Net Banking</option>
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-surface-700 flex gap-3">
                <button onClick={() => { setShowPaymentModal(false); setSelectedPayment(null); }} className="flex-1 btn-secondary py-3" disabled={processingPayment}>Cancel</button>
                <button onClick={handleConfirmPayment} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2" disabled={processingPayment}>
                  {processingPayment ? (<><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Processing...</>) : (<><Banknote className="w-4 h-4" /> Pay ₹{selectedPayment.amount?.toLocaleString()}</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastReceipt && (
          <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setLastReceipt(null)}>
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div variants={modalContent} className="relative bg-surface-900 rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden border border-surface-700" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 text-center border-b border-surface-700">
                <div className="w-14 h-14 rounded-full bg-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-secondary-400" />
                </div>
                <h3 className="text-lg font-bold">Payment Successful</h3>
                <p className="text-sm text-surface-400">Your payment has been processed</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-surface-400">Receipt No.</span><span className="font-medium font-mono text-xs">{lastReceipt.number}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Amount</span><span className="font-bold">₹{lastReceipt.amount?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Date</span><span>{new Date(lastReceipt.date).toLocaleDateString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Method</span><span className="capitalize">{lastReceipt.paymentMethod?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Status</span><span className="text-secondary-400 font-medium">{lastReceipt.status}</span></div>
              </div>
              <div className="p-6 border-t border-surface-700">
                <button onClick={() => setLastReceipt(null)} className="w-full btn-primary py-3">Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentHistory && (
          <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentHistory(false)}>
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div variants={modalContent} className="relative bg-surface-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto max-h-[85vh] flex flex-col overflow-hidden border border-surface-700"
              onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Payment History</h3>
                  <p className="text-sm text-surface-400">All charges and payments</p>
                </div>
                <button onClick={() => setShowPaymentHistory(false)} className="p-2 rounded-lg hover:bg-surface-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {historyLoading ? (
                  <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
                ) : historyPayments.length === 0 ? (
                  <div className="text-center py-16">
                    <CreditCard className="w-16 h-16 mx-auto text-surface-600 mb-4" />
                    <p className="text-surface-400 text-lg font-medium mb-1">No payment history available</p>
                    <p className="text-surface-500 text-sm">Charges assigned to you will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyPayments.map((p) => {
                      const isPaid = p.status === 'paid';
                      const isOverdue = p.status === 'overdue';
                      return (
                        <div key={p._id} className={cn('p-4 rounded-xl border',
                          isPaid ? 'bg-secondary-500/5 border-secondary-500/20' :
                          isOverdue ? 'bg-danger-500/5 border-danger-500/20' :
                          'bg-surface-800/50 border-surface-700'
                        )}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-sm">{p.title || p.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Charge'}</p>
                              <p className="text-xs text-surface-500 mt-0.5 capitalize">{p.type?.replace(/_/g, ' ')}</p>
                            </div>
                            <div className="text-right">
                              <p className={cn('text-lg font-bold', isPaid ? 'text-secondary-400' : 'text-danger-400')}>₹{Number(p.amount).toLocaleString()}</p>
                              <span className={cn('badge text-xs', isPaid ? 'bg-secondary-500/20 text-secondary-400' : isOverdue ? 'bg-danger-500/20 text-danger-400' : 'bg-warning-500/20 text-warning-400')}>
                                {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-surface-500">
                            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>Due: {p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span></div>
                            {isPaid && p.paidAt && (<div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-secondary-400" /><span>Paid: {new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>)}
                            {p.paymentMethod && (<div className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /><span className="capitalize">Method: {p.paymentMethod.replace(/_/g, ' ')}</span></div>)}
                            {p.transactionId && (<div className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /><span className="font-mono">Ref: {p.transactionId}</span></div>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showSos && <SOSEmergency onClose={() => setShowSos(false)} />}
      {showDirectory && <UserDirectory onClose={() => setShowDirectory(false)} />}
      <NotificationHistoryModal open={showNotifHistory} onClose={() => setShowNotifHistory(false)} />
    </DashboardLayout>
  );
}
