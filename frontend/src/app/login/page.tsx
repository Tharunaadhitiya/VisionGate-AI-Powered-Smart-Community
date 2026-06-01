'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    </div>
  );
}
