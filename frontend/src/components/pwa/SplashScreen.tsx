'use client';
import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShow(false), 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-transparent blur-xl animate-pulse" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-1">
        <span className="bg-gradient-to-r from-indigo-400 to-indigo-200 bg-clip-text text-transparent">Vision</span>
        <span className="text-surface-400">Gate</span>
      </h1>
      <p className="text-sm text-surface-500 mb-8">AI Powered Smart Infrastructure</p>
      <div className="flex items-center gap-2 text-surface-600">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
