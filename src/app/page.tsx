import dynamic from "next/dynamic"
import { projects } from "@/data/projects"

const DepthGallery = dynamic(
  () =>
    import("@/components/DepthGallery/DepthGallery").then((mod) => ({
      default: mod.DepthGallery,
    })),
  { ssr: false }
)

export default function Home() {
  return (
    <main>
      <DepthGallery projects={projects} />
    </main>
  )
}
