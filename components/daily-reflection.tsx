import { Card } from "@/components/ui/card"

export function DailyReflection() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 font-serif text-3xl font-light tracking-wide text-foreground">每日省思</h2>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/5 to-accent/5 p-8 shadow-lg">
          {/* 水墨画装饰 */}
          <div className="absolute right-0 top-0 h-48 w-48 opacity-10">
            <img src="/minimalist-chinese-ink-brush-painting-bamboo.jpg" alt="水墨竹" className="h-full w-full object-contain" />
          </div>

          <div className="relative z-10">
            <p className="mb-2 text-xs font-light uppercase tracking-widest text-muted-foreground">儒家智慧</p>
            <blockquote className="font-serif text-2xl font-light leading-relaxed text-foreground md:text-3xl">
              "吾日三省吾身"
            </blockquote>
            <p className="mt-6 text-sm font-light leading-relaxed text-muted-foreground">
              每天反省自己的言行，是否忠诚待人、是否用心交友、是否践行所学。
              在鸡足山的静谧中，让我们回归内心，觉察真实的自己。
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <p className="text-xs font-light text-muted-foreground">《论语·学而》</p>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
