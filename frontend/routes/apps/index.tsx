import { useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { useApps, type AppWithServices } from '@/hooks/use-apps'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HugeiconsIcon } from '@hugeicons/react'
import { Loading03Icon, Alert02Icon } from '@hugeicons/core-free-icons'
import type { AppStatus } from '@/types'

export const Route = createFileRoute('/apps/')({
  component: AppsView,
})

const statusConfig: Record<AppStatus, { label: string; className: string }> = {
  running: {
    label: 'Running',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  building: {
    label: 'Building',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/15 text-destructive',
  },
  stopped: {
    label: 'Stopped',
    className: 'bg-muted text-muted-foreground',
  },
}

function looksLikeId(name: string) {
  return /^[A-Za-z0-9_-]{15,}$/.test(name)
}

function AppCard({ app }: { app: AppWithServices }) {
  const repoName = app.repository?.displayName ?? app.repository?.path?.split('/').pop() ?? 'unknown'
  const displayName = looksLikeId(app.name) ? repoName : app.name
  const deployedAgo = app.lastDeployedAt
    ? formatDistanceToNow(new Date(app.lastDeployedAt), { addSuffix: true })
    : null
  const status = statusConfig[app.status]

  // Collect domain links from exposed services
  const domainLinks = app.services?.filter((svc) => svc.exposed && svc.domain) ?? []

  return (
    <Card className="group h-full transition-colors hover:border-foreground/20">
      <Link
        to="/repositories/$repoId"
        params={{ repoId: app.repositoryId }}
        search={{ tab: 'deploy' }}
        className="block"
      >
        <CardContent className="flex flex-col gap-3 py-4">
          {/* Header: name + domain link */}
          <div className="flex items-baseline justify-between gap-2 min-w-0">
            <span className="shrink truncate font-medium group-hover:text-primary transition-colors">
              {displayName}
            </span>
            {domainLinks.length > 0 && (
              <a
                href={`https://${domainLinks[0].domain}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-[2] min-w-0 truncate text-xs text-primary hover:underline"
              >
                {domainLinks[0].domain}
              </a>
            )}
          </div>

          {/* Status badge */}
          <Badge
            variant="secondary"
            className={`w-fit text-[10px] ${status.className}`}
          >
            <span className={`inline-block size-1.5 rounded-full ${
              app.status === 'running' ? 'bg-emerald-500' :
              app.status === 'building' ? 'bg-amber-500' :
              app.status === 'failed' ? 'bg-destructive' :
              'bg-muted-foreground'
            }`} />
            {status.label}
          </Badge>

          {/* Repo · branch */}
          <span className="text-xs text-muted-foreground font-mono truncate">
            {repoName} · {app.branch}
          </span>

          {/* Services */}
          {app.services && app.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {app.services.map((svc) => (
                <Badge
                  key={svc.id}
                  variant="outline"
                  className="text-[10px] font-mono gap-1"
                >
                  {svc.serviceName}
                  {svc.containerPort && (
                    <span className="text-muted-foreground">:{svc.containerPort}</span>
                  )}
                  {svc.exposed && (
                    <span className="text-primary font-sans">{svc.exposureMethod}</span>
                  )}
                </Badge>
              ))}
            </div>
          )}

          {/* Deploy time */}
          <span className="text-xs text-muted-foreground">
            {app.status === 'building'
              ? 'Deploying\u2026'
              : deployedAgo
                ? `Deployed ${deployedAgo}`
                : 'Never deployed'}
          </span>
        </CardContent>
      </Link>
    </Card>
  )
}

const statusOrder: Record<string, number> = {
  running: 0,
  building: 1,
  failed: 2,
  stopped: 3,
}

function AppsView() {
  const { data: apps, isLoading, error } = useApps()
  const sortedApps = useMemo(
    () => apps?.slice().sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)),
    [apps],
  )

  return (
    <div className="flex h-full flex-col">
      <div
        className="film-grain relative flex shrink-0 items-center gap-2 border-b border-border px-4 py-2"
        style={{ background: 'var(--gradient-header)' }}
      >
        <h1 className="text-sm font-medium">Apps</h1>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={24}
              strokeWidth={2}
              className="animate-spin text-muted-foreground"
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 py-6 text-destructive">
            <HugeiconsIcon icon={Alert02Icon} size={20} strokeWidth={2} />
            <span className="text-sm">Failed to load apps: {error.message}</span>
          </div>
        )}

        {!isLoading && !error && sortedApps?.length === 0 && (
          <div className="py-12 text-muted-foreground">
            <p className="text-sm">No apps yet. Deploy one from a repository&apos;s Deploy tab.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedApps?.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </div>
    </div>
  )
}
