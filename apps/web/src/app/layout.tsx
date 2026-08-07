import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SMCore Dashboard',
  description: 'SMCore Discord Bot - Enterprise Server Management & Role Verification Platform',
  openGraph: {
    title: 'SMCore Dashboard',
    description: 'Enterprise Discord Server Management & Verification Platform',
    siteName: 'SMCore',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SMCore Dashboard',
    description: 'Enterprise Discord Server Management & Verification Platform',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
