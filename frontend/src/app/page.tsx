'use client';
import Link from 'next/link';
import { Shield, Users, Camera, Bell, BarChart3, MessageSquare, ArrowRight, Star, Smartphone, Building2, Eye, AlertTriangle, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const features = [
  { icon: Users, title: 'Smart Visitor Management', desc: 'AI-powered visitor verification with QR codes, OTP, and face recognition' },
  { icon: Camera, title: 'AI Surveillance', desc: 'Real-time object detection, intrusion alerts, and crowd monitoring using YOLOv8' },
  { icon: Bell, title: 'Emergency Response', desc: 'Instant SOS alerts, fire detection, and emergency broadcast system' },
  { icon: MessageSquare, title: 'AI Chatbot Assistant', desc: '24/7 intelligent assistant for queries, complaints, and bookings' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'Predictive analytics, security heatmaps, and trend forecasting' },
  { icon: Eye, title: 'Live Monitoring', desc: 'Real-time CCTV dashboard with motion detection and loitering alerts' },
];

const stats = [
  { label: 'Active Residents', value: '2,400+' },
  { label: 'Visitors Managed', value: '50K+' },
  { label: 'Security Events', value: '10K+' },
  { label: 'AI Detections', value: '99.8%' },
];

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <header className="fixed top-0 w-full z-50 glass-card border-b border-surface-200/50 dark:border-surface-700/50 rounded-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl"><span className="text-gradient">Vision</span><span className="text-surface-400">Gate</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 dark:bg-primary-500/10 rounded-full text-sm text-primary-700 dark:text-primary-400 font-medium mb-6">
            <Zap className="w-4 h-4" /> AI-Powered Smart Infrastructure
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Smart Security for<br />
            <span className="text-gradient">Modern Communities</span>
          </h1>
          <p className="text-xl text-surface-500 dark:text-surface-400 max-w-2xl mx-auto mb-10">
            AI-powered residential community management with intelligent surveillance, smart visitor management, and predictive analytics.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="btn-secondary text-lg px-8 py-3">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">{stat.value}</div>
                <div className="text-sm text-surface-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Intelligent Features</h2>
          <p className="text-surface-400 text-center mb-12 max-w-xl mx-auto">AI-powered tools that transform how residential communities are managed and secured.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="glass-card p-6 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 bg-primary-50 dark:bg-primary-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-surface-400">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-surface-100 dark:bg-surface-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">AI-Powered <span className="text-gradient">Surveillance</span></h2>
              <p className="text-surface-400 mb-6">Advanced computer vision powered by YOLOv8 for real-time threat detection, face recognition, and crowd analysis.</p>
              <ul className="space-y-3">
                {['Object Detection & Tracking', 'Face Recognition', 'Weapon Detection', 'Crowd Density Analysis', 'Loitering Detection', 'Motion Detection'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-8">
              <div className="aspect-video bg-gradient-to-br from-surface-800 to-surface-900 rounded-xl flex items-center justify-center">
                <Camera className="w-16 h-16 text-surface-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-surface-200 dark:border-surface-800">
        <div className="max-w-6xl mx-auto text-center text-sm text-surface-400">
          <p className="font-semibold text-surface-600 dark:text-surface-300 mb-1">VisionGate — AI-Powered Smart Infrastructure for Residential Communities</p>
          <p>&copy; 2026 VisionGate. Powering Sustainable Communities with AI.</p>
        </div>
      </footer>
    </div>
  );
}
