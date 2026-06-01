'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Users, FileText, CreditCard, Bell, AlertTriangle, MessageSquare, Calendar, ArrowRight, Phone, Clock, Shield, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { cn, formatDateTime, timeAgo, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import SOSEmergency from '@/components/dashboard/SOSEmergency';
import UserDirectory from '@/components/dashboard/UserDirectory';
import OnlineStatusBadge from '@/components/dashboard/OnlineStatusBadge';
import AIInsights from '@/components/dashboard/AIInsights';
import toast from 'react-hot-toast';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [visitorForm, setVisitorForm] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('personal');
  const [payingPaymentId, setPayingPaymentId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  useEffect(() => {
    Promise.all([
      api.get('/visitors?limit=5'),
      api.get('/complaints?limit=3'),
      api.get('/analytics/resident/' + user?._id),
      api.get('/payments'),
    ]).then(([visitorsRes, complaintsRes, analyticsRes, paymentsRes]) => {
      setRecentVisitors(visitorsRes.data.visitors || []);
      setComplaints(complaintsRes.data.complaints || []);
      setStats(analyticsRes.data || {});
      setPayments(paymentsRes.data.payments || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handlePayPayment = async (paymentId: string) => {
    try {
      await api.put('/payments/' + paymentId + '/pay', { paymentMethod, transactionId: 'TXN' + Date.now() });
      toast.success('Payment successful!');
      setPayingPaymentId(null);
      setPayments((prev) => prev.map((p) => p._id === paymentId ? { ...p, status: 'paid' } : p));
    } catch (err: any) { toast.error(err.message || 'Payment failed'); }
  };

  const handleVisitorAction = async (id: string, status: string) => {
    try {
      await api.put('/visitors/' + id + '/status', { status });
      toast.success('Visitor ' + status);
      setRecentVisitors((prev) => prev.map((v) => v._id === id ? { ...v, status } : v));
    } catch { toast.error('Action failed'); }
  };

  const addVisitor = async () => {
    if (!visitorName.trim() || !visitorPhone.trim()) return toast.error('Name and phone required');
    try {
      const res = await api.post('/visitors', { name: visitorName, phone: visitorPhone, purpose: visitorPurpose });
      const otp = res.data.otp;
      toast.success('Visitor added! OTP: ' + otp);
      setVisitorName(''); setVisitorPhone('');
      setVisitorForm(false);
      window.location.reload();
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div></DashboardLayout>;

  const statCards = [
    { label: 'Visitors Today', value: stats.visitors || 0, icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { label: 'Open Complaints', value: stats.pendingComplaints || 0, icon: FileText, color: 'text-warning-500', bg: 'bg-warning-50 dark:bg-warning-500/10' },
    { label: 'Pending Dues', value: '₹' + (stats.pendingMaintenance || 0), icon: CreditCard, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
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

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">My Payments</h3>
            </div>
            {payments.filter((p) => p.status === 'pending').length === 0 ? (
              <div className="text-center py-8 text-surface-400 text-sm">No pending payments</div>
            ) : (
              <div className="space-y-3">
                {payments.filter((p) => p.status === 'pending').map((p) => (
                  <div key={p._id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-500/10 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-warning-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.description || p.type}</p>
                        <p className="text-xs text-surface-400">Due: {new Date(p.dueDate).toLocaleDateString()} &middot; {p.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-danger-500">${p.amount?.toLocaleString()}</span>
                      {payingPaymentId === p._id ? (
                        <div className="flex items-center gap-1">
                          <select className="input-field text-xs py-1 w-24" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                            <option value="upi">UPI</option>
                            <option value="credit_card">Card</option>
                            <option value="debit_card">Debit</option>
                            <option value="net_banking">NetBank</option>
                            <option value="cash">Cash</option>
                          </select>
                          <button onClick={() => handlePayPayment(p._id)} className="btn-primary text-xs py-1">Pay</button>
                          <button onClick={() => setPayingPaymentId(null)} className="p-1 rounded hover:bg-surface-200"><XCircle className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setPayingPaymentId(p._id)} className="btn-primary text-xs">Pay Now</button>
                      )}
                    </div>
                  </div>
                ))}
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
                        <p className="font-medium text-sm">{visitor.name}</p>
                        <p className="text-xs text-surface-400">{visitor.purpose} &middot; {timeAgo(visitor.createdAt)}</p>
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
            <button onClick={() => setVisitorForm(!visitorForm)} className="btn-secondary w-full mt-3 text-sm">Add Visitor</button>
            {visitorForm && (
              <div className="mt-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <input className="input-field text-sm mb-2" placeholder="Visitor Name" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
                <input className="input-field text-sm mb-2" placeholder="Phone Number" value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} />
                <select className="input-field text-sm mb-2" value={visitorPurpose} onChange={(e) => setVisitorPurpose(e.target.value)}>
                  <option value="personal">Personal</option>
                  <option value="delivery">Delivery</option>
                  <option value="service">Service</option>
                  <option value="emergency">Emergency</option>
                  <option value="other">Other</option>
                </select>
                <button onClick={addVisitor} className="btn-primary w-full text-sm">Register Visitor</button>
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
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-surface-400">{c.category} &middot; {timeAgo(c.createdAt)}</p>
                    </div>
                    <span className={cn('badge text-xs ml-2', getStatusColor(c.status))}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSos && <SOSEmergency onClose={() => setShowSos(false)} />}
      {showDirectory && <UserDirectory onClose={() => setShowDirectory(false)} />}
    </DashboardLayout>
  );
}
