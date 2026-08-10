import { redirect } from 'next/navigation';

export default function AuditLogsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const guildId = searchParams?.guildId ? `?guildId=${searchParams.guildId}` : '';
  redirect(`/logs${guildId}`);
}
