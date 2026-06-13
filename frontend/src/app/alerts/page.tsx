'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animation';
import { Bell, AlertTriangle, Shield, Eye, CheckCircle, Camera, Flame, Users, AlertCircle, Plus, Send, X } from 'lucide-react';
import { cn, timeAgo, formatDateTime, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const alertIcons: Record<string, any> = {
  suspicious_activity: AlertTriangle, unauthorized_access: Shield, emergency_sos: AlertCircle,
  fire_smoke: Flame, weapon_detected: AlertTriangle, intrusion: Shield, loitering: Users, crowd_density: Users,
};

const alertTypes = [
  { value: 'general', label: 'General', roles: ['admin', 'security', 'resident'] },
  { value: 'suspicious_activity', label: 'Suspicious Activity', roles: ['admin', 'security'] },
  { value: 'unauthorized_access', label: 'Unauthorized Access', roles: ['admin', 'security'] },
  { value: 'intrusion', label: 'Intrusion', roles: ['admin', 'security'] },
  { value: 'fire_smoke', label: 'Fire / Smoke', roles: ['admin', 'security'] },
  { value: 'loitering', label: 'Loitering', roles: ['admin', 'security'] },
  { value: 'crowd_density', label: 'Crowd Density', roles: ['admin', 'security'] },
];

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'general', severity: 'medium', target: 'all' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    try {
      const params: any = { limit: '50' };
      if (filter) params.status = filter;
      const res = await api.get<any>('/alerts', params);
      setAlerts(res.data.alerts || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  const { notifications } = useSocket();
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (latest.type === 'alert' || latest.type === 'sos' || latest._id) {
        setAlerts((prev) => {
          if (prev.some((a) => a._id === latest._id)) return prev;
          return [latest, ...prev].slice(0, 100);
        });
      }
    }
  }, [notifications]);

  const handleAcknowledge = async (id: string) => {
    try { await api.put(`/alerts/${id}/acknowledge`); toast.success('Alert acknowledged'); fetchAlerts(); } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message are required');
    setSubmitting(true);
    try {
      await api.post('/alerts', form);
      toast.success('Alert sent');
      setShowCreate(false);
      setForm({ title: '', message: '', type: 'general', severity: 'medium', target: 'all' });
      fetchAlerts();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send alert');
    } finally { setSubmitting(false); }
  };

  const availableTypes = alertTypes.filter((t) => t.roles.includes(user?.role || ''));

  const filters = ['', 'new', 'acknowledged', 'resolved'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Alerts & Notifications</h2>
            <p className="text-surface-400 text-sm">Security alerts and emergency notifications</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm flex items-center gap-1.5">
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreate ? 'Cancel' : 'New Alert'}
          </button>
        </motion.div>

        {showCreate && (
          <form onSubmit={handleCreate} className="glass-card p-5 space-y-4 border border-primary-200 dark:border-primary-800">
            <h3 className="font-semibold flex items-center gap-2"><Send className="w-4 h-4" /> Create Alert</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-surface-400 mb-1 block">Alert Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm">
                  {availableTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-400 mb-1 block">Severity</label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-400 mb-1 block">Target Audience</label>
                <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm">
                  <option value="all">All</option>
                  <option value="residents">Residents Only</option>
                  <option value="security">Security Only</option>
                  <option value="admin">Admin Only</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Alert title..." className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1 block">Message</label>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2} placeholder="Alert message..." className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm resize-none" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="btn-primary text-sm flex items-center gap-1.5">
                {submitting ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Sending...' : 'Send Alert'}
              </button>
            </div>
          </form>
        )}

        <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors', filter === f ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200')}>
              {f || 'All'}
            </button>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : alerts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-surface-300 mb-3" />
            <p className="text-surface-400">No alerts</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
            {alerts.map((a) => {
              const Icon = alertIcons[a.type] || Bell;
              const sender = a.sender || a.createdBy;
              return (
                <motion.div key={a._id} variants={staggerItem} className={cn('glass-card p-5 border-l-4', a.severity === 'critical' ? 'border-l-danger-500' : a.severity === 'high' ? 'border-l-warning-500' : 'border-l-primary-500')}>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', a.severity === 'critical' ? 'bg-danger-50 dark:bg-danger-500/10 text-danger-500' : 'bg-warning-50 dark:bg-warning-500/10 text-warning-500')}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{a.title}</h3>
                          <span className={cn('badge text-xs', a.severity === 'critical' ? 'badge-danger' : a.severity === 'high' ? 'badge-warning' : 'badge-info')}>{a.severity}</span>
                          <span className={cn('badge text-xs', getStatusColor(a.status))}>{a.status}</span>
                        </div>
                        <p className="text-sm text-surface-400 mb-1 truncate max-w-md">{a.message}</p>
                        <p className="text-xs text-surface-400">
                          {a.type?.replace(/_/g, ' ')} &middot; {timeAgo(a.createdAt)}
                          {sender?.name && <span> &middot; by <strong>{sender.name}</strong> <span className="capitalize">({sender.role || sender.roleLabel})</span></span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {a.status === 'new' && <button onClick={() => handleAcknowledge(a._id)} className="btn-ghost text-xs"><Eye className="w-3.5 h-3.5" /> Acknowledge</button>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}