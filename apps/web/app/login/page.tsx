import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Login — SMCore',
  description: 'Sign in with your Discord account to access the SMCore dashboard.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginPageClient />
    </Suspense>
  );
}

function LoginLoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-on-surface-variant font-mono">Initializing...</p>
      </div>
    </div>
  );
}
