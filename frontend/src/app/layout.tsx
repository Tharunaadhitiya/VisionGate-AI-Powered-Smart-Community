import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { SocketProvider } from '@/hooks/useSocket';
import { ThemeProvider } from '@/hooks/useTheme';
import { Toaster } from 'react-hot-toast';
import GlobalErrorHandler from '@/components/error/GlobalErrorHandler';
import StartupAnimation from '@/components/ui/StartupAnimation';
import PWARegistrar from '@/components/pwa/PWARegistrar';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';

export const metadata: Metadata = {
  title: 'VisionGate - AI-Powered Smart Infrastructure',
  description: 'AI-powered smart residential community management and security platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VisionGate',
  },
  icons: [
    { rel: 'icon', url: '/favicon.ico', sizes: '48x48' },
    { rel: 'apple-touch-icon', url: '/icons/icon-152x152.png', sizes: '152x152' },
    { rel: 'apple-touch-icon', url: '/icons/icon-192x192.png', sizes: '192x192' },
    { rel: 'apple-touch-icon', url: '/icons/icon-512x512.png', sizes: '512x512' },
  ],
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const themeScript = `
(function() {
  var theme = localStorage.getItem('vg_theme') || 'system';
  var resolved = theme;
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (resolved === 'dark' || resolved === 'contrast-black') {
    document.documentElement.classList.add('dark');
  }
  if (resolved === 'contrast-black') {
    document.documentElement.setAttribute('data-theme', 'contrast-black');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <StartupAnimation />
        <OfflineIndicator />
        <PWARegistrar />
        <AuthProvider>
          <ThemeProvider>
            <SocketProvider>
              <GlobalErrorHandler>
                {children}
              </GlobalErrorHandler>
              <Toaster position="top-right" gutter={10}
                toastOptions={{
                  duration: 4000,
                  style: { borderRadius: '14px', padding: '14px 18px', fontSize: '14px', fontWeight: 500, boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15), 0 2px 8px -2px rgba(0,0,0,0.05)' },
                  success: { iconTheme: { primary: '#22c55e', secondary: '#fff' }, style: { borderLeft: '3px solid #22c55e' } },
                  error: { iconTheme: { primary: '#ef4444', secondary: '#fff' }, style: { borderLeft: '3px solid #ef4444' } },
                  loading: { iconTheme: { primary: '#6366f1', secondary: '#fff' }, style: { borderLeft: '3px solid #6366f1' } },
                  custom: { style: { borderLeft: '3px solid #6366f1' } },
                }} />
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
