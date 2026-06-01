'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Search, Mail, Phone, Home, Users, Filter } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface UserItem {
  _id: string; name: string; email: string; phone: string; role: string; flatNumber?: string; tower?: string;
}

export default function DirectoryPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { onlineUsers } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    api.get('/users?limit=200').then(({ data }: any) => setUsers(data.users || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const isOnline = (userId: string) => onlineUsers.some((u: any) => u.userId === userId);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase()) && !(u.flatNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">User Directory</h2>
          <p className="text-surface-400 text-sm">Browse all registered users and their contact information</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 py-2.5 text-sm" placeholder="Search by name, email, or flat..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Filter className="w-5 h-5 text-surface-400 self-center" />
            <select className="input-field w-36 text-sm py-2.5" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="resident">Residents</option>
              <option value="security">Security</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-12 text-center text-surface-400">No users found</div>
          ) : (
            filtered.map((u) => (
              <div key={u._id} className="glass-card p-4 flex items-center gap-4 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white dark:border-surface-900 rounded-full', isOnline(u._id) ? 'bg-secondary-500' : 'bg-surface-300')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{u.name}</p>
                    <span className={cn('badge text-[10px]', u.role === 'admin' ? 'badge-info' : u.role === 'security' ? 'badge-warning' : 'badge-success')}>{u.role}</span>
                    <span className={cn('text-xs flex items-center gap-1', isOnline(u._id) ? 'text-secondary-500' : 'text-surface-400')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', isOnline(u._id) ? 'bg-secondary-500' : 'bg-surface-300')} />
                      {isOnline(u._id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-surface-500 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {u.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {u.phone}</span>
                    {u.flatNumber && <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> Flat {u.flatNumber}, Tower {u.tower}</span>}
                  </div>
                </div>
                {user?.role === 'admin' && u._id !== user._id && (
                  <div className="shrink-0">
                    <button onClick={() => {}} className="btn-secondary text-xs py-1.5 px-3">Charge</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
