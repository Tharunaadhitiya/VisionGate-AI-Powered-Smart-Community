'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { CreditCard, CheckCircle, Clock, AlertCircle, IndianRupee } from 'lucide-react';
import { cn, formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function MaintenancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/maintenance?limit=50'),
      api.get('/maintenance/summary'),
    ]).then(([r, s]) => {
      setRecords(r.data.records || []);
      setSummary(s.data || {});
    }).finally(() => setLoading(false));
  }, []);

  const handlePay = async (id: string, method: string) => {
    try {
      await api.put(`/maintenance/${id}/pay`, { paymentMethod: method, transactionId: `TXN${Date.now()}` });
      toast.success('Payment successful!');
      window.location.reload();
    } catch { toast.error('Payment failed'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Maintenance</h2>
          <p className="text-surface-400 text-sm">Pay maintenance fees and track history</p>
        </div>

        <div className="card-grid">
          <div className="stat-card">
            <p className="text-sm text-surface-400 mb-1">Total Due</p>
            <p className="text-2xl font-bold text-warning-500">₹{summary.totalDue || 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-surface-400 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-secondary-500">₹{summary.totalPaid || 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-surface-400 mb-1">Pending</p>
            <p className="text-2xl font-bold">{summary.pending || 0}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-surface-400 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-danger-500">{summary.overdue || 0}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : records.length === 0 ? (
          <div className="glass-card p-12 text-center"><CreditCard className="w-12 h-12 mx-auto text-surface-300 mb-3" /><p className="text-surface-400">No records</p></div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100 dark:border-surface-800">
                    {['Period', 'Amount', 'Due Date', 'Status', 'Payment', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {records.map((r) => (
                    <tr key={r._id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30">
                      <td className="px-4 py-3 text-sm">{r.month}/{r.year} ({r.period})</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{r.amount}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(r.dueDate)}</td>
                      <td className="px-4 py-3"><span className={cn('badge text-xs', getStatusColor(r.status))}>{r.status}</span></td>
                      <td className="px-4 py-3 text-sm">{r.paymentMethod || '-'}</td>
                      <td className="px-4 py-3">
                        {r.status === 'pending' && (
                          <div className="flex gap-1">
                            {['upi', 'credit_card', 'net_banking'].map((m) => (
                              <button key={m} onClick={() => handlePay(r._id, m)} className="btn-primary text-xs py-1 px-2">{m.replace('_', ' ')}</button>
                            ))}
                          </div>
                        )}
                        {r.status === 'paid' && <span className="text-xs text-secondary-500">Paid on {formatDate(r.paidAt)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
