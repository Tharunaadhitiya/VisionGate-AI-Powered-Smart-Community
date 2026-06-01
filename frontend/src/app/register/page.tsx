'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, User, ShieldCheck, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<{ name: string; email: string; phone: string; password: string; role: 'resident' | 'security'; flatNumber: string; tower: string }>({ name: '', email: '', phone: '', password: '', role: 'resident', flatNumber: '', tower: '' });
  const [loading, setLoading] = useState(false);

  const houseCode = form.tower && form.flatNumber ? `${form.tower}-${form.flatNumber}` : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, houseCode });
      toast.success('Registration successful!');
      router.push(`/dashboard/${form.role}`);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const updateField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [field]: e.target.value });

  const roles = [
    { value: 'resident' as const, label: 'Resident', icon: Home, desc: 'Access community features, visitors, complaints & more' },
    { value: 'security' as const, label: 'Security', icon: ShieldCheck, desc: 'Manage visitors, surveillance & security alerts' },
  ];

  const towers = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-surface-50 via-secondary-50/30 to-surface-50 dark:from-surface-950 dark:via-secondary-950/20 dark:to-surface-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-surface-400 mt-1">Join your community on VisionGate</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input className="input-field" placeholder="John Doe" value={form.name} onChange={updateField('name')} required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" className="input-field" placeholder="john@example.com" value={form.email} onChange={updateField('email')} required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input type="tel" className="input-field" placeholder="9876543210" value={form.phone} onChange={updateField('phone')} required />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">I want to register as</label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const selected = form.role === r.value;
                  return (
                    <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all duration-200',
                        selected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                      )}>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', selected ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-500')}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-semibold">{r.label}</p>
                      <p className="text-[10px] text-surface-400 mt-0.5">{r.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Tower</label>
              <select className="input-field" value={form.tower} onChange={updateField('tower')} required>
                <option value="">Select Tower</option>
                {towers.map((t) => <option key={t} value={t}>Tower {t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Flat Number</label>
              <input className="input-field" placeholder="e.g. 101" value={form.flatNumber} onChange={updateField('flatNumber')} required />
            </div>
            {houseCode && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">House Code</label>
                <div className="input-field bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold border-primary-200 dark:border-primary-800">
                  {houseCode}
                </div>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input type="password" className="input-field" placeholder="Minimum 6 characters" value={form.password} onChange={updateField('password')} minLength={6} required />
            </div>
          </div>

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }} className="btn-primary w-full mt-2">
            {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </motion.button>

          <p className="text-center text-sm text-surface-400">
            Already have an account? <Link href="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Sign In</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
