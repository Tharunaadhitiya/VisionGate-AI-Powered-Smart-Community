'use client';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Camera, X, Save } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    flatNumber: '',
    tower: '',
    email: '',
  });

  useEffect(() => {
    if (user && open) {
      setForm({
        name: user.name,
        phone: user.phone,
        flatNumber: user.flatNumber || '',
        tower: user.tower || '',
        email: user.email,
      });
    }
  }, [user, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/users/${user?._id}`, {
        name: form.name,
        phone: form.phone,
        flatNumber: form.flatNumber,
        tower: form.tower,
      });
      updateUser(res.data.user);
      toast.success('Profile updated successfully');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await api.put(`/users/${user?._id}`, { profileImage: base64 });
        updateUser(res.data.user);
        toast.success('Profile picture updated');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update profile picture');
      }
    };
    reader.readAsDataURL(file);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-12 md:pt-24 px-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-lg glass-card-strong border border-surface-200/50 dark:border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/50 dark:border-surface-700/50">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Edit Profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="w-4 h-4 text-surface-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <div className="relative group">
              <div className={cn(
                'w-24 h-24 rounded-full border-4 border-white dark:border-surface-800 bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg flex items-center justify-center overflow-hidden',
                'ring-2 ring-primary-500/20'
              )}>
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center hover:bg-primary-600 transition-all hover:scale-105 active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          <div>
            <label className="input-label">Full Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="input-label">Email Address</label>
            <input className="input-field" value={form.email} disabled />
          </div>

          <div>
            <label className="input-label">Phone Number</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Tower / Block</label>
              <input className="input-field" value={form.tower} onChange={(e) => setForm((f) => ({ ...f, tower: e.target.value }))} />
            </div>
            <div>
              <label className="input-label">Flat / Unit</label>
              <input className="input-field" value={form.flatNumber} onChange={(e) => setForm((f) => ({ ...f, flatNumber: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200/50 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-900/50">
          <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
