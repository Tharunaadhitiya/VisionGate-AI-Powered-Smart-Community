'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { CreditCard, CheckCircle, Clock, AlertCircle, DollarSign, Home, Banknote } from 'lucide-react';
import { cn, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  useEffect(() => {
    if (!user?._id) return;
    const loadData = async () => {
      const [paymentsRes, summaryRes] = await Promise.allSettled([
        api.get('/payments?limit=50'),
        api.get('/payments/summary'),
      ]);
      if (paymentsRes.status === 'fulfilled') {
        console.log('Maintenance API Response:', paymentsRes.value);
        setPayments(paymentsRes.value.data.payments || []);
      } else {
        console.error('Failed to load payments:', paymentsRes.reason);
      }
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data || {});
      } else {
        console.error('Failed to load summary:', summaryRes.reason);
      }
      setLoading(false);
    };
    loadData();
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
      if (res.data?.receipt) setLastReceipt(res.data.receipt);
      setShowPaymentModal(false);
      setSelectedPayment(null);
      const s = await api.get('/payments/summary');
      setSummary(s.data || {});
    } catch (err: any) { toast.error(err.message || 'Payment failed'); }
    setProcessingPayment(false);
  };

  const totalDue = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Maintenance & Dues</h2>
          <p className="text-surface-400 text-sm">View and pay all charges assigned to you</p>
        </div>

        <div className="card-grid">
          <div className="stat-card">
            <p className="text-sm text-surface-400 mb-1">Total Due</p>
            <p className="text-2xl font-bold text-warning-500">₹{totalDue.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-surface-400 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-secondary-500">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-surface-400 mb-1">Pending</p>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-surface-400 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-danger-500">{overdueCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : payments.length === 0 ? (
          <div className="glass-card p-12 text-center"><CreditCard className="w-12 h-12 mx-auto text-surface-300 mb-3" /><p className="text-surface-400">No charges assigned</p></div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => {
              const isOverdue = p.status === 'overdue';
              const isPaid = p.status === 'paid';
              const isPending = p.status === 'pending';
              const TypeIcon = p.type === 'house_rent' ? Home : DollarSign;
              const typeLabel = p.title || p.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Charge';
              return (
                <div key={p._id} className="glass-card p-4 flex items-center justify-between">
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
                      <p className="text-xs text-surface-500">Due: {formatDate(p.dueDate)}</p>
                      {isPaid && p.paidAt && <p className="text-xs text-secondary-500">Paid On: {formatDate(p.paidAt)}</p>}
                      {isOverdue && <p className="text-xs text-danger-500 font-medium">Overdue</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={cn('text-base font-bold', isPaid ? 'text-secondary-500' : 'text-danger-500')}>
                        ₹{parseFloat(p.amount || 0).toLocaleString()}
                      </p>
                      <span className={cn('badge text-xs',
                        isPaid ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300' :
                        isOverdue ? 'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-300' :
                        'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300'
                      )}>
                        {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                      </span>
                    </div>
                    {!isPaid && (
                      <button onClick={() => handlePayClick(p)} className="btn-primary text-xs px-4 py-2">Pay Now</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                <span className="text-xl font-bold text-danger-500">₹{parseFloat(selectedPayment.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <span className="text-sm text-surface-500">Due Date</span>
                <span className="text-sm font-medium">{formatDate(selectedPayment.dueDate)}</span>
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
              <button onClick={() => { setShowPaymentModal(false); setSelectedPayment(null); }} className="flex-1 btn-secondary py-3" disabled={processingPayment}>Cancel</button>
              <button onClick={handleConfirmPayment} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2" disabled={processingPayment}>
                {processingPayment ? (
                  <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Processing...</>
                ) : (
                  <><Banknote className="w-4 h-4" /> Pay ₹{parseFloat(selectedPayment.amount || 0).toLocaleString()}</>
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
              <div className="flex justify-between text-sm"><span className="text-surface-400">Receipt No.</span><span className="font-medium font-mono text-xs">{lastReceipt.number}</span></div>
              <div className="flex justify-between text-sm"><span className="text-surface-400">Amount</span><span className="font-bold">₹{lastReceipt.amount?.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-surface-400">Date</span><span>{formatDate(lastReceipt.date)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-surface-400">Method</span><span className="capitalize">{lastReceipt.paymentMethod?.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-surface-400">Status</span><span className="text-secondary-500 font-medium">{lastReceipt.status}</span></div>
            </div>
            <div className="p-6 border-t border-surface-200 dark:border-surface-700">
              <button onClick={() => setLastReceipt(null)} className="w-full btn-primary py-3">Done</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
