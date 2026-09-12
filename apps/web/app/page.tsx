import Link from 'next/link';
import { ShieldCheck, ArrowRight, Terminal, Database, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <Badge variant="default" className="mb-6 px-3 py-1 font-mono text-xs">
          SMCore Foundation v1.0.0
        </Badge>

        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-primary shadow-xl">
          <ShieldCheck className="h-9 w-9" />
        </div>

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
          Precision Discord <span className="text-primary">Governance</span>
        </h1>

        <p className="mt-4 text-base text-text-secondary">
          Enterprise moderation engine, automated enforcement pipelines, high-density audit logging,
          and unified guild administration built for massive communities.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button size="lg" className="flex items-center gap-2">
              <span>Open Dashboard Shell</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Foundation Architecture Highlights */}
        <div className="mt-14 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-lg border border-outline-variant bg-surface p-4">
            <div className="flex items-center gap-2 font-display text-xs font-semibold text-text-primary">
              <Terminal className="h-4 w-4 text-primary" />
              <span>Bot Gateway</span>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Discord.js v14 runtime with resilient intent management and health probes.
            </p>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface p-4">
            <div className="flex items-center gap-2 font-display text-xs font-semibold text-text-primary">
              <Database className="h-4 w-4 text-primary" />
              <span>Prisma Postgres</span>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Strict multi-tenant guild isolation schema with automated indexing.
            </p>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface p-4">
            <div className="flex items-center gap-2 font-display text-xs font-semibold text-text-primary">
              <Server className="h-4 w-4 text-primary" />
              <span>Stitch Dark UI</span>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Linear-grade precision dark interface built with Tailwind & Lucide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
