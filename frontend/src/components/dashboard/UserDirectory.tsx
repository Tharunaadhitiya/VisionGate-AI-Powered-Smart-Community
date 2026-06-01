'use client';
import { useState, useEffect } from 'react';
import { Search, X, Phone, Mail, Home, DollarSign } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UserItem {
  _id: string; name: string; email: string; phone: string; role: string;
  flatNumber?: string; tower?: string;
}

export default function UserDirectory({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { onlineUsers } = useSocket();
  const { user: currentUser } = useAuth();
  const [chargeUser, setChargeUser] = useState<string | null>(null);
  const [chargeForm, setChargeForm] = useState({ reason: '', amount: '' });
  const [sendingCharge, setSendingCharge] = useState(false);

  useEffect(() => {
    import('@/lib/api').then(({ default: api }) => {
      api.get('/users?limit=200').then(({ data }: any) => setUsers(data.users || [])).catch(() => {}).finally(() => setLoading(false));
    });
  }, []);

  const isOnline = (userId: string) => onlineUsers.some((u: any) => u.userId === userId);

  const isAdmin = currentUser?.role === 'admin';

  const handleCharge = async (userId: string) => {
    if (!chargeForm.reason.trim() || !chargeForm.amount) return toast.error('Enter reason and amount');
    setSendingCharge(true);
    try {
      const { default: api } = await import('@/lib/api');
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await api.post('/payments', {
        recipientId: userId,
        amount: parseFloat(chargeForm.amount),
        type: 'other',
        dueDate,
        description: chargeForm.reason.trim(),
      });
      toast.success('Payment request sent');
      setChargeUser(null);
      setChargeForm({ reason: '', amount: '' });
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setSendingCharge(false);
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase()) && !(u.flatNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-2xl w-full max-h-[80vh] flex flex-col animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">User Directory</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 py-2 text-sm" placeholder="Search by name, email, flat..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input-field w-32 text-sm py-2" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="resident">Residents</option>
            <option value="security">Security</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.map((u) => (
            <div key={u._id}>
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {u.name.charAt(0)}
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-surface-900 rounded-full', isOnline(u._id) ? 'bg-secondary-500' : 'bg-surface-300')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{u.name}</p>
                    <span className={cn('badge text-[10px]', u.role === 'admin' ? 'badge-info' : u.role === 'security' ? 'badge-warning' : 'badge-success')}>{u.role}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                    <span className="flex items-center gap-1 font-medium"><Mail className="w-3.5 h-3.5" /> {u.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</span>
                    {u.flatNumber && <span className="flex items-center gap-1"><Home className="w-3 h-3" /> {u.flatNumber}, T{u.tower}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn('w-1.5 h-1.5 rounded-full', isOnline(u._id) ? 'bg-secondary-500' : 'bg-surface-300')} />
                  {isOnline(u._id) ? 'Online' : 'Offline'}
                  {isAdmin && u._id !== currentUser?._id && (
                    <button onClick={() => { setChargeUser(chargeUser === u._id ? null : u._id); setChargeForm({ reason: '', amount: '' }); }}
                      className="ml-2 p-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 hover:bg-primary-100">
                      <DollarSign className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {chargeUser === u._id && (
                <div className="mx-3 mb-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-primary-200 dark:border-primary-500/20">
                  <p className="text-xs font-semibold mb-2">Set Payment for {u.name}</p>
                  <div className="flex gap-2 mb-2">
                    <input className="input-field flex-1 text-sm" placeholder="Reason (e.g. Club fee)" value={chargeForm.reason}
                      onChange={(e) => setChargeForm({ ...chargeForm, reason: e.target.value })} />
                    <input className="input-field w-28 text-sm" type="number" placeholder="Amount" value={chargeForm.amount}
                      onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setChargeUser(null)} className="btn-secondary text-xs flex-1 py-1.5">Cancel</button>
                    <button onClick={() => handleCharge(u._id)} disabled={!chargeForm.reason.trim() || !chargeForm.amount || sendingCharge}
                      className="btn-primary text-xs flex-1 py-1.5">{sendingCharge ? 'Sending...' : 'Send Payment Request'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!loading && filtered.length === 0 && <p className="text-center py-8 text-surface-400 text-sm">No users found</p>}
        </div>
      </div>
    </div>
  );
}