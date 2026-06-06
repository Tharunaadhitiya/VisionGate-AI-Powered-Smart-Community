'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, FileText, CreditCard, Bell, AlertTriangle, MessageSquare, Calendar, ArrowRight, Phone, Clock, Shield, CheckCircle, XCircle, AlertCircle, DollarSign, Home, Banknote } from 'lucide-react';
import { cn, formatDateTime, timeAgo, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import AIInsights from '@/components/dashboard/AIInsights';
import PushNotificationSettings from '@/components/notifications/PushNotificationSettings';
import NotificationHistoryModal from '@/components/notifications/NotificationHistoryModal';
import toast from 'react-hot-toast';

const formatDate = (date: string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showNotifHistory, setShowNotifHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [lostItems, setLostItems] = useState<any[]>([]);
  const [foundItems, setFoundItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user?._id) return;
    api.post('/payments/check-overdue').catch(() => {});

    const fetchDashboard = async () => {
      const results = await Promise.allSettled([
        api.get('/visitors', { limit: '5', residentId: String(user._id) }),
        api.get('/complaints', { limit: '3' }),
        api.get('/analytics/resident/' + user._id),
        api.get('/payments'),
        api.get('/lost-found/my-items'),
      ]);

      const [visitorsRes, complaintsRes, analyticsRes, paymentsRes, lostItemsRes] = results;

      if (visitorsRes.status === 'fulfilled') {
        setRecentVisitors(visitorsRes.value.data.visitors || []);
      }
      if (complaintsRes.status === 'fulfilled') {
        setComplaints(complaintsRes.value.data.complaints || []);
      }
      if (analyticsRes.status === 'fulfilled') {
        setStats(analyticsRes.value.data || {});
      }
      if (paymentsRes.status === 'fulfilled') {
        console.log('Maintenance API Response:', paymentsRes.value);
        setPayments(paymentsRes.value.data.payments || []);
      } else {
        console.error('Payments API failed:', paymentsRes.reason);
      }
      if (lostItemsRes.status === 'fulfilled') {
        const d = lostItemsRes.value.data || {};
        setLostItems(d.lostItems || []);
        setFoundItems(d.foundItems || []);
      }

      setLoading(false);
    };

    fetchDashboard();
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
      const res = await api.put('/payments/' + selectedPayment._id + '/pay', {
        paymentMethod,
        transactionId: 'TXN' + Date.now(),
      });
      toast.success('Payment successful!');
      setPayments((prev) => prev.map((p) => p._id === selectedPayment._id ? { ...p, status: 'paid', paidAt: new Date().toISOString() } : p));
      if (res.data?.receipt) {
        setLastReceipt(res.data.receipt);
      }
      setShowPaymentModal(false);
      setSelectedPayment(null);
      const analyticsRes = await api.get('/analytics/resident/' + user?._id);
      setStats(analyticsRes.data || {});
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

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  const allPendingPayments = payments.filter((p) => p.status === 'pending');

  const statCards = [
    { label: 'Visitors Today', value: stats.visitors || 0, icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: 'Open Complaints', value: stats.pendingComplaints || 0, icon: FileText, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Pending Dues', value: '₹' + ((stats.pendingMaintenance || 0).toLocaleString()), icon: CreditCard, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
    { label: 'Alerts', value: stats.alerts || 0, icon: Bell, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
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

        <div className="card-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                    <Icon className={cn('w-5 h-5', card.color)} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-surface-400">{card.label}</p>
              </div>
            );
          })}
        </div>

        <AIInsights />

        <PushNotificationSettings onViewHistory={() => setShowNotifHistory(true)} />

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title flex items-center gap-2"><Home className="w-4 h-4" /> Maintenance</h3>
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
                          isPaid ? 'bg-secondary-50 dark:bg-secondary-500/10' :
                          isOverdue ? 'bg-danger-50 dark:bg-danger-500/10' :
                          'bg-warning-50 dark:bg-warning-500/10'
                        )}>
                          <TypeIcon className={cn('w-6 h-6',
                            isPaid ? 'text-secondary-500' : isOverdue ? 'text-danger-500' : 'text-warning-500'
                          )} />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-surface-900 dark:text-surface-100">{typeLabel}</p>
                          <p className="text-xs text-surface-500 dark:text-surface-400">Due: {new Date(p.dueDate).toLocaleDateString()}</p>
                          {isPaid && p.paidAt && (
                            <p className="text-xs text-secondary-500">Paid On: {new Date(p.paidAt).toLocaleDateString()}</p>
                          )}
                          {isOverdue && (
                            <p className="text-xs text-danger-500 font-medium">Overdue</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={cn('text-base font-bold',
                            isPaid ? 'text-secondary-500' : isOverdue ? 'text-danger-500' : 'text-danger-500'
                          )}>₹{p.amount?.toLocaleString()}</p>
                          <span className={cn('badge text-xs', statusBadgeColor)}>
                            {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                          </span>
                        </div>
                        {!isPaid && (
                          <button onClick={() => handlePayClick(p)} className="btn-primary text-xs px-4 py-2">
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Recent Visitors</h3>
              <Link href="/visitors" className="text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">My Complaints</h3>
              <Link href="/complaints" className="text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Lost & Found</h3>
              <Link href="/lost-and-found" className="text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
          </div>
        </div>
      </div>

      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { if (!processingPayment) { setShowPaymentModal(false); setSelectedPayment(null); } }}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-200 dark:border-surface-700">
              <h3 className="text-lg font-bold">Confirm Payment</h3>
              <p className="text-sm text-surface-400">Review payment details before confirming</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="text-sm text-surface-500">Amount</span>
                <span className="text-xl font-bold text-danger-500">₹{selectedPayment.amount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="text-sm text-surface-500">Due Date</span>
                <span className="text-sm font-medium">{new Date(selectedPayment.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="text-sm text-surface-500">Payment Type</span>
                <span className="text-sm font-medium capitalize">{selectedPayment.type?.replace(/_/g, ' ')}</span>
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
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedPayment(null); }}
                className="flex-1 btn-secondary py-3"
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Processing...</>
                ) : (
                  <><Banknote className="w-4 h-4" /> Pay ₹{selectedPayment.amount?.toLocaleString()}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setLastReceipt(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center border-b border-surface-200 dark:border-surface-700">
              <div className="w-14 h-14 rounded-full bg-secondary-100 dark:bg-secondary-500/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-secondary-500" />
              </div>
              <h3 className="text-lg font-bold">Payment Successful</h3>
              <p className="text-sm text-surface-400">Your payment has been processed</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Receipt No.</span>
                <span className="font-medium font-mono text-xs">{lastReceipt.number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Amount</span>
                <span className="font-bold">₹{lastReceipt.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Date</span>
                <span>{new Date(lastReceipt.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Method</span>
                <span className="capitalize">{lastReceipt.paymentMethod?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Status</span>
                <span className="text-secondary-500 font-medium">{lastReceipt.status}</span>
              </div>
            </div>
            <div className="p-6 border-t border-surface-200 dark:border-surface-700">
              <button onClick={() => setLastReceipt(null)} className="w-full btn-primary py-3">Done</button>
            </div>
          </div>
        </div>
      )}

      {showSos && <SOSEmergency onClose={() => setShowSos(false)} />}
      {showDirectory && <UserDirectory onClose={() => setShowDirectory(false)} />}
      <NotificationHistoryModal open={showNotifHistory} onClose={() => setShowNotifHistory(false)} />
    </DashboardLayout>
  );
}
