'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function StartupAnimation() {
  const [phase, setPhase] = useState<'logo' | 'text' | 'subtitle' | 'hold' | 'exit' | 'done'>('logo');
  const show = phase !== 'done';

  useEffect(() => {
    const t = setTimeout(() => setPhase('text'), 400);
    const t2 = setTimeout(() => setPhase('subtitle'), 900);
    const t3 = setTimeout(() => setPhase('hold'), 1300);
    const t4 = setTimeout(() => setPhase('exit'), 1600);
    const t5 = setTimeout(() => setPhase('done'), 2000);
    return () => { clearTimeout(t); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  if (phase === 'done') return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <div className="flex flex-col items-center gap-5">
            {/* Shield logo */}
            {phase !== 'logo' && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30"
              >
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </motion.div>
            )}

            {/* VisionGate wordmark */}
            {(phase === 'text' || phase === 'subtitle' || phase === 'hold' || phase === 'exit') && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="flex items-baseline gap-0"
              >
                <span className="text-[2.25rem] font-bold tracking-tight text-white">Vision</span>
                <span className="text-[2.25rem] font-bold tracking-tight text-indigo-400">Gate</span>
              </motion.div>
            )}

            {/* Subtitle */}
            {(phase === 'subtitle' || phase === 'hold' || phase === 'exit') && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-sm text-zinc-500 font-medium tracking-[0.2em] uppercase"
              >
                AI Powered Smart Community
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
