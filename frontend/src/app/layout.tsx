import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'NyayaAI — AI-Powered Legal Case Management',
  description: 'AI-powered case management for the Indian judicial system.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f1729',
              color: '#f5f0e8',
              border: '1px solid rgba(201,168,76,0.25)',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: { iconTheme: { primary: '#27ae60', secondary: '#0f1729' } },
            error:   { iconTheme: { primary: '#c0392b', secondary: '#0f1729' } },
          }}
        />
      </body>
    </html>
  );
}
