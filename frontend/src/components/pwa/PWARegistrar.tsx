'use client';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export default function PWARegistrar() {
  const installed = useRef(false);

  useEffect(() => {
    if (installed.current || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    installed.current = true;

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registration = reg;

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast(
                (t) => (
                  <div className="flex items-center gap-3">
                    <span className="text-sm">New version available</span>
                    <button
                      className="px-3 py-1 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                      onClick={() => {
                        newWorker.postMessage('SKIP_WAITING');
                        toast.dismiss(t.id);
                        window.location.reload();
                      }}
                    >
                      Update Now
                    </button>
                  </div>
                ),
                { duration: Infinity }
              );
            }
          });
        });
      })
      .catch(() => {});

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return () => {
      if (registration) {
        registration.removeEventListener('updatefound', () => {});
      }
    };
  }, []);

  return null;
}
