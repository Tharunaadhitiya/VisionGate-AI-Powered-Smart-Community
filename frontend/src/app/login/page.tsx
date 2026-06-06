'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, HelpCircle, X, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryForm, setRecoveryForm] = useState({ userName: '', email: '', phoneNumber: '', reason: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      const role = localStorage.getItem('vg_role') || 'resident';
      router.push(`/dashboard/${role}`);
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!recoveryForm.userName.trim()) errors.userName = 'Please enter your name.';
    if (!recoveryForm.email.trim()) errors.email = 'Please enter a valid email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryForm.email)) errors.email = 'Please enter a valid email address.';
    if (!recoveryForm.phoneNumber.trim()) errors.phoneNumber = 'Please enter your phone number.';
    if (!recoveryForm.reason.trim()) errors.reason = 'Please provide a reason for recovery.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRecoverySubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    const formData = { ...recoveryForm };
    console.log("Submitting Recovery Request:", formData);
    try {
      const res = await api.post('/recovery-requests', formData);
      console.log("Recovery API Response:", res);
      toast.success('Recovery request submitted successfully. An administrator will contact you shortly.');
      setShowForgot(false);
      setRecoveryForm({ userName: '', email: '', phoneNumber: '', reason: '' });
      setFormErrors({});
    } catch (err: any) {
      console.log("Recovery API Error:", err);
      toast.error(err.message || 'Network error. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-surface-50 via-primary-50/30 to-surface-50 dark:from-surface-950 dark:via-primary-950/20 dark:to-surface-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-surface-400 mt-1">Sign in to your VisionGate account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="email" className="input-field pl-10" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type={showPassword ? 'text' : 'password'} className="input-field pl-10 pr-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4 text-surface-400" /> : <Eye className="w-4 h-4 text-surface-400" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>

          <button type="button" onClick={() => setShowForgot(true)} className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
            <HelpCircle className="w-3.5 h-3.5 inline mr-1" /> Forgot Credentials?
          </button>

          <p className="text-center text-sm text-surface-400">
            Don&apos;t have an account? <Link href="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Register</Link>
          </p>

          <div className="pt-3 border-t border-surface-100 dark:border-surface-800">
            <p className="text-xs text-surface-400 text-center mb-2">Demo credentials:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-surface-500">
              <div className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">admin@visiongate.com / password123</div>
              <div className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">security@visiongate.com / password123</div>
              <div className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50 col-span-2">john@visiongate.com / password123</div>
            </div>
          </div>
        </form>
      </div>

      {showForgot && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForgot(false)}>
          <div className="glass-card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Forgot Credentials?</h3>
              <button onClick={() => setShowForgot(false)} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-surface-400 mb-4">Contact an administrator to recover your account. Fill out the form below and an admin will reach out to you.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input className={`input-field ${formErrors.userName ? 'border-danger-500' : ''}`} value={recoveryForm.userName}
                  onChange={(e) => { setRecoveryForm({ ...recoveryForm, userName: e.target.value }); setFormErrors({ ...formErrors, userName: '' }); }} />
                {formErrors.userName && <p className="text-xs text-danger-500 mt-0.5">{formErrors.userName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Registered Email</label>
                <input type="email" className={`input-field ${formErrors.email ? 'border-danger-500' : ''}`} value={recoveryForm.email}
                  onChange={(e) => { setRecoveryForm({ ...recoveryForm, email: e.target.value }); setFormErrors({ ...formErrors, email: '' }); }} />
                {formErrors.email && <p className="text-xs text-danger-500 mt-0.5">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number</label>
                <input type="tel" className={`input-field ${formErrors.phoneNumber ? 'border-danger-500' : ''}`} value={recoveryForm.phoneNumber}
                  onChange={(e) => { setRecoveryForm({ ...recoveryForm, phoneNumber: e.target.value }); setFormErrors({ ...formErrors, phoneNumber: '' }); }} />
                {formErrors.phoneNumber && <p className="text-xs text-danger-500 mt-0.5">{formErrors.phoneNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select className={`input-field ${formErrors.reason ? 'border-danger-500' : ''}`} value={recoveryForm.reason}
                  onChange={(e) => { setRecoveryForm({ ...recoveryForm, reason: e.target.value }); setFormErrors({ ...formErrors, reason: '' }); }}>
                  <option value="">Select a reason</option>
                  <option value="I forgot my password.">I forgot my password.</option>
                  <option value="I forgot my email and password.">I forgot my email and password.</option>
                  <option value="I am unable to access my account.">I am unable to access my account.</option>
                </select>
                {formErrors.reason && <p className="text-xs text-danger-500 mt-0.5">{formErrors.reason}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForgot(false); setFormErrors({}); }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleRecoverySubmit} disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Submit Request</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
