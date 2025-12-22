import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Clock } from "lucide-react"

const experiences = [
  {
    title: "藏茶茶道体验",
    location: "鸡足山茶舍",
    duration: "2小时",
    image: "/tibetan-tea-ceremony-yunnan-traditional-teapot.jpg",
    description: "在古茶舍中体验藏族茶道文化，品味普洱与酥油茶的禅意",
  },
  {
    title: "金顶日出徒步",
    location: "鸡足山金顶",
    duration: "3小时",
    image: "/jizu-mountain-golden-summit-sunrise-buddhist-templ.jpg",
    description: "凌晨登顶，在佛光普照中迎接新生的太阳",
  },
  {
    title: "非遗扎染工坊",
    location: "周城古镇",
    duration: "半天",
    image: "/traditional-chinese-tie-dye-indigo-blue-fabric-yun.jpg",
    description: "跟随白族匠人学习传统扎染技艺，亲手创作独特作品",
  },
]

export function LocalExperiences() {
  return (
    <section className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 font-serif text-2xl font-light tracking-wide text-foreground">在地体验</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {experiences.map((exp, index) => (
            <Card key={index} className="group overflow-hidden transition-all hover:shadow-lg">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={exp.image || "/placeholder.svg"}
                  alt={exp.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <h3 className="absolute bottom-4 left-4 font-serif text-xl font-light text-white">{exp.title}</h3>
              </div>

              <div className="p-4">
                <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{exp.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{exp.duration}</span>
                  </div>
                </div>
                <p className="mb-4 text-sm font-light leading-relaxed text-muted-foreground">{exp.description}</p>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  了解详情
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
