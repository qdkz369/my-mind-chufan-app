import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle } from "lucide-react"

const posts = [
  {
    author: "静心",
    avatar: "/portrait-asian-woman-peaceful-meditation.jpg",
    time: "2小时前",
    content: "今日金顶观日出，云海翻涌如梦似幻。那一刻，仿佛与天地融为一体，所有烦恼都消散在晨光中。",
    image: "/golden-sunrise-above-sea-of-clouds-mountain-peak-b.jpg",
    likes: 42,
    comments: 8,
  },
  {
    author: "行者",
    avatar: "/portrait-asian-man-calm-meditation.jpg",
    time: "5小时前",
    content: "在华首门前静坐，感受迦叶尊者的加持。千年古刹，依然散发着宁静的力量。",
    image: "/ancient-buddhist-temple-door-stone-architecture-yu.jpg",
    likes: 28,
    comments: 5,
  },
]

export function FellowSeekers() {
  return (
    <section className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 font-serif text-2xl font-light tracking-wide text-foreground">同修心语</h2>

        <div className="space-y-6">
          {posts.map((post, index) => (
            <Card key={index} className="overflow-hidden p-6">
              <div className="mb-4 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={post.avatar || "/placeholder.svg"} alt={post.author} />
                  <AvatarFallback>{post.author[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-light text-foreground">{post.author}</p>
                  <p className="text-xs font-light text-muted-foreground">{post.time}</p>
                </div>
              </div>

              <p className="mb-4 font-light leading-relaxed text-foreground">{post.content}</p>

              {post.image && (
                <div className="mb-4 overflow-hidden rounded-lg">
                  <img src={post.image || "/placeholder.svg"} alt="分享图片" className="h-64 w-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-6 border-t border-border pt-4">
                <button className="flex items-center gap-2 text-sm font-light text-muted-foreground transition-colors hover:text-foreground">
                  <Heart className="h-4 w-4" />
                  <span>{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-sm font-light text-muted-foreground transition-colors hover:text-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comments}</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
