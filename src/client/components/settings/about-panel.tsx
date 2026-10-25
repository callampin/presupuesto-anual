import { ArrowUpRight, GitBranch, UserRound } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  APP_VERSION,
  APP_VERSION_LABEL,
  GITHUB_PROFILE_URL,
  GITHUB_REPO_URL,
  LATEST_RELEASE_URL,
} from '@/lib/version'

const LINK_CLASS =
  'inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary'

/** Créditos, versión instalada y accesos a GitHub. */
export function AboutPanel() {
  return (
    <Card className="plot-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Acerca de
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
            Presupuesto Personal
            <span className="border border-border/70 px-1.5 py-0.5 font-mono text-[9px] leading-none text-primary">
              {APP_VERSION_LABEL}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Creado por{' '}
            <a
              href={GITHUB_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
            >
              callampin
            </a>
            . Versión instalada: <span className="font-mono text-foreground">{APP_VERSION}</span>.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <a
            href={GITHUB_PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className={LINK_CLASS}
          >
            <UserRound className="h-3 w-3" />
            Perfil de GitHub
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className={LINK_CLASS}>
            <GitBranch className="h-3 w-3" />
            Repositorio
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <a href={LATEST_RELEASE_URL} target="_blank" rel="noreferrer" className={LINK_CLASS}>
            <ArrowUpRight className="h-3 w-3" />
            Buscar la última versión
          </a>
        </div>
      </div>
    </Card>
  )
}
