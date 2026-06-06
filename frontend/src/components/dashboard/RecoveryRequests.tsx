'use client';
import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, Loader2, Search } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface RecoveryRequest {
  _id: string; userName: string; email: string; phoneNumber: string; reason: string;
  status: string; adminNote?: string; handledBy?: string; handledByName?: string; createdAt: string;
}

export default function RecoveryRequests({ onClose }: { onClose: () => void }) {
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const fetch = async () => {
    const { default: api } = await import('@/lib/api');
    try {
      const res = await api.get('/recovery-requests');
      setRequests(res.data?.requests || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleAction = async (id: string, status: string) => {
    setActionId(id);
    try {
      const { default: api } = await import('@/lib/api');
      await api.put(`/recovery-requests/${id}`, { status, adminNote: adminNote.trim() || undefined });
      toast.success(`Request ${status.toLowerCase()}`);
      setAdminNote('');
      fetch();
    } catch (err: any) { toast.error(err.message || 'Failed to update request'); }
    setActionId(null);
  };

  const pending = requests.filter((r) => r.status === 'Pending');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Account Recovery Requests</h3>
            <p className="text-xs text-surface-400">{pending.length} pending</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
          ) : requests.length === 0 ? (
            <p className="text-center py-12 text-surface-400 text-sm">No recovery requests yet</p>
          ) : (
            requests.map((r) => (
              <div key={r._id} className={cn('p-4 rounded-xl border', r.status === 'Pending' ? 'bg-warning-50/50 dark:bg-warning-500/5 border-warning-200 dark:border-warning-500/20' : 'bg-surface-50 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700')}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{r.userName}</p>
                      <span className={cn('badge text-[10px]', r.status === 'Pending' ? 'badge-warning' : r.status === 'Resolved' || r.status === 'Approved' ? 'badge-success' : 'badge-danger')}>{r.status}</span>
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5">{r.email} &middot; {r.phoneNumber}</p>
                    <p className="text-xs text-surface-500 mt-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg p-2 italic">&ldquo;{r.reason}&rdquo;</p>
                    <div className="flex items-center gap-3 text-[11px] text-surface-400 mt-1.5">
                      <span>{formatDateTime(r.createdAt)}</span>
                      {r.handledByName && <span>Handled by: {r.handledByName}</span>}
                    </div>
                  </div>
                </div>
                {r.status === 'Pending' && (
                  <div className="mt-3 space-y-2">
                    <input className="input-field text-sm py-1.5" placeholder="Admin note (optional)" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(r._id, 'Resolved')} disabled={actionId === r._id}
                        className="btn-primary text-xs flex-1 py-1.5"><CheckCircle className="w-3.5 h-3.5" /> Resolve</button>
                      <button onClick={() => handleAction(r._id, 'Rejected')} disabled={actionId === r._id}
                        className="btn-danger text-xs flex-1 py-1.5"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                    </div>
                  </div>
                )}
                {r.status !== 'Pending' && r.adminNote && (
                  <p className="text-xs text-surface-500 mt-2 p-2 rounded-lg bg-surface-100 dark:bg-surface-800">Note: {r.adminNote}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
