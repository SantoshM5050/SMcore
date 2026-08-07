import { redirect } from 'next/navigation';
import { AuthService } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const user = await AuthService.getSessionUser();
  if (!user) {
    redirect('/login');
  }
  redirect('/dashboard');
}
