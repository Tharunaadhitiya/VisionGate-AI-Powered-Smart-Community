'use client';
import { useState, useEffect } from 'react';
import { Search, X, Phone, Mail, Home, DollarSign, Key, Building2 } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const CHARGE_TYPES: { value: string; label: string }[] = [
  { value: 'maintenance_fee', label: 'Maintenance Fee' },
  { value: 'house_rent', label: 'House Rent' },
  { value: 'fine', label: 'Fine' },
  { value: 'security_deposit', label: 'Security Deposit' },
  { value: 'parking_fee', label: 'Parking Fee' },
  { value: 'water_charge', label: 'Water Charge' },
  { value: 'electricity_charge', label: 'Electricity Charge' },
  { value: 'other', label: 'Other' },
];

interface UserItem {
  _id: string; name: string; email: string; phone: string; role: string;
  flatNumber?: string; tower?: string;
}

function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export default function UserDirectory({ onClose, variant = 'modal' }: { onClose: () => void; variant?: 'modal' | 'page' }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { onlineUsers } = useSocket();
  const { user: currentUser } = useAuth();
  const [chargeUser, setChargeUser] = useState<string | null>(null);
  const [chargeForm, setChargeForm] = useState({ title: '', description: '', amount: '', type: 'maintenance_fee', dueDate: getDefaultDueDate() });
  const [sendingCharge, setSendingCharge] = useState(false);
  const [resetUser, setResetUser] = useState<string | null>(null);
  const [resetForm, setResetForm] = useState({ email: '', password: '' });
  const [resetting, setResetting] = useState(false);
  const [rentUser, setRentUser] = useState<string | null>(null);
  const [rentForm, setRentForm] = useState({ amount: '', dueDay: '5', lateFee: '0', startDate: new Date().toISOString().split('T')[0] });
  const [sendingRent, setSendingRent] = useState(false);

  useEffect(() => {
    api.get('/users?limit=200').then(({ data }: any) => setUsers(data.users || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const isOnline = (userId: string) => onlineUsers.some((u: any) => u.userId === userId);

  const isAdmin = currentUser?.role === 'admin';

  const handleCharge = async (userId: string) => {
    console.log('handleCharge called with userId:', userId);
    if (!chargeForm.title.trim()) { console.log('VALIDATION FAILED: title empty'); return toast.error('Charge title is required'); }
    if (!chargeForm.amount || parseFloat(chargeForm.amount) <= 0) { console.log('VALIDATION FAILED: amount invalid', chargeForm.amount); return toast.error('Amount is required'); }
    if (!chargeForm.dueDate) { console.log('VALIDATION FAILED: dueDate empty'); return toast.error('Invalid due date'); }
    setSendingCharge(true);
    try {
      const chargeData = {
        recipientId: userId,
        title: chargeForm.title.trim(),
        description: chargeForm.description.trim(),
        amount: parseFloat(chargeForm.amount),
        type: chargeForm.type,
        dueDate: new Date(chargeForm.dueDate).toISOString(),
      };
      console.log('Creating Charge payload:', JSON.stringify(chargeData));
      const response = await api.post('/payments', chargeData);
      console.log('Charge API response:', JSON.stringify(response));
      toast.success('Payment charge created successfully');
      setChargeUser(null);
      setChargeForm({ title: '', description: '', amount: '', type: 'maintenance_fee', dueDate: getDefaultDueDate() });
    } catch (err: any) {
      console.log('Charge API error:', err.message, err);
      toast.error(err.message || 'Database insert failed');
    }
    setSendingCharge(false);
  };

  const handleReset = async (userId: string) => {
    if (!resetForm.email.trim() || !resetForm.password.trim()) return toast.error('Enter email and new password');
    if (resetForm.password.length < 6) return toast.error('Password must be at least 6 characters');
    setResetting(true);
    try {
      await api.put(`/users/${userId}/reset-credentials`, resetForm);
      toast.success('Credentials reset successfully');
      setResetUser(null);
      setResetForm({ email: '', password: '' });
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    setResetting(false);
  };

  const handleSetRent = async (userId: string) => {
    if (!rentForm.amount || parseFloat(rentForm.amount) <= 0) return toast.error('Monthly rent amount is required');
    if (!rentForm.startDate) return toast.error('Start date is required');
    setSendingRent(true);
    try {
      console.log('Creating rent config:', { userId, monthlyRent: parseFloat(rentForm.amount), dueDay: parseInt(rentForm.dueDay), lateFee: parseFloat(rentForm.lateFee) || 0, startDate: new Date(rentForm.startDate).toISOString() });
      await api.post('/rent/configuration', {
        userId,
        monthlyRent: parseFloat(rentForm.amount),
        dueDay: parseInt(rentForm.dueDay),
        lateFee: parseFloat(rentForm.lateFee) || 0,
        startDate: new Date(rentForm.startDate).toISOString(),
      });
      toast.success('Rent configuration created successfully');
      setRentUser(null);
      setRentForm({ amount: '', dueDay: '5', lateFee: '0', startDate: new Date().toISOString().split('T')[0] });
    } catch (err: any) { console.error('Rent config error:', err); toast.error(err.message || 'Failed to set rent'); }
    setSendingRent(false);
  };

  const resetChargeForm = () => {
    setChargeForm({ title: '', description: '', amount: '', type: 'maintenance_fee', dueDate: getDefaultDueDate() });
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase()) && !(u.flatNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">User Directory</h3>
        {variant === 'modal' && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-5 h-5" /></button>
        )}
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
                  <>
                    <button onClick={() => {
                      console.log('Charge button clicked for user:', { _id: u._id, name: u.name, email: u.email, role: u.role });
                      setChargeUser(chargeUser === u._id ? null : u._id);
                      resetChargeForm();
                      setResetUser(null);
                      setRentUser(null);
                      toast('Charge form opened for ' + u.name, { icon: '💰', duration: 2000 });
                    }}
                      className="ml-2 p-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 hover:bg-primary-100" title="Charge User">
                      <DollarSign className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { console.log('Reset credentials clicked for user:', { _id: u._id, name: u.name }); setResetUser(resetUser === u._id ? null : u._id); setResetForm({ email: u.email, password: '' }); setChargeUser(null); setRentUser(null); }}
                      className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 hover:bg-purple-100" title="Reset Credentials">
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    {u.role === 'resident' && (
                      <button onClick={() => { console.log('Set rent clicked for user:', { _id: u._id, name: u.name }); setRentUser(rentUser === u._id ? null : u._id); setRentForm({ amount: '', dueDay: '5', lateFee: '0', startDate: new Date().toISOString().split('T')[0] }); setChargeUser(null); setResetUser(null); }}
                        className="p-1.5 rounded-lg bg-secondary-50 dark:bg-secondary-500/10 text-secondary-600 hover:bg-secondary-100" title="Set House Rent">
                        <Building2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            {chargeUser === u._id && (
              <div className="mx-3 mb-2 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-primary-200 dark:border-primary-500/20">
                <p className="text-sm font-semibold mb-3">Create Charge for {u.name}</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-surface-400 block mb-1">Charge Title *</label>
                      <input className="input-field text-sm w-full" placeholder="e.g. Monthly Maintenance" value={chargeForm.title}
                        onChange={(e) => setChargeForm({ ...chargeForm, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-surface-400 block mb-1">Amount *</label>
                      <input className="input-field text-sm w-full" type="number" min="1" step="0.01" placeholder="e.g. 1500" value={chargeForm.amount}
                        onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-400 block mb-1">Description</label>
                    <input className="input-field text-sm w-full" placeholder="e.g. June Maintenance Charges" value={chargeForm.description}
                      onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-surface-400 block mb-1">Charge Type *</label>
                      <select className="input-field text-sm w-full" value={chargeForm.type}
                        onChange={(e) => setChargeForm({ ...chargeForm, type: e.target.value })}>
                        {CHARGE_TYPES.map((ct) => (
                          <option key={ct.value} value={ct.value}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-surface-400 block mb-1">Due Date *</label>
                      <input className="input-field text-sm w-full" type="date" value={chargeForm.dueDate}
                        onChange={(e) => setChargeForm({ ...chargeForm, dueDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setChargeUser(null)} className="btn-secondary text-xs flex-1 py-2">Cancel</button>
                    <button onClick={() => handleCharge(u._id)} disabled={!chargeForm.title.trim() || !chargeForm.amount || sendingCharge}
                      className="btn-primary text-xs flex-1 py-2">{sendingCharge ? 'Creating...' : 'Create Charge'}</button>
                  </div>
                </div>
              </div>
            )}
            {resetUser === u._id && (
              <div className="mx-3 mb-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-purple-200 dark:border-purple-500/20">
                <p className="text-xs font-semibold mb-2">Reset Credentials for {u.name}</p>
                <div className="space-y-2 mb-2">
                  <input className="input-field text-sm w-full" placeholder="New email" value={resetForm.email}
                    onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })} />
                  <input className="input-field text-sm w-full" type="password" placeholder="New password (min 6 chars)" value={resetForm.password}
                    onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setResetUser(null)} className="btn-secondary text-xs flex-1 py-1.5">Cancel</button>
                  <button onClick={() => handleReset(u._id)} disabled={!resetForm.email.trim() || !resetForm.password.trim() || resetting}
                    className="btn-primary text-xs flex-1 py-1.5 bg-purple-600 hover:bg-purple-700">{resetting ? 'Resetting...' : 'Reset Credentials'}</button>
                </div>
              </div>
            )}
            {rentUser === u._id && (
              <div className="mx-3 mb-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-secondary-200 dark:border-secondary-500/20">
                <p className="text-xs font-semibold mb-2">Set House Rent for {u.name}</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] font-medium text-surface-400 block mb-0.5">Monthly Rent (₹) *</label>
                    <input className="input-field text-sm w-full" type="number" placeholder="12000" value={rentForm.amount}
                      onChange={(e) => setRentForm({ ...rentForm, amount: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-surface-400 block mb-0.5">Due Day of Month</label>
                    <input className="input-field text-sm w-full" type="number" min="1" max="28" placeholder="5" value={rentForm.dueDay}
                      onChange={(e) => setRentForm({ ...rentForm, dueDay: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-surface-400 block mb-0.5">Late Fee (₹)</label>
                    <input className="input-field text-sm w-full" type="number" placeholder="500" value={rentForm.lateFee}
                      onChange={(e) => setRentForm({ ...rentForm, lateFee: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-surface-400 block mb-0.5">Start Date *</label>
                    <input className="input-field text-sm w-full" type="date" value={rentForm.startDate}
                      onChange={(e) => setRentForm({ ...rentForm, startDate: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setRentUser(null)} className="btn-secondary text-xs flex-1 py-1.5">Cancel</button>
                  <button onClick={() => handleSetRent(u._id)} disabled={!rentForm.amount || !rentForm.startDate || sendingRent}
                    className="btn-primary text-xs flex-1 py-1.5 bg-secondary-600 hover:bg-secondary-700">{sendingRent ? 'Saving...' : 'Set House Rent'}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && <p className="text-center py-8 text-surface-400 text-sm">No users found</p>}
      </div>
    </>
  );

  if (variant === 'page') {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-2xl w-full max-h-[80vh] flex flex-col animate-in" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}