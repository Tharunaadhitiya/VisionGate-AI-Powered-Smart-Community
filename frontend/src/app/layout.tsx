import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { SocketProvider } from '@/hooks/useSocket';
import { ThemeProvider } from '@/hooks/useTheme';
import { Toaster } from 'react-hot-toast';
import GlobalErrorHandler from '@/components/error/GlobalErrorHandler';
import SplashScreen from '@/components/pwa/SplashScreen';
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
  var resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  if (resolved === 'dark') document.documentElement.classList.add('dark');
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <SplashScreen />
        <OfflineIndicator />
        <PWARegistrar />
        <AuthProvider>
          <ThemeProvider>
            <SocketProvider>
              <GlobalErrorHandler>
                {children}
              </GlobalErrorHandler>
              <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', padding: '12px 16px' } }} />
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
