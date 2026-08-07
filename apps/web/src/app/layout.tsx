import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus Dashboard',
  description: 'Nexus Discord Bot - Enterprise Server Management & Role Verification Platform',
  openGraph: {
    title: 'Nexus Dashboard',
    description: 'Enterprise Discord Server Management & Verification Platform',
    siteName: 'Nexus',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus Dashboard',
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
