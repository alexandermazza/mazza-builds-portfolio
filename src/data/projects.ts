import type { GalleryProject } from "@/components/DepthGallery/types"

export const projects: GalleryProject[] = [
  {
    issueNumber: 1,
    name: "Daily Roman",
    description:
      "Duolingo-style iOS app for ancient Roman history. Spaced repetition, streak tracking, and bite-sized lessons.",
    tags: ["Swift", "SwiftUI", "Core Data"],
    status: "IN PROGRESS",
    screenshot: "/projects/project-01.png",
    position: { x: -0.8 },
  },
  {
    issueNumber: 2,
    name: "Shopify App",
    description:
      "Merchant toolkit for automated product tagging and inventory workflows.",
    tags: ["Next.js", "Shopify API", "Prisma"],
    status: "LIVE",
    screenshot: "/projects/project-02.png",
    position: { x: 0.7 },
  },
  {
    issueNumber: 3,
    name: "AI Automation Systems",
    description:
      "Content pipeline using Claude API, HeyGen, and ElevenLabs for automated video production.",
    tags: ["Claude API", "HeyGen", "ElevenLabs"],
    status: "ARCHIVED",
    screenshot: "/projects/project-03.png",
    position: { x: -0.6 },
  },
]
