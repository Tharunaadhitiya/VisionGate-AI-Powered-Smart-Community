'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'contrast-black' | 'system';
type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red';

const THEME_KEY = 'vg_theme';
const ACCENT_KEY = 'vg_accent';

function isTheme(v: string | null): v is Theme {
  return v === 'light' || v === 'dark' || v === 'contrast-black' || v === 'system';
}

function isAccent(v: string | null): v is AccentColor {
  return v === 'blue' || v === 'purple' || v === 'green' || v === 'orange' || v === 'red';
}

export type { AccentColor };

interface ThemeContextType {
  theme: Theme;
  accentColor: AccentColor;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
  setAccentColor: (c: AccentColor) => void;
  toggleTheme: () => void;
}

const accentPalettes: Record<AccentColor, Record<string, string>> = {
  blue: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
    400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
    800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
  },
  purple: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
    400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
    800: '#6b21a8', 900: '#581c87', 950: '#3b0764',
  },
  green: {
    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
    400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
    800: '#166534', 900: '#14532d', 950: '#052e16',
  },
  orange: {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
    400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
    800: '#9a3412', 900: '#7c2d12', 950: '#431407',
  },
  red: {
    50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
    400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
    800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
  },
};

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  if (theme === 'contrast-black') return 'dark';
  return theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [accentColor, setAccentColorState] = useState<AccentColor>('blue');
  const [mounted, setMounted] = useState(false);
  const mqRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const savedAccent = localStorage.getItem(ACCENT_KEY);
    if (isTheme(saved)) setThemeState(saved);
    if (isAccent(savedAccent)) setAccentColorState(savedAccent);
    setMounted(true);
  }, []);

  const resolved = resolveTheme(theme);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const setAccentColor = useCallback((c: AccentColor) => {
    setAccentColorState(c);
    localStorage.setItem(ACCENT_KEY, c);
  }, []);

  const toggleTheme = useCallback(() => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('contrast-black');
    else if (theme === 'contrast-black') setTheme('system');
    else setTheme('light');
  }, [theme, setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (theme === 'contrast-black') {
      root.setAttribute('data-theme', 'contrast-black');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [resolved, theme]);

  useEffect(() => {
    const palette = accentPalettes[accentColor];
    const root = document.documentElement;
    Object.entries(palette).forEach(([key, val]) => {
      root.style.setProperty(`--color-primary-${key}`, val);
    });
  }, [accentColor]);

  useEffect(() => {
    mqRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    if (theme !== 'system') return;
    const handler = () => {
      if (mqRef.current!.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mqRef.current.addEventListener('change', handler);
    return () => mqRef.current?.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, accentColor, resolvedTheme: resolved, setTheme, setAccentColor, toggleTheme }}>
      {mounted ? children : <>{children}</>}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
