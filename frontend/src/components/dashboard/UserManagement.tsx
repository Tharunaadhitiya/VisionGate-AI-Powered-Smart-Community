'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, CheckCircle, XCircle, UserPlus, RefreshCw, Shield } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UserItem {
  _id: string; name: string; email: string; phone: string; role: string;
  flatNumber?: string; tower?: string; isActive: boolean; deletedAt?: string;
  reactivationRequested?: boolean; reactivationReason?: string; createdAt?: string;
}

const ROLE_FILTERS = [
  { label: 'All Users', value: 'all' },
  { label: 'Residents', value: 'resident' },
  { label: 'Security', value: 'security' },
  { label: 'Admins', value: 'admin' },
];

export default function UserManagement({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'resident', flatNumber: '', tower: '' });
  const [reactivationRequests, setReactivationRequests] = useState<UserItem[]>([]);
  const [userToPromote, setUserToPromote] = useState<UserItem | null>(null);

  useEffect(() => { fetchUsers(); fetchReactivationRequests(); }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users?limit=100');
      setUsers(data.users || []);
    } catch {} finally { setLoading(false); }
  };

  const fetchReactivationRequests = async () => {
    try {
      const { data } = await api.get('/users/reactivation-requests');
      setReactivationRequests(data.users || []);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await api.delete('/users/' + id);
      toast.success('User deactivated');
      fetchUsers();
    } catch { toast.error('Failed to deactivate'); }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.put('/users/' + id + '/reactivate');
      toast.success('User reactivated');
      fetchUsers(); fetchReactivationRequests();
    } catch { toast.error('Failed to reactivate'); }
  };

  const handleRejectReactivation = async (id: string) => {
    try {
      await api.put('/users/' + id + '/reject-reactivation');
      toast.success('Reactivation rejected');
      fetchReactivationRequests();
    } catch { toast.error('Failed'); }
  };

  const handleCreate = async () => {
    try {
      await api.post('/users', form);
      toast.success('User created');
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', password: '', role: 'resident', flatNumber: '', tower: '' });
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePromote = async () => {
    if (!userToPromote) return;
    try {
      const res = await api.put('/users/' + userToPromote._id + '/promote-admin');
      toast.success(res.message || 'User promoted to admin');
      setUserToPromote(null);
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filtered = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.includes(search.toLowerCase()) ||
      (u.flatNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role?.toLowerCase().trim() === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-5xl w-full max-h-[90vh] flex flex-col animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">User Management</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-5 h-5" /></button>
        </div>

        {reactivationRequests.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20">
            <p className="text-sm font-medium text-warning-700 dark:text-warning-400 mb-2">Reactivation Requests ({reactivationRequests.length})</p>
            {reactivationRequests.map((u) => (
              <div key={u._id} className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-surface-800/50 mb-1">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-surface-400">{u.email} - {u.reactivationReason}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleReactivate(u._id)} className="p-1.5 rounded-lg bg-secondary-50 text-secondary-600 hover:bg-secondary-100"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => handleRejectReactivation(u._id)} className="p-1.5 rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100"><XCircle className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 py-2 text-sm" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={() => { setShowForm(true); setEditUser(null); }} className="btn-primary text-sm"><UserPlus className="w-4 h-4" /> Add User</button>
        </div>

        <div className="flex gap-1 mb-4">
          {ROLE_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setRoleFilter(f.value)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                roleFilter === f.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700'
              )}>
              {f.label}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="mb-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
            <h4 className="text-sm font-semibold mb-3">{editUser ? 'Edit User' : 'Add New User'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input-field text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="input-field text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {!editUser && <input className="input-field text-sm" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
              <select className="input-field text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="resident">Resident</option>
                <option value="security">Security</option>
                <option value="admin">Admin</option>
              </select>
              <input className="input-field text-sm" placeholder="Flat Number" value={form.flatNumber} onChange={(e) => setForm({ ...form, flatNumber: e.target.value })} />
              <input className="input-field text-sm" placeholder="Tower" value={form.tower} onChange={(e) => setForm({ ...form, tower: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm flex-1">Cancel</button>
              <button onClick={handleCreate} className="btn-primary text-sm flex-1">{editUser ? 'Update' : 'Create'}</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-400 text-xs border-b border-surface-100 dark:border-surface-800">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Flat</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Created</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id} className="border-b border-surface-50 dark:border-surface-800/50 hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                  <td className="py-2.5 font-medium">{u.name}</td>
                  <td className="py-2.5 text-surface-400">{u.email}</td>
                  <td className="py-2.5 capitalize">{u.role?.toLowerCase() || ''}</td>
                  <td className="py-2.5">{u.flatNumber || '-'}</td>
                  <td className="py-2.5">
                    <span className={cn('badge text-[10px]', u.isActive ? 'badge-success' : 'badge-danger')}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2.5 text-surface-400 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><Edit2 className="w-3.5 h-3.5" /></button>
                      {u.role?.toLowerCase().trim() === 'resident' && (
                        <button onClick={() => setUserToPromote(u)} className="p-1.5 rounded-lg hover:bg-warning-50 hover:text-warning-600" title="Promote to Admin">
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(u._id)} className="p-1.5 rounded-lg hover:bg-danger-50 hover:text-danger-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {userToPromote && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setUserToPromote(null)}>
            <div className="glass-card p-6 max-w-md w-full animate-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Promote User to Administrator?</h3>
                  <p className="text-sm text-surface-400">This will grant admin privileges to this user.</p>
                </div>
              </div>
              <div className="space-y-3 mb-6 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">User:</span>
                  <span className="text-sm font-medium">{userToPromote.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">Current Role:</span>
                  <span className="text-sm capitalize px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300">{userToPromote.role?.toLowerCase() || ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-surface-400">New Role:</span>
                  <span className="text-sm capitalize px-2.5 py-0.5 rounded-full bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-300 font-medium">Admin</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setUserToPromote(null)} className="btn-secondary text-sm flex-1">Cancel</button>
                <button onClick={handlePromote} className="btn-primary text-sm flex-1 bg-warning-500 hover:bg-warning-600">Confirm Promotion</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
