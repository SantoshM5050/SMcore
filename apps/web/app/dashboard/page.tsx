import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Bot,
  FileText,
  Activity,
  Server,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            System Overview
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Foundation status and platform subsystem diagnostics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="flex items-center gap-1.5 py-1 px-3">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Monorepo Foundation Initialized</span>
          </Badge>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-secondary">
              Gateway Connection
            </CardTitle>
            <Server className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl font-bold text-text-primary">Ready</div>
            <p className="mt-1 text-[11px] text-text-muted">Discord.js v14 Client</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-secondary">
              Storage Engine
            </CardTitle>
            <Activity className="h-4 w-4 text-status-success" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl font-bold text-text-primary">PostgreSQL</div>
            <p className="mt-1 text-[11px] text-text-muted">Prisma ORM Client</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-secondary">
              Core Architecture
            </CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl font-bold text-text-primary">Monorepo</div>
            <p className="mt-1 text-[11px] text-text-muted">npm workspaces (bot, web, shared, db)</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-text-secondary">
              Design System
            </CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl font-bold text-text-primary">Stitch Dark</div>
            <p className="mt-1 text-[11px] text-text-muted">Precision Dark Tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Phase Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Feature Roadmap</CardTitle>
          <CardDescription>
            Architecture foundation successfully laid out. Features will be implemented phase-by-phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-status-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">
                    Phase 0: Monorepo & Infrastructure Foundation
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    Workspaces, shared types, Prisma foundation, Next.js shell, Bot Gateway & health server.
                  </p>
                </div>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-text-secondary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">
                    Phase 1: Core Moderation Engine
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    Warn, Timeout, Kick, Ban, Case Management, Hierarchy Verification & DM Notifications.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Next Phase</span>
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-text-secondary">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">
                    Phase 2: AutoMod & Protection Shield
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    Anti-Spam, Mass Mention, Invite Filter, Bad Words, Heuristic Rate Limiting.
                  </p>
                </div>
              </div>
              <Badge variant="outline">Upcoming</Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-text-secondary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-text-primary">
                    Phase 3: High-Density Logging & Audit System
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    Granular channel routing, message diffs, member events, and staff audit trails.
                  </p>
                </div>
              </div>
              <Badge variant="outline">Upcoming</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
