export type ProjectStatus = "LIVE" | "IN PROGRESS" | "ARCHIVED";
export type DeviceType = "phone" | "laptop";

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
  deviceType: DeviceType;
  screenTexture: string;
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
    deviceType: "phone",
    screenTexture: "/projects/daily-roman/screen.png",
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
    deviceType: "laptop",
    screenTexture: "/projects/shopify-app/screen.png",
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
    deviceType: "laptop",
    screenTexture: "/projects/ai-automation/screen.png",
  },
  {
    slug: "shakedown",
    issueNumber: 4,
    name: "Shakedown",
    description:
      "Claude Code skill that maps every user interaction, finds test gaps, and writes tests to close them with parallel agents.",
    longDescription:
      "Automated test generation for any codebase using Claude Code. Shakedown maps every user interaction in your app, catalogs existing coverage, prioritizes uncovered paths by risk, and dispatches parallel agents to write tests in rounds. Named after the nautical term — a thorough test of a new ship before it sets sail. Took a real Expo/React Native app from 224 to 474 tests in a single session.",
    tags: ["Claude Code", "AI Agents", "Testing"],
    status: "LIVE",
    screenshot: "/projects/project-04.png",
    images: [
      "/projects/shakedown/screen-01.png",
      "/projects/shakedown/screen-02.png",
      "/projects/shakedown/screen-03.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/shakedown" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/shakedown/screen.png",
  },
  {
    slug: "trailmix",
    issueNumber: 5,
    name: "Trailmix",
    description:
      "Meeting intelligence platform — syncs notes from Granola, tasks from Monday.com, and threads from Slack into one dashboard.",
    longDescription:
      "More than just Granola. Trailmix pulls meeting notes, action items, and context from Granola, Monday.com, and Slack into a unified activity dashboard. Features encrypted credential storage, background sync workers, onboarding flows, and a 3D landing experience. Built with Next.js, Drizzle ORM, and NextAuth for multi-provider authentication.",
    tags: ["Next.js", "Drizzle", "Slack API", "Three.js"],
    status: "IN PROGRESS",
    screenshot: "/projects/project-05.png",
    images: [
      "/projects/trailmix/screen-01.png",
      "/projects/trailmix/screen-02.png",
      "/projects/trailmix/screen-03.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/trailmix" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/trailmix/screen.png",
  },
  {
    slug: "web-tracker-scanner",
    issueNumber: 6,
    name: "AI Web Tracker Scanner",
    description:
      "HIPAA compliance auditor that crawls healthcare sites, detects 200+ tracking pixels, and flags PHI privacy risks.",
    longDescription:
      "A HIPAA compliance auditing platform that automatically detects third-party tracking pixels on healthcare websites. Crawls medical pages using headless Playwright, captures outgoing network requests, and matches them against a database of 200+ known trackers — flagging privacy risks, PHI collection, and BAA support gaps. Uses AI-powered URL classification to triage medical vs. non-medical pages, and generates compliance summaries per domain.",
    tags: ["FastAPI", "React", "Playwright", "Gemini"],
    status: "LIVE",
    screenshot: "/projects/project-06.png",
    images: [
      "/projects/web-tracker-scanner/screen-01.png",
      "/projects/web-tracker-scanner/screen-02.png",
      "/projects/web-tracker-scanner/screen-03.png",
    ],
    links: [
      { label: "Live", url: "https://ai-web-tracker-scanner.fly.dev" },
      { label: "Source", url: "https://github.com/alexandermazza/AI-Web-Tracker-Scanner" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/web-tracker-scanner/screen.png",
  },
  {
    slug: "kalshi-trader",
    issueNumber: 7,
    name: "Kalshi Weather Trader",
    description:
      "Autonomous trading bot for Kalshi prediction markets — multi-source weather forecasting, probability analysis, and real-money execution.",
    longDescription:
      "An autonomous weather temperature trading bot for Kalshi prediction markets. Pulls multi-source forecasts from NWS, HRRR, GFS, and ECMWF ensembles, calculates probability distributions for temperature buckets, and places maker NO orders when edge exceeds thresholds. Features BTC latency arbitrage, Claude-powered agent scanning every 30 minutes, position recovery, and a Flask dashboard with real-time P&L tracking.",
    tags: ["Python", "SQLAlchemy", "MCP", "Trading"],
    status: "LIVE",
    screenshot: "/projects/project-07.png",
    images: [
      "/projects/kalshi-trader/screen-01.png",
      "/projects/kalshi-trader/screen-02.png",
      "/projects/kalshi-trader/screen-03.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/Kahshi-Trader" },
    ],
    deviceType: "phone",
    screenTexture: "/projects/kalshi-trader/screen.png",
  },
  {
    slug: "kalshi-mcp",
    issueNumber: 8,
    name: "Kalshi Trading MCP",
    description:
      "Full-featured MCP server for Kalshi with 20+ tools — weather forecasting, ensemble analysis, safety controls, and position management.",
    longDescription:
      "A pip-installable Model Context Protocol server for Kalshi prediction markets. Goes beyond thin API wrappers with 20+ tools covering account management, market analysis, order execution, multi-source weather forecasting, ensemble model analysis, real-time METAR observations, and position drift monitoring. Includes safety controls like price caps, daily limits, cash reserves, and NO-only strategy enforcement.",
    tags: ["Python", "MCP", "Kalshi API", "Weather"],
    status: "LIVE",
    screenshot: "/projects/project-08.png",
    images: [
      "/projects/kalshi-mcp/screen-01.png",
      "/projects/kalshi-mcp/screen-02.png",
      "/projects/kalshi-mcp/screen-03.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/kalshi-trading-mcp" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/kalshi-mcp/screen.png",
  },
  {
    slug: "semrush-enricher",
    issueNumber: 9,
    name: "Semrush Enricher",
    description:
      "Batch domain traffic enrichment tool — reads HubSpot exports, calls the Semrush API, and outputs enriched CSVs.",
    longDescription:
      "A web tool that enriches company domains from HubSpot exports with traffic data from the Semrush API. Upload a CSV of up to 1,000 domains, paste your Semrush API key, and get back enriched traffic metrics in batches of 200. Deployed as a Flask app with a static frontend, Docker support, and one-click deploy options for Render and Cloud Run. API keys are used per-request and never stored.",
    tags: ["Python", "Flask", "Semrush API", "HubSpot"],
    status: "LIVE",
    screenshot: "/projects/project-09.png",
    images: [
      "/projects/semrush-enricher/screen-01.png",
      "/projects/semrush-enricher/screen-02.png",
      "/projects/semrush-enricher/screen-03.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/semrush-enricher" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/semrush-enricher/screen.png",
  },
  {
    slug: "f1-globe",
    issueNumber: 10,
    name: "F1 Globe Calendar",
    description:
      "Interactive 3D globe showing every race on the Formula 1 2024 calendar. Inspired by the GitHub Globe.",
    longDescription:
      "An interactive 3D globe that visualizes all race locations for the Formula 1 2024 season in order. Spin the globe, see each Grand Prix pinned to its real-world coordinates, and trace the season's journey across continents. Built with vanilla JavaScript and WebGL, inspired by the GitHub Globe.",
    tags: ["JavaScript", "WebGL", "Three.js"],
    status: "ARCHIVED",
    screenshot: "/projects/project-10.png",
    images: [
      "/projects/f1-globe/screen-01.png",
      "/projects/f1-globe/screen-02.png",
      "/projects/f1-globe/screen-03.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/f1-globe-calendar" },
    ],
    deviceType: "phone",
    screenTexture: "/projects/f1-globe/screen.png",
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
