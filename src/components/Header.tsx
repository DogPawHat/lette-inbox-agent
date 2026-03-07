import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 px-4 py-3">
      <nav className="page-wrap flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-foreground no-underline"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M3 8l9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-base font-medium tracking-tight">Lette</span>
        </Link>

        <div className="inline-flex items-center gap-1 rounded-xl border border-border/50 bg-background/80 p-1 backdrop-blur-xl">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: 'inline-flex items-center rounded-lg px-4 py-2 text-sm text-foreground bg-card shadow-sm transition-colors' }}
          >
            Home
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: 'inline-flex items-center rounded-lg px-4 py-2 text-sm text-foreground bg-card shadow-sm transition-colors' }}
          >
            About
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="/login"
            className="hidden items-center gap-2 rounded-[10px] bg-[#0f1016] px-5 py-2.5 text-sm font-medium text-[#edede9] transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Login
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </nav>
    </header>
  )
}
