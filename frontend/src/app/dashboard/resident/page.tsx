'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, FileText, CreditCard, Bell, AlertTriangle, MessageSquare, Calendar, ArrowRight, Phone, Clock, Shield, CheckCircle, XCircle, AlertCircle, DollarSign, Home, Banknote, Package, Search, PlusCircle, BookOpen, History, Settings, TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react';
import { cn, timeAgo, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import TiltCard from '@/components/ui/TiltCard';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import AIInsights from '@/components/dashboard/AIInsights';
import PushNotificationSettings from '@/components/notifications/PushNotificationSettings';
import NotificationHistoryModal from '@/components/notifications/NotificationHistoryModal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp, modalOverlay, modalContent } from '@/lib/animation';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState(false);
  const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
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
  const hasDataRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    try {
      api.post('/payments/check-overdue').catch(() => {});

      const [dashRes, visitorsRes, complaintsRes, paymentsRes, lostItemsRes, pkgRes] = await Promise.allSettled([
        api.get('/analytics/resident-dashboard'),
        api.get('/visitors', { limit: '5', residentId: String(user._id) }),
        api.get('/complaints', { limit: '3' }),
        api.get('/payments'),
        api.get('/lost-found/my-items'),
        api.get('/packages', { residentId: String(user._id) }),
      ]);

      if (dashRes.status === 'fulfilled') { setStats(dashRes.value.data || {}); hasDataRef.current = true; setError(false); }
      else if (!hasDataRef.current) setError(true);

      if (visitorsRes.status === 'fulfilled') setRecentVisitors(visitorsRes.value.data.visitors || []);
      if (complaintsRes.status === 'fulfilled') setComplaints(complaintsRes.value.data.complaints || []);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.data.payments || []);
      if (lostItemsRes.status === 'fulfilled') {
        const d = lostItemsRes.value.data || {};
        setLostItems(d.lostItems || []);
        setFoundItems(d.foundItems || []);
      }
      if (pkgRes.status === 'fulfilled') {
        const pkgs = pkgRes.value.data?.packages || [];
        setPackageCount(pkgs.length);
      }

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
      await api.put('/visitors/' + id + '/status', { status });
      toast.success('Visitor ' + status);
      setRecentVisitors((prev) => prev.map((v) => v._id === id ? { ...v, status } : v));
    } catch { toast.error('Action failed'); }
  };

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

  const allPendingPayments = payments.filter((p) => p.status === 'pending');

  const statCards = error ? [] : [
    { label: 'My Visitors', value: stats?.visitors ?? 0, icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: 'Open Complaints', value: stats?.pendingComplaints ?? 0, icon: FileText, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Pending Dues', value: '₹' + ((stats?.pendingMaintenance || 0).toLocaleString()), icon: CreditCard, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
    { label: 'Packages', value: stats?.packages ?? packageCount, icon: Package, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
    { label: 'Lost Items', value: stats?.lostItems ?? lostItems.length, icon: Search, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Found Items', value: stats?.foundItems ?? foundItems.length, icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Pending Payments', value: stats?.pendingPayments ?? allPendingPayments.length, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Notifications', value: stats?.unreadNotifications ?? 0, icon: Bell, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
  ];

  const quickActions = [
    { label: 'Report Complaint', desc: 'Submit a new complaint', icon: FileText, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10', href: '/complaints' },
    { label: 'Book Amenity', desc: 'Reserve clubhouse, pool, gym', icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10', href: '/amenities' },
    { label: 'Register Visitor', desc: 'Pre-register guests', icon: PlusCircle, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10', href: '/visitors' },
    { label: 'User Directory', desc: 'Find community members', icon: Search, color: 'text-info-500', bg: 'bg-info-50 dark:bg-info-500/10', onClick: () => setShowDirectory(true) },
    { label: 'Lost & Found', desc: 'Report or find items', icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', href: '/lost-and-found' },
    { label: 'SOS Emergency', desc: 'Send emergency alert', icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10', onClick: () => setShowSos(true) },
    { label: 'Payment History', desc: 'View past transactions', icon: History, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', onClick: () => { setShowPaymentHistory(true); fetchPaymentHistory(); } },
    { label: 'Notification Settings', desc: 'Manage push alerts', icon: Settings, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', onClick: () => setShowNotifHistory(true) },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My Dashboard</h2>
            <p className="text-surface-400 text-sm">{user?.flatNumber}, Tower {user?.tower}</p>
          </div>
          <div className="flex items-center gap-2">
            <OnlineStatusBadge userId={user?._id || ''} />
            <button onClick={() => setShowDirectory(true)} className="btn-secondary text-sm"><Users className="w-4 h-4" /> Directory</button>
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
              Unable to load dashboard data.
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
              const card = (
                <div className="action-card">
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
                </div>
              );
              const wrapped = <TiltCard>{card}</TiltCard>;
              if (action.href) {
                return <motion.div key={action.label} variants={staggerItem}><Link href={action.href}>{wrapped}</Link></motion.div>;
              }
              return <motion.div key={action.label} variants={staggerItem}><button onClick={action.onClick} className="w-full text-left">{wrapped}</button></motion.div>;
            })}
          </motion.div>
        </div>

        {/* --- Section: AI Insights --- */}
        <div className="mt-8">
          <AIInsights />
        </div>

        {/* --- Section: Recent Activity --- */}
        <div className="mt-8">
          <h3 className="section-title mb-6">Recent Activity</h3>

          <div className="grid grid-cols-2 gap-6">
            {/* Maintenance */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Home className="w-4 h-4" /> Maintenance</h4>
              </div>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-sm">No maintenance records</div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => {
                    const isOverdue = p.status === 'overdue';
                    const isPaid = p.status === 'paid';
                    const isPending = p.status === 'pending';
                    const statusBadgeColor = isPaid ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300' :
                      isOverdue ? 'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-300' :
                      'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
                    const typeLabel = p.title || p.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Charge';
                    const TypeIcon = p.type === 'house_rent' ? Home : DollarSign;
                    return (
                      <div key={p._id} className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/50 dark:border-surface-700/50">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center',
                            isPaid ? 'bg-secondary-50 dark:bg-secondary-500/10' : isOverdue ? 'bg-danger-50 dark:bg-danger-500/10' : 'bg-warning-50 dark:bg-warning-500/10'
                          )}>
                            <TypeIcon className={cn('w-6 h-6', isPaid ? 'text-secondary-500' : isOverdue ? 'text-danger-500' : 'text-warning-500')} />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-surface-900 dark:text-surface-100">{typeLabel}</p>
                            <p className="text-xs text-surface-500 dark:text-surface-400">Due: {new Date(p.dueDate).toLocaleDateString()}</p>
                            {isPaid && p.paidAt && <p className="text-xs text-secondary-500">Paid On: {new Date(p.paidAt).toLocaleDateString()}</p>}
                            {isPaid && p.paymentMethod && <p className="text-xs text-surface-500 capitalize">via {p.paymentMethod.replace(/_/g, ' ')}{p.transactionId ? ` · ${p.transactionId}` : ''}</p>}
                            {isOverdue && <p className="text-xs text-danger-500 font-medium">Overdue</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={cn('text-base font-bold', isPaid ? 'text-secondary-500' : 'text-danger-500')}>₹{p.amount?.toLocaleString()}</p>
                            <span className={cn('badge text-xs', statusBadgeColor)}>{isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}</span>
                          </div>
                          {!isPaid && <button onClick={() => handlePayClick(p)} className="btn-primary text-xs px-4 py-2">Pay Now</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Recent Visitors */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold">Recent Visitors</h4>
                <Link href="/visitors" className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">View All <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {recentVisitors.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-sm">No visitors yet</div>
              ) : (
                <div className="space-y-3">
                  {recentVisitors.map((visitor) => (
                    <div key={visitor._id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {visitor.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-surface-900 dark:text-surface-100">{visitor.name}</p>
                          <p className="text-xs text-surface-500 dark:text-surface-400">{visitor.purpose} &middot; {timeAgo(visitor.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {visitor.status === 'pending' && (
                          <>
                            <button onClick={() => handleVisitorAction(visitor._id, 'approved')} className="p-2 rounded-lg bg-secondary-50 dark:bg-secondary-500/10 text-secondary-600 hover:bg-secondary-100"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => handleVisitorAction(visitor._id, 'rejected')} className="p-2 rounded-lg bg-danger-50 dark:bg-danger-500/10 text-danger-600 hover:bg-danger-100"><XCircle className="w-4 h-4" /></button>
                          </>
                        )}
                        <span className={cn('badge text-xs', getStatusColor(visitor.status))}>{visitor.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* My Complaints */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold">My Complaints</h4>
                <Link href="/complaints" className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">View All <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {complaints.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-sm">No complaints</div>
              ) : (
                <div className="space-y-3">
                  {complaints.map((c: any) => (
                    <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-surface-900 dark:text-surface-100">{c.title}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">{c.category} &middot; {timeAgo(c.createdAt)}</p>
                      </div>
                      <span className={cn('badge text-xs ml-2', getStatusColor(c.status))}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Lost & Found */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-30px' }} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold">Lost & Found</h4>
                <Link href="/lost-and-found" className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">View All <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {lostItems.length === 0 && foundItems.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-sm">No lost or found items reported</div>
              ) : (
                <div className="space-y-2">
                  {[...lostItems, ...foundItems].slice(0, 5).map((item: any) => (
                    <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                      <div>
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{item.itemName}</p>
                        <p className="text-xs text-surface-500">{item.location || item.foundLocation || ''}</p>
                      </div>
                      <span className={cn('badge text-xs', item.status === 'recovered' ? 'badge-secondary' : item.status === 'matched' ? 'badge-warning' : 'badge-primary')}>{item.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* --- Push Notification Settings --- */}
        <div className="mt-8">
          <PushNotificationSettings onViewHistory={() => setShowNotifHistory(true)} />
        </div>
      </div>

      <AnimatePresence>
        {showPaymentModal && selectedPayment && (
          <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { if (!processingPayment) { setShowPaymentModal(false); setSelectedPayment(null); } }}>
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div variants={modalContent} className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden modal-elevated" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-200 dark:border-surface-700">
                <h3 className="text-lg font-bold">Confirm Payment</h3>
                <p className="text-sm text-surface-400">Review payment details before confirming</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-sm text-surface-500">Amount</span><span className="text-xl font-bold text-danger-500">₹{selectedPayment.amount?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-sm text-surface-500">Due Date</span><span className="text-sm font-medium">{new Date(selectedPayment.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                  <span className="text-sm text-surface-500">Payment Type</span><span className="text-sm font-medium capitalize">{selectedPayment.type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                  <label className="text-sm text-surface-500 block mb-2">Payment Method</label>
                  <select className="input-field w-full" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="upi">UPI</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="net_banking">Net Banking</option>
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-surface-200 dark:border-surface-700 flex gap-3">
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
            <motion.div variants={modalContent} className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-sm mx-auto overflow-hidden modal-elevated" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 text-center border-b border-surface-200 dark:border-surface-700">
                <div className="w-14 h-14 rounded-full bg-secondary-100 dark:bg-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-secondary-500" />
                </div>
                <h3 className="text-lg font-bold">Payment Successful</h3>
                <p className="text-sm text-surface-400">Your payment has been processed</p>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-surface-400">Receipt No.</span><span className="font-medium font-mono text-xs">{lastReceipt.number}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Amount</span><span className="font-bold">₹{lastReceipt.amount?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Date</span><span>{new Date(lastReceipt.date).toLocaleDateString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Method</span><span className="capitalize">{lastReceipt.paymentMethod?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Status</span><span className="text-secondary-500 font-medium">{lastReceipt.status}</span></div>
              </div>
              <div className="p-6 border-t border-surface-200 dark:border-surface-700">
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
            <motion.div variants={modalContent} className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto max-h-[85vh] flex flex-col overflow-hidden modal-elevated"
              onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Payment History</h3>
                  <p className="text-sm text-surface-400">All charges and payments</p>
                </div>
                <button onClick={() => setShowPaymentHistory(false)} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {historyLoading ? (
                  <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
                ) : historyPayments.length === 0 ? (
                  <div className="text-center py-16">
                    <CreditCard className="w-16 h-16 mx-auto text-surface-300 mb-4" />
                    <p className="text-surface-400 text-lg font-medium mb-1">No payment history available</p>
                    <p className="text-surface-500 text-sm">Charges assigned to you will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyPayments.map((p) => {
                      const isPaid = p.status === 'paid';
                      const isOverdue = p.status === 'overdue';
                      const isPending = p.status === 'pending';
                      return (
                        <div key={p._id} className={cn('p-4 rounded-xl border',
                          isPaid ? 'bg-secondary-50/50 dark:bg-secondary-500/5 border-secondary-200 dark:border-secondary-500/20' :
                          isOverdue ? 'bg-danger-50/50 dark:bg-danger-500/5 border-danger-200 dark:border-danger-500/20' :
                          'bg-surface-50 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700'
                        )}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-sm">{p.title || p.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Charge'}</p>
                              <p className="text-xs text-surface-500 mt-0.5 capitalize">{p.type?.replace(/_/g, ' ')}</p>
                            </div>
                            <div className="text-right">
                              <p className={cn('text-lg font-bold', isPaid ? 'text-secondary-500' : 'text-danger-500')}>₹{Number(p.amount).toLocaleString()}</p>
                              <span className={cn('badge text-xs',
                                isPaid ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300' :
                                isOverdue ? 'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-300' :
                                'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300'
                              )}>{isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-surface-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Due: {p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                            </div>
                            {isPaid && p.paidAt && (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-secondary-500" />
                                <span>Paid: {new Date(p.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            )}
                            {p.paymentMethod && (
                              <div className="flex items-center gap-1.5">
                                <Banknote className="w-3.5 h-3.5" />
                                <span className="capitalize">Method: {p.paymentMethod.replace(/_/g, ' ')}</span>
                              </div>
                            )}
                            {p.transactionId && (
                              <div className="flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5" />
                                <span className="font-mono">Ref: {p.transactionId}</span>
                              </div>
                            )}
                            {p.description && (
                              <div className="col-span-2 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                <span>{p.description}</span>
                              </div>
                            )}
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
