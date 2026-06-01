'use client';
import { useEffect } from 'react';

export default function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      if (process.env.NODE_ENV === 'development') {
        console.warn('Caught unhandled rejection:', event.reason?.message || event.reason);
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return <>{children}</>;
}
