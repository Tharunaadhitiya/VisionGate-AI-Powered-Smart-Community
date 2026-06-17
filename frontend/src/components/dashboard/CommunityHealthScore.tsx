'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { staggerItem } from '@/lib/animation';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

export interface HealthFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  explanation?: string;
}

function getScoreLabel(score: number) {
  if (score >= 80) return { label: 'Excellent', color: 'text-secondary-400', bar: 'bg-secondary-500' };
  if (score >= 60) return { label: 'Good', color: 'text-primary-400', bar: 'bg-primary-500' };
  if (score >= 40) return { label: 'Average', color: 'text-warning-400', bar: 'bg-warning-500' };
  return { label: 'Needs Attention', color: 'text-danger-400', bar: 'bg-danger-500' };
}

function getFactorColor(score: number) {
  if (score >= 80) return 'bg-secondary-500';
  if (score >= 60) return 'bg-primary-500';
  if (score >= 40) return 'bg-warning-500';
  return 'bg-danger-500';
}

const SCORE_CACHE_KEY = 'comm-health-prev';

function loadPrevScore(): number | null {
  try { return Number(localStorage.getItem(SCORE_CACHE_KEY)) || null; } catch { return null; }
}

function saveCurrentScore(score: number) {
  try { localStorage.setItem(SCORE_CACHE_KEY, String(score)); } catch {}
}

export default function CommunityHealthScore({ factors }: { factors: HealthFactor[] }) {
  if (!factors || factors.length === 0) return null;

  const prevScoreRef = useRef<number | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  useEffect(() => {
    setPrevScore(loadPrevScore());
  }, []);

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedScore = totalWeight > 0
    ? Math.round(
        factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight
      )
    : 0;

  const clamped = Math.max(0, Math.min(100, weightedScore));

  useEffect(() => {
    if (prevScoreRef.current !== clamped) {
      saveCurrentScore(clamped);
      prevScoreRef.current = clamped;
    }
  }, [clamped]);

  const { label, color, bar } = getScoreLabel(clamped);
  const trend = prevScore !== null
    ? (clamped > prevScore ? 'up' : clamped < prevScore ? 'down' : 'stable')
    : null;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const worseningFactors = factors.filter((f) => f.score < 60).sort((a, b) => a.score - b.score);
  const explanation = worseningFactors.length > 0
    ? `Dragged down by ${worseningFactors.slice(0, 3).map((f) => `${f.label} (${f.score}%)`).join(', ')}`
    : undefined;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Community Health</h2>
        {explanation && (
          <span className="text-[10px] text-surface-400 flex items-center gap-1" title={explanation}>
            <AlertTriangle className="w-3 h-3" /> {worseningFactors.length} low
          </span>
        )}
      </div>
      <motion.div variants={staggerItem} className="rounded-xl border border-white/5 dark:border-surface-700/50 bg-white/5 dark:bg-surface-800/30 p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(clamped / 100) * 175.9} 175.9`}
                className={bar.replace('bg-', 'text-')}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendIcon className={cn('w-5 h-5', trend === 'up' ? 'text-secondary-400' : trend === 'down' ? 'text-danger-400' : color)} />
            </div>
          </div>
          <div>
            <p className={cn('text-xl font-bold', color)}>{clamped}/100</p>
            <p className={cn('text-sm font-semibold', color)}>{label}</p>
            {trend && (
              <p className="text-[10px] text-surface-400 mt-0.5">
                {trend === 'up' ? 'Improved since last check' : 'Declined since last check'}
              </p>
            )}
          </div>
        </div>
        {explanation && (
          <p className="text-xs text-surface-400 mb-3 leading-relaxed">{explanation}</p>
        )}
        <div className="space-y-2">
          {factors.map((factor) => (
            <div key={factor.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-surface-500 dark:text-surface-400">{factor.label}</span>
                <span className="font-medium text-surface-900 dark:text-surface-100">{factor.score}%</span>
              </div>
              <div className="w-full bg-white/5 dark:bg-surface-700/50 rounded-full h-1.5">
                <div
                  className={cn('h-1.5 rounded-full transition-all duration-500', getFactorColor(factor.score))}
                  style={{ width: `${factor.score}%` }}
                />
              </div>
              {factor.explanation && (
                <p className="text-[10px] text-surface-400 mt-0.5">{factor.explanation}</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 dark:border-surface-700/50">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-surface-500">
            {factors.map((f) => (
              <span key={f.key}>{f.label}: {f.weight}%</span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
