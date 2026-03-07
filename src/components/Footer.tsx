export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 rounded-t-[2rem] bg-[#0f1016] px-4 pb-14 pt-12 text-[#edede9]">
      <div className="page-wrap">
        <div className="mb-10">
          <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">
            Ready to simplify your
            <br />
            property operations?
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#edede9] px-5 py-2.5 text-sm font-medium text-[#0f1016] transition-opacity hover:opacity-90"
            >
              Get started
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
            <a
              href="/about"
              className="inline-flex items-center rounded-[10px] border border-[#edede9]/30 px-5 py-2.5 text-sm font-medium text-[#edede9] transition-colors hover:bg-[#edede9]/10"
            >
              Learn more
            </a>
          </div>
        </div>

        <div className="border-t border-[#edede9]/10 pt-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="shrink-0 text-[#edede9]/60"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M3 8l9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-medium text-[#edede9]/60">Lette</span>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#edede9]/50">
              <a href="/about" className="transition-colors hover:text-[#edede9]">About</a>
              <a href="#" className="transition-colors hover:text-[#edede9]">Privacy</a>
              <a href="#" className="transition-colors hover:text-[#edede9]">Terms</a>
            </div>

            <p className="text-sm text-[#edede9]/40">
              &copy; {year} Lette. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
