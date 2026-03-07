import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="rise-in pb-16 pt-8">
        <p className="section-label mb-5">About</p>
        <h1 className="display-heading mb-6 max-w-2xl text-4xl sm:text-[56px] sm:leading-[64px]">
          Intelligent communication for modern property management.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Lette helps property managers process communication from tenants,
          landlords, contractors, and prospects. We identify who messages are
          from, understand context across threads, assess urgency, and surface
          clear recommended actions, so you can quickly understand what matters
          most and what to do next.
        </p>
      </section>

      <section className="rise-in grid gap-4 sm:grid-cols-3" style={{ animationDelay: '100ms' }}>
        {[
          {
            title: 'Identify senders',
            desc: 'Automatically recognise who messages are from and link them to the right property and contact records.',
          },
          {
            title: 'Understand context',
            desc: 'Thread analysis across email, SMS, and chat to build a complete picture of every conversation.',
          },
          {
            title: 'Surface actions',
            desc: 'Urgency scoring and recommended next steps so nothing slips through the cracks.',
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-[20px] bg-card p-6 shadow-sm ring-1 ring-border/50 sm:p-8"
          >
            <h3 className="mb-2 text-lg font-medium tracking-tight text-foreground">
              {item.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.desc}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}
