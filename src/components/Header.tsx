import { Link } from "@tanstack/react-router";
import { Building2, Inbox, Wand2 } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <nav className="page-shell flex flex-wrap items-center gap-3 px-4 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          <span>
            <span className="block text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">
              Lette
            </span>
            <span className="block text-sm">Inbox Agent</span>
          </span>
        </Link>

        <div className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: "nav-link nav-link-active" }}
          >
            <Inbox className="size-4" />
            Inbox
          </Link>
          <Link
            to="/intake"
            className="nav-link"
            activeProps={{ className: "nav-link nav-link-active" }}
          >
            <Wand2 className="size-4" />
            Intake
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground md:block">
            Seeded 20-email demo
          </div>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
