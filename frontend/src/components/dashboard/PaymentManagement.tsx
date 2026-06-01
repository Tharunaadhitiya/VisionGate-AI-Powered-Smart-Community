'use client';
import { useState, useEffect } from 'react';
import { DollarSign, X, Plus, Search, CreditCard, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function PaymentManagement({ onClose }: { onClose: () => void }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ recipientId: '', amount: '', type: 'maintenance', dueDate: '', description: '' });

  useEffect(() => { fetchPayments(); fetchUsers(); }, []);

  const fetchPayments = async () => {
    try {
      const { data } = await api.get('/payments?limit=50');
      setPayments(data.payments || []);
    } catch {} finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users?limit=100');
      setUsers(data.users || []);
    } catch {}
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleCreate = async () => {
    if (!form.recipientId || !form.amount || !form.dueDate) return toast.error('Fill all required fields');
    try {
      await api.post('/payments', { ...form, amount: parseFloat(form.amount) });
      toast.success('Payment request sent');
      setShowForm(false);
      setForm({ recipientId: '', amount: '', type: 'maintenance', dueDate: '', description: '' });
      fetchPayments();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.put('/payments/' + id + '/cancel');
      toast.success('Payment cancelled');
      fetchPayments();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-4xl w-full max-h-[90vh] flex flex-col animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Payment & Fine Management</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New Payment Request</button>
        </div>

        {showForm && (
          <div className="mb-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border">
            <h4 className="text-sm font-semibold mb-3">Create Payment Request</h4>
            <div className="grid grid-cols-2 gap-3">
              <select className="input-field text-sm" value={form.recipientId} onChange={(e) => setForm({ ...form, recipientId: e.target.value })}>
                <option value="">Select user...</option>
                {users.filter((u) => u._id).map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.role}{u.flatNumber ? ' - ' + u.flatNumber : ''})</option>
                ))}
              </select>
              <input className="input-field text-sm" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <select className="input-field text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="rent">House Rent</option>
                <option value="maintenance">Maintenance Fee</option>
                <option value="penalty">Penalty</option>
                <option value="fine">Fine</option>
                <option value="other">Other</option>
              </select>
              <input className="input-field text-sm" type="date" min={minDate} max={maxDate} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              <input className="input-field text-sm col-span-2" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm flex-1">Cancel</button>
              <button onClick={handleCreate} className="btn-primary text-sm flex-1">Send Request</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-400 text-xs border-b border-surface-100 dark:border-surface-800">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-b border-surface-50 dark:border-surface-800/50 hover:bg-surface-50/50">
                  <td className="py-2.5 font-medium">{p.recipient?.name || 'N/A'}</td>
                  <td className="py-2.5 capitalize">{p.type}</td>
                  <td className="py-2.5 font-medium">?{p.amount?.toLocaleString()}</td>
                  <td className="py-2.5 text-surface-400">{p.dueDate ? formatDate(p.dueDate) : '-'}</td>
                  <td className="py-2.5">
                    <span className={cn('badge text-[10px]', p.status === 'paid' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : p.status === 'overdue' ? 'badge-danger' : 'badge-neutral')}>{p.status}</span>
                  </td>
                  <td className="py-2.5">
                    {p.status === 'pending' && (
                      <button onClick={() => handleCancel(p._id)} className="p-1.5 rounded-lg hover:bg-danger-50 hover:text-danger-600"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && payments.length === 0 && <p className="text-center py-8 text-surface-400 text-sm">No payment records</p>}
        </div>
      </div>
    </div>
  );
}
