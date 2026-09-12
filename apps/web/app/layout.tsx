import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'SMCore — Precision Discord Management',
  description: 'Enterprise-grade Discord moderation and community governance platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
