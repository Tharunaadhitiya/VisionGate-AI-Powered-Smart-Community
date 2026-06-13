'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Package, Search, Plus, Clock, CheckCircle, Building2, Truck, User, Home, Phone, Hash, FileText, Loader2 } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animation';

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-warning-100 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400',
  ready: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  collected: 'bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400',
};

const PACKAGE_TYPES = ['Electronics', 'Clothing', 'Food', 'Documents', 'Medicine', 'Furniture', 'Other'];
const COURIER_LIST = ['Amazon', 'Flipkart', 'Blue Dart', 'Delhivery', 'DTDC', 'India Post', 'Swiggy', 'Zomato', 'Other'];

export default function PackagesPage() {
  const { user } = useAuth();
  const role = user?.role || 'resident';
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ courier: 'Amazon', packageType: 'Other', residentName: '', tower: 'A', flatNumber: '', trackingNumber: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchPackages = async () => {
    try {
      const params: any = { limit: '50' };
      if (filter) params.status = filter;
      const res = await api.get('/packages', params);
      setPackages(res.data?.packages || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPackages(); if (role === 'admin') api.get('/packages/stats').then(r => setStats(r.data || null)).catch(() => {}); }, [filter, role]);

  const handleSubmit = async () => {
    if (!form.courier.trim() || !form.packageType.trim() || !form.residentName.trim() || !form.flatNumber.trim()) {
      return toast.error('Please fill all required fields');
    }
    setSubmitting(true);
    try {
      await api.post('/packages', form);
      toast.success('Package recorded successfully');
      setShowForm(false);
      setForm({ courier: 'Amazon', packageType: 'Other', residentName: '', tower: 'A', flatNumber: '', trackingNumber: '', remarks: '' });
      fetchPackages();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to record package'); }
    setSubmitting(false);
  };

  const handleCollect = async (id: string) => {
    try {
      await api.put(`/packages/${id}/collect`);
      toast.success('Package marked as collected');
      setPackages(prev => prev.map(p => p._id === id ? { ...p, status: 'collected', collectedAt: new Date().toISOString() } : p));
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to update package'); }
  };

  const filtered = packages.filter(p => !search || p.residentName.toLowerCase().includes(search.toLowerCase()) || p.courier.toLowerCase().includes(search.toLowerCase()) || (p.trackingNumber || '').toLowerCase().includes(search.toLowerCase()) || p.flatNumber.includes(search));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <motion.div variants={fadeUp}>
            <h2 className="text-2xl font-bold">Package Management</h2>
            <p className="text-surface-400 text-sm">Track courier and parcel deliveries</p>
          </motion.div>
          {(role === 'security' || role === 'admin') && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Record Package
            </button>
          )}
        </div>

        {stats && role === 'admin' && (
          <motion.div variants={staggerContainer} className="card-grid">
            <motion.div variants={staggerItem} className="stat-card"><div className="flex items-center gap-3 mb-2"><Truck className="w-5 h-5 text-primary-500" /><p className="text-2xl font-bold">{stats.receivedToday}</p></div><p className="text-sm text-surface-400">Received Today</p></motion.div>
            <motion.div variants={staggerItem} className="stat-card"><div className="flex items-center gap-3 mb-2"><Clock className="w-5 h-5 text-warning-500" /><p className="text-2xl font-bold">{stats.pendingPickups}</p></div><p className="text-sm text-surface-400">Pending Pickups</p></motion.div>
            <motion.div variants={staggerItem} className="stat-card"><div className="flex items-center gap-3 mb-2"><CheckCircle className="w-5 h-5 text-success-500" /><p className="text-2xl font-bold">{stats.delivered}</p></div><p className="text-sm text-surface-400">Delivered</p></motion.div>
          </motion.div>
        )}

        {showForm && (role === 'security' || role === 'admin') && (
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">Record New Package</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-xs font-medium text-surface-400 block mb-1">Courier Company *</label>
                <select className="input-field text-sm w-full" value={form.courier} onChange={e => setForm({ ...form, courier: e.target.value })}>
                  {COURIER_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-surface-400 block mb-1">Package Type *</label>
                <select className="input-field text-sm w-full" value={form.packageType} onChange={e => setForm({ ...form, packageType: e.target.value })}>
                  {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-surface-400 block mb-1">Resident Name *</label>
                <input className="input-field text-sm w-full" placeholder="e.g. Ashwanth" value={form.residentName} onChange={e => setForm({ ...form, residentName: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-surface-400 block mb-1">Tower</label>
                <select className="input-field text-sm w-full" value={form.tower} onChange={e => setForm({ ...form, tower: e.target.value })}>
                  {['A','B','C','D','E','F','G','H'].map(t => <option key={t} value={t}>Tower {t}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-surface-400 block mb-1">Flat Number *</label>
                <input className="input-field text-sm w-full" placeholder="e.g. 201" value={form.flatNumber} onChange={e => setForm({ ...form, flatNumber: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-surface-400 block mb-1">Tracking Number</label>
                <input className="input-field text-sm w-full" placeholder="Optional" value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} /></div>
              <div className="md:col-span-2 lg:col-span-3"><label className="text-xs font-medium text-surface-400 block mb-1">Remarks</label>
                <input className="input-field text-sm w-full" placeholder="Optional notes..." value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm">{submitting ? 'Saving...' : 'Record Package'}</button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input className="input-field pl-9 text-sm w-full" placeholder="Search by name, courier, flat..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-field w-36 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="received">Received</option>
            <option value="ready">Ready for Pickup</option>
            <option value="collected">Collected</option>
          </select>
        </div>

        <motion.div variants={staggerContainer} className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-surface-400"><Package className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No packages found</p></div>
          ) : (
            filtered.map(p => (
              <motion.div key={p._id} variants={staggerItem} whileHover={{ y: -2, boxShadow: '0 8px 20px -6px rgba(0,0,0,0.1)' }} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {p.courier.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{p.courier}</p>
                        <span className={cn('badge text-[10px]', STATUS_COLORS[p.status] || '')}>{p.status}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-surface-400">
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {p.packageType}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {p.residentName}</span>
                        <span className="flex items-center gap-1"><Home className="w-3 h-3" /> {p.flatNumber}, T{p.tower}</span>
                        {p.trackingNumber && <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {p.trackingNumber}</span>}
                      </div>
                      {p.remarks && <p className="text-xs text-surface-400 mt-1"><FileText className="w-3 h-3 inline mr-1" />{p.remarks}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-surface-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Received {timeAgo(p.createdAt)}</span>
                        {p.collectedAt && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-success-500" />Collected {timeAgo(p.collectedAt)}</span>}
                      </div>
                    </div>
                  </div>
                  {role === 'security' && p.status !== 'collected' && (
                    <button onClick={() => handleCollect(p._id)} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 shrink-0 ml-3">
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Delivered
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
