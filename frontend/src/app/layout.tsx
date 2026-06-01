import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { SocketProvider } from '@/hooks/useSocket';
import { ThemeProvider } from '@/hooks/useTheme';
import { Toaster } from 'react-hot-toast';
import GlobalErrorHandler from '@/components/error/GlobalErrorHandler';

export const metadata: Metadata = {
  title: 'VisionGate - AI-Powered Smart Infrastructure',
  description: 'AI-powered smart residential community management and security platform',
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
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
