'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Search, Plus, Upload, CheckCircle, X, AlertTriangle, MapPin, Calendar, User, Image, Percent, Loader2, Eye, Archive } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

type TabType = 'lost' | 'found';

export default function LostFoundPage() {
  const { user } = useAuth();
  const role = user?.role || 'resident';
  const [tab, setTab] = useState<TabType>('lost');
  const [lostItems, setLostItems] = useState<any[]>([]);
  const [foundItems, setFoundItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TabType>('lost');
  const [form, setForm] = useState({ itemName: '', description: '', location: '', foundLocation: '', dateLost: '', color: '', brand: '', imageUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [matches, setMatches] = useState<any>(null);
  const [showMatches, setShowMatches] = useState(false);

  const fetchItems = async () => {
    try {
      const [lostRes, foundRes] = await Promise.all([
        api.get('/lost-found/lost', { limit: '50' }),
        api.get('/lost-found/found', { limit: '50' }),
      ]);
      setLostItems(lostRes.data?.items || []);
      setFoundItems(foundRes.data?.items || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const fetchMatches = async () => {
    try {
      const res = await api.get('/lost-found/matches');
      setMatches(res.data || null);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!form.itemName.trim()) return toast.error('Item name is required');
    setSubmitting(true);
    try {
      const endpoint = formType === 'lost' ? '/lost-found/lost' : '/lost-found/found';
      const body = formType === 'lost'
        ? { itemName: form.itemName, description: form.description, location: form.location, dateLost: form.dateLost ? new Date(form.dateLost).toISOString() : undefined, color: form.color, brand: form.brand, imageUrl: form.imageUrl }
        : { itemName: form.itemName, description: form.description, foundLocation: form.foundLocation, color: form.color, brand: form.brand, imageUrl: form.imageUrl };
      await api.post(endpoint, body);
      toast.success(formType === 'lost' ? 'Lost item reported' : 'Found item reported');
      setShowForm(false);
      setForm({ itemName: '', description: '', location: '', foundLocation: '', dateLost: '', color: '', brand: '', imageUrl: '' });
      fetchItems();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to submit'); }
    setSubmitting(false);
  };

  const handleCloseCase = async (id: string, type: TabType) => {
    try {
      if (type === 'lost') await api.put(`/lost-found/lost/${id}/close`);
      else await api.put(`/lost-found/found/${id}/return`);
      toast.success('Case updated');
      fetchItems();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const openForm = (type: TabType) => {
    setFormType(type);
    setForm({ itemName: '', description: '', location: '', foundLocation: '', dateLost: '', color: '', brand: '', imageUrl: '' });
    setShowForm(true);
  };

  const filteredLost = lostItems.filter(i => !search || i.itemName.toLowerCase().includes(search.toLowerCase()) || (i.description || '').toLowerCase().includes(search.toLowerCase()) || (i.location || '').toLowerCase().includes(search.toLowerCase()));
  const filteredFound = foundItems.filter(i => !search || i.itemName.toLowerCase().includes(search.toLowerCase()) || (i.description || '').toLowerCase().includes(search.toLowerCase()) || (i.foundLocation || '').toLowerCase().includes(search.toLowerCase()));

  const renderItemCard = (item: any, type: TabType) => (
    <div key={item._id} className="glass-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex gap-3 flex-1 min-w-0">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0', type === 'lost' ? 'bg-danger-500' : 'bg-secondary-500')}>
            {item.itemName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">{item.itemName}</p>
              <span className={cn('badge text-[10px]', item.status === 'open' ? 'bg-warning-100 text-warning-600 dark:bg-warning-500/20' : item.status === 'matched' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20' : 'bg-surface-100 text-surface-600 dark:bg-surface-800')}>{item.status}</span>
              {item.matchScore && <span className="badge badge-info text-[10px]"><Percent className="w-2.5 h-2.5 inline mr-0.5" />{item.matchScore}% Match</span>}
            </div>
            {item.description && <p className="text-xs text-surface-400 mb-1">{item.description}</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-surface-400">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location || item.foundLocation || 'N/A'}</span>
              {item.color && <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: item.color.toLowerCase() }} />{item.color}</span>}
              {item.brand && <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.brand}</span>}
              {item.dateLost && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.dateLost).toLocaleDateString()}</span>}
            </div>
            <p className="text-[10px] text-surface-400 mt-1">Reported {timeAgo(item.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {role === 'admin' && item.status === 'open' && (
            <button onClick={() => handleCloseCase(item._id, type)} className="p-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200" title={type === 'lost' ? 'Close Case' : 'Mark Returned'}>
              {type === 'lost' ? <Archive className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5 text-success-500" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Lost & Found</h2>
            <p className="text-surface-400 text-sm">Report and find lost items in the community</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowMatches(!showMatches); if (!matches) fetchMatches(); }} className="btn-secondary text-sm flex items-center gap-2">
              <Percent className="w-4 h-4" /> Matches
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700 pb-2">
          <button onClick={() => setTab('lost')} className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', tab === 'lost' ? 'bg-danger-50 dark:bg-danger-500/10 text-danger-600' : 'text-surface-400 hover:text-surface-600')}>
            Lost Items ({lostItems.length})
          </button>
          <button onClick={() => setTab('found')} className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', tab === 'found' ? 'bg-secondary-50 dark:bg-secondary-500/10 text-secondary-600' : 'text-surface-400 hover:text-surface-600')}>
            Found Items ({foundItems.length})
          </button>
          <div className="flex-1" />
          <button onClick={() => openForm(tab)} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Report {tab === 'lost' ? 'Lost' : 'Found'}</button>
        </div>

        {showForm && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Report {formType === 'lost' ? 'Lost' : 'Found'} Item</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-surface-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-surface-400 block mb-1">Item Name *</label>
                <input className="input-field text-sm w-full" placeholder="e.g. Wallet, Phone, Keys" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-surface-400 block mb-1">Description</label>
                <textarea className="input-field text-sm w-full" rows={2} placeholder="Describe the item..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-surface-400 block mb-1">Location {formType === 'lost' ? 'Lost' : 'Found'}</label>
                <input className="input-field text-sm w-full" placeholder={formType === 'lost' ? 'e.g. Parking Area' : 'e.g. Block B Entrance'} value={formType === 'lost' ? form.location : form.foundLocation}
                  onChange={e => formType === 'lost' ? setForm({ ...form, location: e.target.value }) : setForm({ ...form, foundLocation: e.target.value })} />
              </div>
              {formType === 'lost' && (
                <div>
                  <label className="text-xs font-medium text-surface-400 block mb-1">Date Lost</label>
                  <input className="input-field text-sm w-full" type="date" value={form.dateLost} onChange={e => setForm({ ...form, dateLost: e.target.value })} />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-surface-400 block mb-1">Color</label>
                <input className="input-field text-sm w-full" placeholder="e.g. Black" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-surface-400 block mb-1">Brand</label>
                <input className="input-field text-sm w-full" placeholder="e.g. Samsung" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-surface-400 block mb-1">Image URL</label>
                <input className="input-field text-sm w-full" placeholder="Paste image URL (optional)" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !form.itemName.trim()} className="btn-primary text-sm">{submitting ? 'Submitting...' : 'Submit Report'}</button>
            </div>
          </div>
        )}

        {showMatches && matches && (
          <div className="glass-card p-6">
            <h3 className="section-title mb-4">AI Match Results</h3>
            <div className="space-y-3">
              {matches.lostItems?.length === 0 && matches.foundItems?.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-4">No matches found yet</p>
              ) : (
                <>
                  {matches.lostItems?.map((item: any) => (
                    <div key={item._id} className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-danger-500" />
                        <div>
                          <p className="text-sm font-medium">{item.itemName}</p>
                          <p className="text-xs text-surface-400">Lost by {item.reportedBy?.name} | Matched with Found Item</p>
                        </div>
                      </div>
                      <span className="badge badge-info"><Percent className="w-3 h-3 inline mr-1" />{item.matchScore}%</span>
                    </div>
                  ))}
                  {matches.foundItems?.map((item: any) => (
                    <div key={item._id} className="p-3 rounded-xl bg-secondary-50 dark:bg-secondary-500/5 border border-secondary-200 dark:border-secondary-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-secondary-500" />
                        <div>
                          <p className="text-sm font-medium">{item.itemName}</p>
                          <p className="text-xs text-surface-400">Found by {item.reportedBy?.name} | Matched with Lost Item</p>
                        </div>
                      </div>
                      <span className="badge badge-info"><Percent className="w-3 h-3 inline mr-1" />{item.matchScore}%</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-surface-400" />
          <input className="input-field pl-9 text-sm w-full" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : tab === 'lost' ? (
            filteredLost.length === 0 ? (
              <div className="text-center py-12 text-surface-400"><AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No lost items reported</p></div>
            ) : filteredLost.map(i => renderItemCard(i, 'lost'))
          ) : (
            filteredFound.length === 0 ? (
              <div className="text-center py-12 text-surface-400"><Search className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No found items reported</p></div>
            ) : filteredFound.map(i => renderItemCard(i, 'found'))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
