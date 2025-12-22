import { BottomNav } from "@/components/bottom-nav"
import { ThreeRealms } from "@/components/three-realms"
import { CourseHeader } from "@/components/course-header"

export default function CoursePage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <CourseHeader />
      <ThreeRealms />
      <BottomNav />
    </main>
  )
}
