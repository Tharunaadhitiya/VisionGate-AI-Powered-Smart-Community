'use client';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.current = 'Current password is required';
    if (!newPassword) errs.newPw = 'New password is required';
    else if (newPassword.length < 6) errs.newPw = 'Must be at least 6 characters';
    if (newPassword !== confirmPassword) errs.confirm = 'Passwords do not match';
    if (newPassword && currentPassword === newPassword) errs.newPw = 'Must be different from current password';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.put(`/users/${user?._id}/password`, {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm glass-card-strong border border-surface-200/50 dark:border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/50 dark:border-surface-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-primary-500" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Change Password</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X className="w-4 h-4 text-surface-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="input-label">Current Password</label>
            <div className="relative">
              <input className="input-field pr-10" type={showCurrent ? 'text' : 'password'} placeholder="Enter current password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.current && <p className="text-xs text-danger-500 mt-1">{errors.current}</p>}
          </div>

          <div>
            <label className="input-label">New Password</label>
            <div className="relative">
              <input className="input-field pr-10" type={showNew ? 'text' : 'password'} placeholder="At least 6 characters"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPw && <p className="text-xs text-danger-500 mt-1">{errors.newPw}</p>}
          </div>

          <div>
            <label className="input-label">Confirm New Password</label>
            <div className="relative">
              <input className="input-field pr-10" type={showConfirm ? 'text' : 'password'} placeholder="Re-enter new password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-danger-500 mt-1">{errors.confirm}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200/50 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-900/50">
          <button onClick={onClose} className="btn-ghost text-sm px-4 py-2">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
