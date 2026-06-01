'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, FileText, Users, CreditCard, AlertTriangle, Megaphone, Shield, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const typeConfig: Record<string, { icon: any; color: string }> = {
  users: { icon: User, color: 'text-primary-500' },
  complaints: { icon: FileText, color: 'text-warning-500' },
  visitors: { icon: Users, color: 'text-secondary-500' },
  payments: { icon: CreditCard, color: 'text-success-500' },
  alerts: { icon: AlertTriangle, color: 'text-danger-500' },
  notices: { icon: Megaphone, color: 'text-indigo-500' },
  incidents: { icon: Shield, color: 'text-orange-500' },
  messages: { icon: MessageSquare, color: 'text-purple-500' },
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) { setQuery(''); setResults({}); setSelectedIndex(0); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults({}); setTotalItems(0); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/search', { q: query.trim() });
        const g = res.data?.data?.results || {};
        setResults(g);
        const count = Object.values(g).reduce((s: number, arr: any) => s + arr.length, 0);
        setTotalItems(count);
      } catch {} finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const flatResults = useCallback(() => {
    const items: { type: string; item: any }[] = [];
    for (const [type, arr] of Object.entries(results)) for (const item of arr) items.push({ type, item });
    return items;
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = flatResults();
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && items[selectedIndex]) { navigate(items[selectedIndex].item); }
  };

  const navigate = (item: any) => {
    setOpen(false);
    router.push(item.link || '/');
  };

  return (
    <div ref={panelRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        title="Search (Ctrl+K)"
      >
        <Search className="w-4.5 h-4.5 text-surface-500" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute top-full right-0 mt-2 w-[420px] max-w-[90vw] glass-card-strong border border-surface-200/50 dark:border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden origin-top-right"
          >
            <div className="flex items-center gap-3 p-3 border-b border-surface-100 dark:border-surface-800">
              <Search className="w-4.5 h-4.5 text-surface-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search users, complaints, visitors..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
              />
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-400 rounded border border-surface-200 dark:border-surface-700">ESC</kbd>
            </div>

            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              )}

              {!loading && query && totalItems === 0 && (
                <div className="py-8 text-center">
                  <Search className="w-8 h-8 mx-auto text-surface-300 mb-2" />
                  <p className="text-sm text-surface-400">No results for &quot;{query}&quot;</p>
                </div>
              )}

              {!loading && Object.entries(results).map(([type, items]) => {
                if (items.length === 0) return null;
                const cfg = typeConfig[type] || { icon: Search, color: 'text-surface-500' };
                const Icon = cfg.icon;
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-surface-400 bg-surface-50 dark:bg-surface-800/50">
                      <Icon className={cn('w-3 h-3', cfg.color)} />
                      {type}
                    </div>
                    {items.map((item: any) => (
                      <button
                        key={`${type}-${item._id}`}
                        onClick={() => navigate(item)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-surface-100 dark:bg-surface-800', cfg.color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{item.title}</p>
                          {item.subtitle && <p className="text-xs text-surface-400 truncate">{item.subtitle}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
