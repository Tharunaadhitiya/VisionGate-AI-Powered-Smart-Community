'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { Search, Plus, X, AlertTriangle, CheckCircle, Percent, Loader2, MapPin, Calendar, User, Phone, Mail, Image, Hand, Shield, Archive, RefreshCw, Eye } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';

type TabType = 'lost' | 'found';

export default function LostFoundPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
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
  const [stats, setStats] = useState<any>({});
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const [lostRes, foundRes, statsRes] = await Promise.all([
        api.get('/lost-found/lost', { limit: '100' }),
        api.get('/lost-found/found', { limit: '100' }),
        api.get('/lost-found/stats'),
      ]);
      setLostItems(lostRes.data?.items || []);
      setFoundItems(foundRes.data?.items || []);
      setStats(statsRes.data || {});
    } catch (e) {
      console.error('Fetch lost/found error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (!socket) return;
    const onLostCreated = (data: any) => {
      setLostItems((prev) => [data.item, ...prev]);
      fetchItems();
    };
    const onFoundCreated = (data: any) => {
      setFoundItems((prev) => [data.item, ...prev]);
      fetchItems();
    };
    const onLostClaimed = (data: any) => {
      setLostItems((prev) => prev.map((i) => i._id === data.item._id ? data.item : i));
      toast.success(`${data.claimer?.name || 'Someone'} claimed to find an item!`);
      fetchItems();
    };
    const onLostRecovered = (data: any) => {
      setLostItems((prev) => prev.map((i) => i._id === data.item._id ? data.item : i));
      toast.success('Item marked as recovered!');
      fetchItems();
    };
    socket.on('lost:created', onLostCreated);
    socket.on('found:created', onFoundCreated);
    socket.on('lost:claimed', onLostClaimed);
    socket.on('lost:recovered', onLostRecovered);
    return () => {
      socket.off('lost:created', onLostCreated);
      socket.off('found:created', onFoundCreated);
      socket.off('lost:claimed', onLostClaimed);
      socket.off('lost:recovered', onLostRecovered);
    };
  }, [socket, fetchItems]);

  const handleSubmit = async () => {
    if (!form.itemName.trim()) return toast.error('Item name is required');
    setSubmitting(true);
    try {
      const endpoint = formType === 'lost' ? '/lost-found/lost' : '/lost-found/found';
      const body = formType === 'lost'
        ? { itemName: form.itemName, description: form.description, location: form.location, dateLost: form.dateLost || undefined, color: form.color, brand: form.brand, imageUrl: form.imageUrl }
        : { itemName: form.itemName, description: form.description, foundLocation: form.foundLocation, color: form.color, brand: form.brand, imageUrl: form.imageUrl };
      console.log('Lost Item Payload:', body);
      await api.post(endpoint, body);
      toast.success(formType === 'lost' ? 'Lost item reported' : 'Found item reported');
      setShowForm(false);
      setForm({ itemName: '', description: '', location: '', foundLocation: '', dateLost: '', color: '', brand: '', imageUrl: '' });
      fetchItems();
    } catch (err: any) { toast.error(err?.response?.data?.message || err?.data?.message || err.message || 'Failed to submit'); console.error('Submit error:', err); }
    setSubmitting(false);
  };

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      const res = await api.post(`/lost-found/lost/${id}/claim`);
      toast.success(res.message || 'Claim submitted!');
      fetchItems();
    } catch (err: any) { toast.error(err.message || 'Failed to claim item'); }
    setClaimingId(null);
  };

  const handleRecover = async (id: string) => {
    try {
      await api.put(`/lost-found/lost/${id}/recover`);
      toast.success('Item marked as recovered');
      fetchItems();
    } catch (err: any) { toast.error(err.message || 'Failed to recover item'); }
  };

  const handleCloseCase = async (id: string, type: TabType) => {
    try {
      if (type === 'lost') await api.put(`/lost-found/lost/${id}/close`);
      else await api.put(`/lost-found/found/${id}/return`);
      toast.success('Case updated');
      fetchItems();
    } catch (err: any) { toast.error(err.message || 'Failed to update'); }
  };

  const openForm = (type: TabType) => {
    setFormType(type);
    setForm({ itemName: '', description: '', location: '', foundLocation: '', dateLost: '', color: '', brand: '', imageUrl: '' });
    setShowForm(true);
  };

  const filteredLost = lostItems.filter(i => !search || i.itemName?.toLowerCase().includes(search.toLowerCase()) || (i.description || '').toLowerCase().includes(search.toLowerCase()) || (i.location || '').toLowerCase().includes(search.toLowerCase()));
  const filteredFound = foundItems.filter(i => !search || i.itemName?.toLowerCase().includes(search.toLowerCase()) || (i.description || '').toLowerCase().includes(search.toLowerCase()) || (i.foundLocation || '').toLowerCase().includes(search.toLowerCase()));

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      open: 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300',
      matched: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
      recovered: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300',
      closed: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
      returned: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300',
    };
    return map[status] || 'bg-surface-100 text-surface-600';
  };

  const renderReporter = (reporter: any) => {
    if (!reporter) return null;
    const initial = (reporter.name || '?').charAt(0).toUpperCase();
    return (
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-100 dark:border-surface-700/50">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {reporter.profileImage ? <img src={reporter.profileImage} className="w-full h-full rounded-full object-cover" alt="" /> : initial}
        </div>
        <div className="text-[11px] leading-tight">
          <p className="font-medium text-surface-800 dark:text-surface-200">{reporter.name}</p>
          <p className="text-surface-400">Tower {reporter.tower}-{reporter.flatNumber}</p>
        </div>
      </div>
    );
  };

  const renderImage = (url: string | undefined, name: string) => {
    if (!url) return null;
    return (
      <img src={url} alt={name} className="w-full h-32 object-cover rounded-lg mb-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    );
  };

  const renderLostCard = (item: any) => {
    const isOwner = item.reportedBy?._id === user?._id || item.reportedBy === user?._id;
    const canClaim = item.status === 'open' && !isOwner && !item.claimedBy;
    const isClaimed = item.claimedBy && item.status === 'matched';
    const isRecovered = item.status === 'recovered';
    const claimer = item.claimedBy;

    return (
      <div key={item._id} className="glass-card p-4">
        {renderImage(item.imageUrl, item.itemName)}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-sm">{item.itemName}</h3>
              <span className={cn('badge text-[10px]', statusBadge(item.status))}>
                {item.status === 'open' ? 'Lost' : item.status === 'matched' ? 'Matched' : item.status === 'recovered' ? 'Recovered' : item.status}
              </span>
              {item.matchScore && <span className="badge text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"><Percent className="w-2.5 h-2.5 inline mr-0.5" />{item.matchScore}% Match</span>}
            </div>
            {item.description && <p className="text-xs text-surface-400 mb-1.5">{item.description}</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-surface-400">
              {item.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>}
              {item.dateLost && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.dateLost).toLocaleDateString()}</span>}
              {item.color && <span><span className="inline-block w-2.5 h-2.5 rounded-full border align-middle mr-1" style={{ backgroundColor: item.color.toLowerCase() }} />{item.color}</span>}
              {item.brand && <span>{item.brand}</span>}
            </div>
            <p className="text-[10px] text-surface-400 mt-1">Reported {timeAgo(item.createdAt)}</p>
            {renderReporter(item.reportedBy)}
            {isClaimed && claimer && (
              <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
                <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1"><Hand className="w-3 h-3" />Claimed by {claimer.name || 'Someone'}</p>
                <p className="text-[10px] text-blue-500">Tower {claimer.tower}-{claimer.flatNumber}</p>
              </div>
            )}
            {isRecovered && (
              <div className="mt-2 p-2 rounded-lg bg-secondary-50 dark:bg-secondary-500/5 border border-secondary-200 dark:border-secondary-500/20">
                <p className="text-[11px] font-medium text-secondary-700 dark:text-secondary-300 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Recovered</p>
                {item.recoveredAt && <p className="text-[10px] text-secondary-500">{new Date(item.recoveredAt).toLocaleDateString()}</p>}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {canClaim && (
              <button onClick={() => handleClaim(item._id)} disabled={claimingId === item._id} className="btn-primary text-[11px] px-3 py-1.5 flex items-center gap-1">
                {claimingId === item._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hand className="w-3 h-3" />}
                I Found This
              </button>
            )}
            {(role === 'security' || role === 'admin') && isClaimed && (
              <button onClick={() => handleRecover(item._id)} className="btn-secondary text-[11px] px-3 py-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Confirm Recovery
              </button>
            )}
            {(role === 'security' || role === 'admin') && item.status !== 'closed' && item.status !== 'recovered' && (
              <button onClick={() => handleCloseCase(item._id, 'lost')} className="text-[11px] px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 flex items-center gap-1">
                <Archive className="w-3 h-3" /> Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFoundCard = (item: any) => {
    const finder = item.reportedBy;
    return (
      <div key={item._id} className="glass-card p-4">
        {renderImage(item.imageUrl, item.itemName)}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-sm">{item.itemName}</h3>
              <span className={cn('badge text-[10px]', statusBadge(item.status))}>{item.status === 'open' ? 'Available' : item.status === 'matched' ? 'Matched' : 'Returned'}</span>
              {item.matchScore && <span className="badge text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"><Percent className="w-2.5 h-2.5 inline mr-0.5" />{item.matchScore}% Match</span>}
            </div>
            {item.description && <p className="text-xs text-surface-400 mb-1.5">{item.description}</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-surface-400">
              {item.foundLocation && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.foundLocation}</span>}
              {item.color && <span><span className="inline-block w-2.5 h-2.5 rounded-full border align-middle mr-1" style={{ backgroundColor: item.color.toLowerCase() }} />{item.color}</span>}
              {item.brand && <span>{item.brand}</span>}
            </div>
            <p className="text-[10px] text-surface-400 mt-1">Reported {timeAgo(item.createdAt)}</p>
            {finder && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-100 dark:border-surface-700/50">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {finder.profileImage ? <img src={finder.profileImage} className="w-full h-full rounded-full object-cover" alt="" /> : (finder.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="text-[11px] leading-tight">
                  <p className="font-medium text-surface-800 dark:text-surface-200">Found by {finder.name}</p>
                  <p className="text-surface-400">Tower {finder.tower}-{finder.flatNumber}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {(role === 'security' || role === 'admin') && item.status === 'open' && (
              <button onClick={() => handleCloseCase(item._id, 'found')} className="btn-secondary text-[11px] px-3 py-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Mark Returned
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const statCards = [
    { label: 'Lost Items', value: stats.totalLost || 0, icon: AlertTriangle, color: 'text-danger-500', bg: 'bg-danger-50 dark:bg-danger-500/10' },
    { label: 'Found Items', value: stats.totalFound || 0, icon: Search, color: 'text-secondary-500', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
    { label: 'Matches', value: stats.matchedLost || 0, icon: Percent, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Recovered', value: stats.recoveredLost || 0, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Lost & Found</h2>
            <p className="text-surface-400 text-sm">Community-wide lost and found items board</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchItems} className="btn-secondary text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
          </div>
        </div>

        <div className="card-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                    <Icon className={cn('w-5 h-5', card.color)} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-surface-400">{card.label}</p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700 pb-2 flex-wrap">
          <button onClick={() => setTab('lost')} className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', tab === 'lost' ? 'bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-400' : 'text-surface-400 hover:text-surface-600')}>
            Lost Items ({lostItems.length})
          </button>
          <button onClick={() => setTab('found')} className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors', tab === 'found' ? 'bg-secondary-50 dark:bg-secondary-500/10 text-secondary-600 dark:text-secondary-400' : 'text-surface-400 hover:text-surface-600')}>
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

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-surface-400" />
          <input className="input-field pl-9 text-sm w-full" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className={cn('grid gap-4', tab === 'lost' ? (filteredLost.length > 0 ? 'lg:grid-cols-2 xl:grid-cols-3' : '') : (filteredFound.length > 0 ? 'lg:grid-cols-2 xl:grid-cols-3' : ''))}>
          {loading ? (
            <div className="col-span-full flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : tab === 'lost' ? (
            filteredLost.length === 0 ? (
              <div className="col-span-full text-center py-12 text-surface-400"><AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No lost items reported</p></div>
            ) : filteredLost.map(renderLostCard)
          ) : (
            filteredFound.length === 0 ? (
              <div className="col-span-full text-center py-12 text-surface-400"><Search className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No found items reported</p></div>
            ) : filteredFound.map(renderFoundCard)
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
