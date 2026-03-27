import { Zap, Search, ShieldCheck, FileJson } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import PageBackground from '@/components/layout/PageBackground'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UploadZone from '@/components/upload/UploadZone'
import ManualInput from '@/components/upload/ManualInput'

const features = [
  {
    icon: Search,
    title: 'Research Agent',
    description: 'Fetches MRFP docs, ETF Facts, fund company websites',
  },
  {
    icon: ShieldCheck,
    title: 'Verification Pass',
    description: 'Independent agent re-checks every data point',
  },
  {
    icon: FileJson,
    title: 'JSON Export',
    description: 'Feeds directly into Plan Builder',
  },
] as const

export default function HomePage() {
  return (
    <>
      <PageBackground />
      <Navbar />

      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-2xl mx-auto space-y-10">

          {/* ── Hero ── */}
          <section className="flex flex-col items-center gap-5 text-center">
            {/* AI badge */}
            <div
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
                'border border-primary/25 bg-primary/8',
                'text-xs font-medium text-primary',
              ].join(' ')}
            >
              <Zap className="size-3 shrink-0" aria-hidden="true" />
              AI-Powered Portfolio Analysis
            </div>

            {/* H1 */}
            <h1
              className={[
                'font-[family-name:var(--font-outfit)]',
                'text-5xl sm:text-6xl font-bold leading-[1.08] tracking-tight',
              ].join(' ')}
            >
              Analyze Any Portfolio
              <br />
              <span className="gradient-text">in Minutes</span>
            </h1>

            {/* Subheading */}
            <p className="max-w-lg text-base sm:text-lg text-muted-foreground leading-relaxed">
              Upload a brokerage statement PDF or paste holdings manually. Claude
              researches every holding — allocation, income, MER, performance — then
              verifies each data point.
            </p>
          </section>

          {/* ── Upload / Paste tabs ── */}
          <section>
            <Tabs defaultValue="upload" className="w-full">
              {/* Tab list — sized to fit, centered */}
              <div className="flex justify-center mb-6">
                <TabsList className="h-10 gap-1 rounded-xl bg-muted/60 p-1">
                  <TabsTrigger
                    value="upload"
                    className="h-8 rounded-lg px-5 text-sm font-medium data-active:bg-card data-active:text-foreground data-active:shadow-sm"
                  >
                    Upload PDF
                  </TabsTrigger>
                  <TabsTrigger
                    value="paste"
                    className="h-8 rounded-lg px-5 text-sm font-medium data-active:bg-card data-active:text-foreground data-active:shadow-sm"
                  >
                    Paste Holdings
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Panel wrapper — glass card */}
              <div className="glass rounded-2xl p-6 sm:p-8 shine-border">
                <TabsContent value="upload">
                  <UploadZone />
                </TabsContent>
                <TabsContent value="paste">
                  <ManualInput />
                </TabsContent>
              </div>
            </Tabs>
          </section>

          {/* ── Feature badges ── */}
          <section aria-label="Features" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="glass rounded-xl p-4 hover-lift shine-border flex flex-col gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-3.5 text-primary" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </section>

        </div>
      </main>
    </>
  )
}
