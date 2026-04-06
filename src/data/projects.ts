export type ProjectStatus = "LIVE" | "IN PROGRESS" | "ARCHIVED";

export interface Project {
  slug: string;
  issueNumber: number;
  name: string;
  description: string;
  longDescription: string;
  tags: string[];
  status: ProjectStatus;
  screenshot: string;
  images: string[];
  links: { label: string; url: string }[];
}

export const projects: Project[] = [
  {
    slug: "daily-roman",
    issueNumber: 1,
    name: "Daily Roman",
    description:
      "Duolingo-style iOS app for ancient Roman history. Spaced repetition, streak tracking, and bite-sized lessons.",
    longDescription:
      "Daily Roman brings ancient Roman history to life through gamified learning. Built in Swift with SwiftUI, the app uses spaced repetition algorithms to help users retain historical facts, dates, and cultural knowledge. Features include streak tracking, daily challenges, and a progression system that unlocks new historical periods as you advance.",
    tags: ["Swift", "SwiftUI", "Core Data"],
    status: "IN PROGRESS",
    screenshot: "/projects/project-01.png",
    images: [
      "/projects/daily-roman/screen-01.png",
      "/projects/daily-roman/screen-02.png",
      "/projects/daily-roman/screen-03.png",
    ],
    links: [
      { label: "App Store", url: "#" },
      { label: "Source", url: "#" },
    ],
  },
  {
    slug: "shopify-app",
    issueNumber: 2,
    name: "Shopify App",
    description:
      "Merchant toolkit for automated product tagging and inventory workflows.",
    longDescription:
      "A Shopify embedded app that automates repetitive merchant tasks. Uses the Shopify Admin API to batch-process product tags, sync inventory levels across locations, and generate reports. Built with Next.js for the frontend and Prisma for data persistence, with webhook-driven event processing for real-time updates.",
    tags: ["Next.js", "Shopify API", "Prisma"],
    status: "LIVE",
    screenshot: "/projects/project-02.png",
    images: [
      "/projects/shopify-app/screen-01.png",
      "/projects/shopify-app/screen-02.png",
      "/projects/shopify-app/screen-03.png",
    ],
    links: [
      { label: "Shopify App Store", url: "#" },
      { label: "Source", url: "#" },
    ],
  },
  {
    slug: "ai-automation",
    issueNumber: 3,
    name: "AI Automation Systems",
    description:
      "Content pipeline using Claude API, HeyGen, and ElevenLabs for automated video production.",
    longDescription:
      "An end-to-end content automation pipeline that transforms written briefs into finished video content. Claude API generates scripts and storyboards, ElevenLabs produces voiceovers, and HeyGen creates avatar-driven video presentations. The system orchestrates the entire workflow with error handling, quality checks, and output formatting for multiple platforms.",
    tags: ["Claude API", "HeyGen", "ElevenLabs"],
    status: "ARCHIVED",
    screenshot: "/projects/project-03.png",
    images: [
      "/projects/ai-automation/screen-01.png",
      "/projects/ai-automation/screen-02.png",
      "/projects/ai-automation/screen-03.png",
    ],
    links: [
      { label: "Demo", url: "#" },
      { label: "Source", url: "#" },
    ],
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
