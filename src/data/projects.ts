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
  video?: string;
  videos?: string[];
  images: string[];
  links: { label: string; url: string }[];
  deviceType: DeviceType;
  screenTexture: string;
  screenBgColor?: string;
  screenTextureScale?: number;
}

export const projects: Project[] = [
  {
    slug: "trailmix",
    issueNumber: 1,
    name: "Trailmix",
    description:
      "Converts Granola meeting notes into actionable tasks routed to monday.com or Slack with AI-powered extraction and confidence scoring.",
    longDescription:
      "Trailmix automatically extracts action items from Granola meeting transcripts using LLM-powered validation with confidence scoring, deduplicates them, and delivers them to Slack with approve/reject buttons that optionally create monday.com items on approval. A background worker polls every 30 seconds with circuit breaker protection and encrypted credential storage. Built with Next.js, Drizzle ORM, and NextAuth with a 3D landing page.",
    tags: ["Next.js", "Drizzle", "Slack API", "monday.com"],
    status: "LIVE",
    screenshot: "/projects/trailmix/screen.png",
    images: [
      "/projects/trailmix/trailmixhome.jpg",
      "/projects/trailmix/trailmixslack.jpg",
    ],
    links: [
      { label: "Live", url: "https://trailmix.fly.dev" },
      { label: "Source", url: "https://github.com/alexandermazza/trailmix" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/trailmix/screen.png",
  },
  {
    slug: "daily-roman",
    issueNumber: 2,
    name: "Daily Roman",
    description:
      "AI-powered iOS app that delivers a new ancient Roman history fact every day with interactive quizzes and spaced repetition.",
    longDescription:
      "Roma Quotidiana delivers AI-generated daily facts with a 3D coin flip mechanic, Latin-to-English morphing animations, and deep customization across 8 historical eras and 18 topics. Features a Leitner-based spaced repetition quiz system with 6 question types, a scholar progression from Tiro to Imperator, an interactive map of the Roman Empire, and iOS home screen widgets. Live on the App Store.",
    tags: ["React Native", "Expo", "TypeScript"],
    status: "LIVE",
    screenshot: "/projects/daily-roman/screen.png",
    video: "/projects/daily-roman/video.mp4",
    images: [
      "/projects/daily-roman/image-01.png",
      "/projects/daily-roman/image-02.png",
      "/projects/daily-roman/image-03.png",
      "/projects/daily-roman/image-04.png",
    ],
    links: [
      { label: "App Store", url: "https://apps.apple.com/mx/app/daily-roman-ancient-history/id6759132785?l=en-GB" },
    ],
    deviceType: "phone",
    screenTexture: "/projects/daily-roman/screen.png",
  },
  {
    slug: "shopify-app",
    issueNumber: 3,
    name: "ShopAI",
    description:
      "Shopify theme extension that adds AI-powered product Q&A and review summarization to product pages.",
    longDescription:
      "ShopAI lets shoppers ask natural language questions about any product and get context-aware answers powered by OpenAI, while AI review summaries highlight key sentiment so buyers skip the scroll. Store owners customize the AI with brand voice, policies, and product context for personalized responses. Installs as a no-code Theme App Extension with a fully customizable UI.",
    tags: ["Remix", "Shopify", "OpenAI", "Prisma"],
    status: "LIVE",
    screenshot: "/projects/shopify-app/screen.png",
    videos: [
      "/projects/shopify-app/askmeanything.mp4",
      "/projects/shopify-app/reviewsummary.mp4",
      "/projects/shopify-app/addtoshop.mp4",
    ],
    images: [],
    links: [
      { label: "Live", url: "https://shop-ai.co/" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/shopify-app/screen.png",
  },
  {
    slug: "vendor-fingerprint",
    issueNumber: 4,
    name: "Vendor Fingerprint",
    description:
      "7-stage detection pipeline that identifies which scheduling software healthcare companies use — static fingerprinting, headless browsing, and AI verification.",
    longDescription:
      "Given a list of company domains, Vendor Fingerprint resolves homepages, extracts HTML signals, discovers booking links, and fingerprints them against 37+ known vendors like MyChart, Zocdoc, and Calendly. When static analysis falls short, it escalates to headless Chromium via Playwright to capture live network requests, then to a two-tier Claude agent where Haiku gathers signals and Sonnet reasons over the evidence. Each result includes vendor identification, confidence score, booking modality, evidence trail, and the discovered booking URL.",
    tags: ["Python", "Playwright", "Claude API"],
    status: "LIVE",
    screenshot: "/projects/vendor-fingerprint/screen.png",
    images: [
      "/projects/vendor-fingerprint/image.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/booking-vendor-scraper" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/vendor-fingerprint/screen.png",
  },
  {
    slug: "shakedown",
    issueNumber: 5,
    name: "Shakedown",
    description:
      "Claude Code skill that maps every user interaction in your app, finds test gaps, and dispatches parallel agents to close them.",
    longDescription:
      "Shakedown systematically maps every user interaction, catalogs existing coverage, prioritizes uncovered paths by risk, and dispatches 3-5 parallel agents to write tests in rounds — pure functions first, then stateful code with mocking. Works with any stack including Next.js, React Native, Django, Rails, and Go. Named after the nautical term for a thorough test of a new ship — took a real Expo app from 224 to 474 tests in a single session.",
    tags: ["Claude Code", "AI Agents", "Testing"],
    status: "LIVE",
    screenshot: "/projects/shakedown/screen.png",
    images: [
      "/projects/shakedown/image.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/shakedown" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/shakedown/shakedown.png",
  },
  {
    slug: "web-tracker-scanner",
    issueNumber: 6,
    name: "AI Web Tracker Scanner",
    description:
      "HIPAA compliance platform that crawls healthcare sites, detects 200+ tracking pixels, and flags PHI privacy risks with AI-powered classification.",
    longDescription:
      "Crawls medical pages using headless Playwright, captures outgoing network requests, and matches them against a database of 200+ known trackers — flagging privacy risks, PHI collection, and BAA support gaps. Uses Gemini-powered URL classification to triage medical vs. non-medical pages and generates compliance summaries per domain. Features a React dashboard, PDF report generation, HubSpot integration, and CSV batch scanning.",
    tags: ["FastAPI", "React", "Playwright", "Gemini"],
    status: "LIVE",
    screenshot: "/projects/web-tracker-scanner/screen.png",
    video: "/projects/web-tracker-scanner/video.mov",
    images: [
      "/projects/web-tracker-scanner/scannerhome.jpg",
      "/projects/web-tracker-scanner/scannerscan.jpg",
      "/projects/web-tracker-scanner/scannerstats.jpg",
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
      "Autonomous trading bot for Kalshi prediction markets — multi-source weather forecasting, probability analysis, and real-money order execution.",
    longDescription:
      "Pulls multi-source forecasts from NWS, HRRR, GFS, and ECMWF ensembles, calculates probability distributions for temperature buckets, and places maker NO orders when edge exceeds thresholds. Claude-powered agents scan markets every 30 minutes with position recovery and risk management, plus a BTC latency arbitrage strategy that reacts to Coinbase WebSocket price moves. Includes a Flask dashboard with real-time P&L tracking and an automated feedback loop for strategy self-improvement.",
    tags: ["Python", "Claude API", "MCP", "Flask"],
    status: "LIVE",
    screenshot: "/projects/kalshi-trader/screen.png",
    images: [
      "/projects/kalshi-trader/image.png",
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
      "Pip-installable MCP server for Kalshi with 20+ tools — weather forecasting, ensemble analysis, safety controls, and two-step order confirmation.",
    longDescription:
      "Goes beyond thin API wrappers with 20+ tools covering account management, market analysis, order execution, multi-source weather forecasting (NWS, HRRR, GFS, ECMWF), real-time METAR observations, and position drift monitoring. Includes safety controls like price caps, daily limits, cash reserves, NO-only strategy enforcement, and two-step order confirmation to prevent accidental trades. Supports 8 cities with cross-city correlation analysis and AFD change detection.",
    tags: ["Python", "FastMCP", "Kalshi API"],
    status: "LIVE",
    screenshot: "/projects/kalshi-mcp/screen.png",
    images: [
      "/projects/kalshi-mcp/image.png",
    ],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/kalshi-trading-mcp" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/kalshi-mcp/kalshi-trading-mcp.png",
  },
  {
    slug: "semrush-enricher",
    issueNumber: 9,
    name: "Semrush Enricher",
    description:
      "Web tool that enriches HubSpot domain exports with Semrush traffic data — upload a CSV, paste your API key, get enriched metrics back.",
    longDescription:
      "Upload a CSV of up to 1,000 company domains from a HubSpot export, paste your Semrush API key, and get back enriched traffic metrics processed in batches of 200. Deployed as a Flask app with Docker support and one-click deploy options for Render and Google Cloud Run. API keys are used per-request only and never stored or logged.",
    tags: ["Python", "Flask", "Semrush API", "HubSpot"],
    status: "LIVE",
    screenshot: "/projects/semrush-enricher/screen.png",
    images: [
      "/projects/semrush-enricher/semrush.jpg",
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
      "Interactive 3D globe visualizing every race location on the Formula 1 2026 calendar, inspired by the GitHub Globe.",
    longDescription:
      "Spin the globe to see each Grand Prix pinned to its real-world coordinates and trace the F1 2026 season's journey across continents in order. Updated yearly. Built with vanilla JavaScript, Three.js, and WebGL as a visual exploration of geographic data on a 3D sphere. Inspired by the GitHub contribution globe.",
    tags: ["JavaScript", "Three.js", "WebGL"],
    status: "LIVE",
    screenshot: "/projects/f1-globe/F1-Logo-PNG-Image.png",
    images: [
      "/projects/f1-globe/newimage.png",
    ],
    links: [
      { label: "Live", url: "https://f1-globe-calendar.vercel.app/" },
      { label: "Source", url: "https://github.com/alexandermazza/f1-globe-calendar" },
    ],
    deviceType: "laptop",
    screenTexture: "/projects/f1-globe/F1-Logo-PNG-Image.png",
    screenBgColor: "#FFFFFF",
    screenTextureScale: 0.6,
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
