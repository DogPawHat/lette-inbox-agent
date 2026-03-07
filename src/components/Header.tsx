import { Link } from "@tanstack/react-router";
import { Inbox, Wand2 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

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

        <div className="nav-pill">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            <Inbox className="size-4" />
            Inbox
          </Link>
          <Link
            to="/intake"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            <Wand2 className="size-4" />
            Intake
          </Link>
          <Link
            to="/about"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground md:block">
            Seeded 20-email demo
          </div>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
