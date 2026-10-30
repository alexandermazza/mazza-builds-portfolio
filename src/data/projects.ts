/** 9 to 5 (built at the day job) or 5 to 9 (built after hours). */
export type Half = "day" | "night";
/** Bento cells: xl 2x2, wide 2x1, tall 1x2, sm 1x1 on a 4-column grid. */
export type Bento = "xl" | "wide" | "tall" | "sm";
export type Mark =
  | { type: "stencil"; src: string }
  | { type: "vector"; viewBox: string; paths: string[] }
  | { type: "icon"; name: "web-tracker-scanner" | "kalshi-trader" | "kalshi-mcp" | "shakedown" | "roi-calculator" };

export interface Project {
  slug: string;
  half: Half;
  name: string;
  kind: string;
  line: string;
  what: string;
  why: string;
  impact: string;
  /** The big figure on the story page and what it counts. */
  stat?: [string, string];
  /** The story page's visit link: label, then url. */
  link?: [string, string];
  /** The tile colour, the one tone its mark is drawn in, and the caption colour. */
  fill: string;
  markColor: string;
  textColor: string;
  bento: Bento;
  mark: Mark;
  /** Draws the stencil smaller when its source is low resolution. */
  markScale?: number;
  image?: string;
  video?: string;
  poster?: string;
  /** The technical write-up under "Under the hood". */
  context: string;
  build: string;
  result: string;
  tags: string[];
  links: { label: string; url: string }[];
}

// Day then night, each in the order the projects page shows them
export const projects: Project[] = [
  {
    slug: "distill",
    half: "day",
    name: "Distill",
    kind: "Internal app at Freshpaint",
    line: "All of the sales team's numbers in one place, written in plain English.",
    what:
      "Distill pulls together everything the company knows about its customers, from the sales system to recorded sales calls to the open web, and turns it into dashboards and short written briefings. The CEO, sales, marketing and account managers each get a view built for the calls they make.",
    why:
      "Before, every question meant a spreadsheet and hours of reading call transcripts, and two people could pull two different answers to the same question. Distill gives everyone the same numbers, defined the same way, and writes the summary for them.",
    impact:
      "An account plan that took hours of reading now takes about a minute, and the leadership briefing rewrites itself four times every weekday.",
    stat: ["1 min", "to build an account plan that used to take hours"],
    fill: "#6b4eff",
    markColor: "#ffffff",
    textColor: "#ffffff",
    bento: "xl",
    mark: { type: "stencil", src: "/projects/distill/stencil.png" },
    video: "/projects/distill/clip.mp4",
    poster: "/projects/distill/poster.jpg",
    context:
      "Freshpaint's revenue data is complete and nearly unusable. Deals live in HubSpot, call transcripts live in Gong, and competitive context lives on the open web, but none of them answer the questions the business actually asks: are we on pace this quarter, how much pipeline is left to find, and what did buyers say they wanted. Every answer meant a manual CRM pull, a spreadsheet, and hours of reading transcripts, and two people picking two definitions of the same word produced numbers that couldn't be reconciled.",
    build:
      "One Node/TypeScript and React service on a single Fly.io machine with no database: in-process cron jobs compute dashboard snapshots to JSON on a volume, and the routes serve the files. Every document-producing call pairs a prompt builder with a Zod schema, and a response that fails validation goes back to Claude once with the error before the call gives up. Models are picked per call, so routine transcript summarization runs on Haiku and only judgment-heavy work reaches Opus, with the shared account context prompt-cached across nine parallel section calls. The account-plan pipeline fans out across HubSpot, Gong, web research, and ad libraries, streams progress over SSE, and repairs the generated org chart in code rather than trusting the model with tree structure. The metric definitions got as much work as the model calls: pace against a prorated goal instead of raw attainment, coverage against the quota still to find, and report totals that throw rather than ship if they don't reconcile. Every integration is read-only, so nothing the system infers can touch the CRM.",
    result:
      "Live on Fly.io behind Google sign-in restricted to Freshpaint. Sales, account management, marketing, and field each get a view shaped for their decision off one data spine, the CRO briefing regenerates four times every weekday, and an account plan that used to take hours of transcript reading now takes about a minute.",
    tags: ["TypeScript", "Claude API", "HubSpot", "Gong"],
    links: [],
  },
  {
    slug: "path",
    half: "day",
    name: "Path",
    kind: "Internal app at Freshpaint",
    line: "Shows sales who's warming up and what to do next, and shows marketing what works.",
    what:
      "Path gathers every email, form, website visit, ad click and meeting with each target account into one timeline. It scores how warm every account is right now, tells each rep who to reach out to today and what to do next, and shows marketing which content actually comes before demos and deals.",
    why:
      "Every rep had about 40 accounts and no way to see which ones were warming up. The paid tool Path replaced was hard to set up and never answered the question marketing cared about most: did the ads lead to demos? Now sales and marketing work from the same picture.",
    impact:
      "Tested against past deals, the accounts Path ranks warmest turned into deals 9.5 times as often as average, so a rep's list for the day is one worth working.",
    stat: ["9.5x", "as likely to turn into a deal, for the accounts Path ranks warmest"],
    fill: "#ff8b3d",
    markColor: "#2e1400",
    textColor: "#261100",
    bento: "xl",
    mark: { type: "stencil", src: "/projects/path/stencil.png" },
    video: "/projects/path/clip.mp4",
    poster: "/projects/path/poster.jpg",
    context:
      "Freshpaint's marketing and sales touches lived in HubSpot as millions of disconnected events: emails, form fills, page views, ad impressions, meetings. Reps managing about 40 accounts each had no way to tell which were warming up, and the paid attribution tool the team used was hard to set up and never answered whether ad impressions led to demo requests. When its subscription lapsed, the per-account timeline was the part worth keeping, and Path rebuilds it in-house.",
    build:
      "A Next.js 15 and React 19 app on Fly.io, with a separate worker that syncs HubSpot into Postgres every night in 13 read-only phases: about 2.6 million touchpoints of 25 types across roughly 19,600 accounts. Warmth is a sum of decaying touches, each type weighted with its own half-life (21 days for a page view, 90 for a meeting), and the weights live in a config table so a week-over-week change is only ever compared against a night scored the same way. The next-move list is deterministic, with no LLM in the loop: plays are ranked by the lower bound of their measured lift, and each carries a one-line reason. Lift compares converting accounts against matched controls on tier, activity and date window, with a 95% interval on every figure, across four goals from demo requests to closed won, and a fixed 10% holdout never sees recommendations so their effect can be measured. LLMs stay at the edges: Gemini classifies forms and content offline for human review, and an SDR research hub runs in the worker on a capped budget. A build check fails if any code outside one module can reach HubSpot, so nothing Path computes can write to the CRM.",
    result:
      "Live on Fly.io behind Freshpaint's Google sign-in. Sales gets a warmth-ranked account list, a weekly list of who moved and a timeline for every account; marketing gets a scorecard of which content lifts each goal. In a backtest over 24,631 account snapshots, the warmest tenth of accounts converted at 9.5 times the base rate, and the scoring weights only change when a challenger beats them on held-out data.",
    tags: ["Next.js", "Postgres", "HubSpot", "OpenRouter"],
    links: [],
  },
  {
    slug: "roi-calculator",
    half: "day",
    name: "ROI Calculator",
    kind: "Internal app at Freshpaint",
    line: "Turns a prospect's numbers into a business case deck, and an order form when they're ready to sign.",
    what:
      "A rep types in a prospect's numbers and the calculator works out what Freshpaint is worth to them: revenue won back, risk taken off the table, tools they can drop. Those numbers fill a client-ready slide deck that AI helps write, and when the deal is ready, an order form priced from the same package.",
    why:
      "A business case used to take a rep days of spreadsheets and slides, and decks written with general AI tools went out with numbers that were simply wrong. Here every number comes from the calculator, and the AI is never allowed to write one.",
    impact:
      "From discovery call to client-ready business case in one sitting, with every figure in the deck traceable back to the calculator.",
    stat: ["0", "numbers written by the AI. Every figure in the deck comes from the calculator"],
    fill: "#85d7bf",
    markColor: "#01232d",
    textColor: "#01232d",
    bento: "xl",
    mark: { type: "icon", name: "roi-calculator" },
    video: "/projects/roi-calculator/clip.mp4",
    poster: "/projects/roi-calculator/poster.jpg",
    context:
      "Business cases are the sales team's most important asset on any serious deal, and they were being built by hand: a spreadsheet for the math, slides for the story, and a general-purpose AI assistant to write it up. That assistant couldn't do math reliably, so decks reached prospects with wrong numbers.",
    build:
      "A FastAPI service on Fly.io in three environments, each with its own Postgres, behind Freshpaint's Google sign-in. The brief pulls the deal from HubSpot and call transcripts from Gong, and Claude extracts each figure together with the quote it came from. The ROI model is one pure function over four value levers (revenue growth through the funnel, retention, risk and tool consolidation), across 11 healthcare sub-verticals and three scenarios, with risk scaled from eight real pixel-tracking settlements. Decks are built from 21 HTML slide templates with fixed text slots and character budgets: Claude Opus writes the copy section by section, but numbers only ever appear as placeholders the calculator fills in, and a server-side guard rejects any stray quantity in the model's output. Text that overflows its box is shortened, export is blocked until everything fits, and headless Chromium renders each slide to PDF and PPTX, with the model exported to Excel with live formulas. Pricing is versioned and immutable, and each deal is pinned to the version it was quoted on, so the order form always matches the business case. 910 tests, including byte-for-byte parity fixtures, gate every deploy.",
    result:
      "Live on Fly.io for Freshpaint's sales team. A rep goes from call notes to a client-ready deck, an Excel model and an order form in one sitting, and every number a prospect sees traces back to the calculator.",
    tags: ["Python", "FastAPI", "Claude API", "Playwright"],
    links: [],
  },
  {
    slug: "pipeline-attribution",
    half: "day",
    name: "Pipeline Attribution Agent",
    kind: "AI agent at Freshpaint, in testing",
    line: "Works out where each new sales deal came from.",
    what:
      "Every new deal needs a label for what brought it in: an ad, a cold email, a partner, an event. The agent reads everything known about the deal and the people on it, picks the source, and writes down why.",
    why:
      "It replaces a stack of about 15 brittle rules that grabbed the first match and broke whenever something got renamed. The agent weighs all the evidence like an analyst would, and every correction from the team makes it sharper.",
    impact:
      "It's right 76% of the time on a test set of 139 deals and goes live once it clears 80%. Then leadership gets a source report they can trust.",
    stat: ["76%", "accurate so far. It goes live at 80%"],
    fill: "#e04fd0",
    markColor: "#3b0636",
    textColor: "#2e052a",
    bento: "tall",
    mark: { type: "stencil", src: "/projects/pipeline-attribution/stencil.png" },
    context:
      "Every new sales deal at Freshpaint needs a source tag (paid ads, outbound, partnerships, and so on) so leadership can see what's actually driving revenue. The old setup was a stack of about 15 HubSpot rules that fired on the first match. They couldn't weigh competing signals, couldn't explain their decisions, and quietly broke whenever a field name changed. The result was attribution data the team didn't trust.",
    build:
      "When a new deal is created in HubSpot, the system pulls together everything known about it (the contact, the company, marketing touches, sales activity, full timeline) and hands that complete picture to Claude. The model reasons over the evidence the way an analyst would and returns a single source category along with its rationale. Whenever the sales ops team overrides a call, that correction feeds back into the agent, so it keeps getting sharper over time.",
    result:
      "Currently classifying deals at 76% accuracy on a 139-deal test set, with three of four categories already past the 80% target. The next round of tuning sharpens how the agent reads engagement history to close the last gap. Once it clears the bar, it goes live in production to replace the old rules.",
    tags: ["Python", "Claude API", "FastAPI", "HubSpot"],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/Pipeline-Attribution-Agent" },
    ],
  },
  {
    slug: "event-hub",
    half: "day",
    name: "Event Hub",
    kind: "Internal app at Freshpaint",
    line: "Shows what every company event did for sales, one quarter at a time.",
    what:
      "Every hour it pulls the whole event program, from conferences to dinners, and shows what each one did for the sales pipeline. Each event gets a card with a photo of its city and a pin on a 3D globe.",
    why:
      "The numbers the events team is judged on were scattered across five kinds of records and had to be rebuilt by hand every quarter. Now they sit on one page, already deduplicated.",
    impact:
      "The quarterly scramble of exports and spreadsheets is gone. Pick a quarter and every event is there, each number traceable to the deals behind it.",
    stat: ["Hourly", "refresh, so the numbers are always current"],
    fill: "#f2645f",
    markColor: "#3b0f0d",
    textColor: "#2d0b0a",
    bento: "wide",
    mark: { type: "stencil", src: "/projects/event-hub/stencil.png" },
    context:
      "Freshpaint's events team tracks every conference, House Call, and field event in HubSpot, but the numbers they're judged on don't live on the event record. They're scattered across events, deals, pipelines, stages, and companies, and have to be re-derived every time someone asks. Every quarterly review turned into a manual export-and-reconcile exercise.",
    build:
      "A Next.js 15 app on a single Fly.io machine. An hourly sync pulls a full HubSpot snapshot into SQLite inside one all-or-nothing transaction, then four pipeline KPIs (open, influenced, influenced revenue, created) are computed in SQL at read time, so a definition change is a one-line edit with no resync. Stage semantics come from synced pipeline metadata rather than hardcoded IDs, so a HubSpot rename can't silently break a number. Events missing a location get one inferred by a cheap-first LLM pass, each card is auto-illustrated with a license-clean city photo chosen by a vision model, and every event plots onto a WebGL globe. Google sign-in is enforced server-side and restricted to @freshpaint.io.",
    result:
      "Live and used by the team on one always-on Fly.io machine. The quarterly 'what did events do for pipeline' reconciliation is now a page: pick a quarter and every event is there with its KPIs already deduped and attributed, each number drilling down to its source deals in HubSpot.",
    tags: ["Next.js", "TypeScript", "SQLite", "HubSpot"],
    links: [],
  },
  {
    slug: "web-tracker-scanner",
    half: "day",
    name: "AI Web Tracker Scanner",
    kind: "Web app at Freshpaint",
    line: "Finds the hidden trackers on healthcare websites that can leak patient data.",
    what:
      "It visits a hospital or clinic website the way a patient would and records every tracker that fires in the background. Each one is checked against a list of more than 200 and flagged if it can collect private health information.",
    why:
      "These trackers are invisible to the people who run the site, and the privacy rules around patient data are strict. Checking by hand misses most of them. The scanner catches them and explains the risk in plain terms.",
    impact:
      "It scans one site or hundreds at once, and every finding lands in the sales team's records, so a privacy conversation starts with real evidence.",
    stat: ["200+", "trackers it knows how to spot"],
    link: ["Open the scanner", "https://ai-web-tracker-scanner.fly.dev"],
    fill: "#2ec4a6",
    markColor: "#052f27",
    textColor: "#052f27",
    bento: "wide",
    mark: { type: "icon", name: "web-tracker-scanner" },
    video: "/projects/web-tracker-scanner/clip.mp4",
    poster: "/projects/web-tracker-scanner/poster.jpg",
    context:
      "Healthcare sites routinely leak PHI through tracking pixels, and HIPAA compliance audits are manual and miss the 200+ trackers now in common use.",
    build:
      "A FastAPI backend with a React 19 dashboard that crawls medical pages with headless Chromium, captures outgoing network requests, and matches them against a database of 200+ trackers flagged for risk level, PHI collection, and BAA support. URL triage uses Gemini Flash 2.5 via OpenRouter to classify medical vs. non-medical pages before scanning. Generates per-domain compliance summaries, PDF reports, and writes findings back to HubSpot company records via webhook.",
    result:
      "Live at ai-web-tracker-scanner.fly.dev. Scans trigger single-domain from the dashboard, CSV batches up to hundreds of sites, or automatically from HubSpot.",
    tags: ["FastAPI", "React", "Playwright", "Gemini"],
    links: [
      { label: "Live", url: "https://ai-web-tracker-scanner.fly.dev" },
      { label: "Source", url: "https://github.com/alexandermazza/AI-Web-Tracker-Scanner" },
    ],
  },
  {
    slug: "vendor-fingerprint",
    half: "day",
    name: "Vendor Fingerprint",
    kind: "Research tool",
    line: "Figures out which booking software a healthcare company uses, just from its website.",
    what:
      "Give it a list of healthcare companies and it visits each website, finds the path to book an appointment, and names the scheduling software behind it, from MyChart to Zocdoc.",
    why:
      "This was slow detective work the sales team did by hand, one site at a time. Now it runs on a whole list at once, and when the clues are unclear an AI double-checks them.",
    impact:
      "Every answer comes with its evidence and a confidence score, and teaching it a new vendor takes one line instead of new code.",
    stat: ["37+", "booking vendors it recognizes"],
    fill: "#b71c2c",
    markColor: "#ffffff",
    textColor: "#ffffff",
    bento: "wide",
    mark: { type: "stencil", src: "/projects/vendor-fingerprint/stencil.png" },
    context:
      "Identifying which scheduling software a healthcare company uses is slow, manual work. Sales and BD teams need it at list scale.",
    build:
      "A 7-stage Python pipeline that resolves homepages, extracts HTML signals (script tags, iframes, form actions), discovers booking links, and fingerprints them against 37+ known vendors like MyChart, Zocdoc, and Calendly. When static analysis is uncertain, it escalates to headless Chromium via Playwright to capture live network requests, then to a two-tier Claude agent: Haiku gathers signals by visiting pages, Sonnet reasons over the evidence. Each result includes vendor, confidence score, booking modality, evidence trail, and the discovered booking URL.",
    result:
      "Explains every classification via its evidence trail. Adding a new vendor is a YAML append, not a code change.",
    tags: ["Python", "Playwright", "Claude API"],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/booking-vendor-scraper" },
    ],
  },
  {
    slug: "persona-automator",
    half: "day",
    name: "Persona Automator",
    kind: "Background service at Freshpaint",
    line: "Fills in who each sales contact is and how senior they are, on its own.",
    what:
      "Every four hours on weekdays it reads the newest contacts attached to sales deals, works out each person’s role and seniority, and fills in those two fields.",
    why:
      "Those fields are what make it possible to sort and target contacts, but filling them in by hand across thousands of people never happened. Now nobody has to.",
    impact:
      "Lists and reports start from facts instead of guesses, and the fields stay current as deals move, with nobody touching them.",
    fill: "#4e9c84",
    markColor: "#0a2a21",
    textColor: "#07201a",
    bento: "sm",
    mark: { type: "stencil", src: "/projects/persona-automator/stencil.png" },
    context:
      "Freshpaint's sales contacts in HubSpot are missing the two fields that make segmentation possible: what persona someone is and how senior they are. Filling them by hand across thousands of deal contacts doesn't scale, so the fields sit empty and every list build or report starts from a guess.",
    build:
      "A headless Python service that runs on a fly.io cron every four hours on weekdays. Each run pulls the contacts attached to Sales-pipeline deals, sends each one to an LLM through OpenRouter, and writes the predicted persona and seniority back to their HubSpot fields. The model is a single swappable env var, defaulting to a cheap Gemini Flash Lite tier and escalated by changing one slug. Classification is vertical-aware, and a dry-run mode writes predictions to a CSV for human review before anything touches HubSpot. Already-classified contacts are skipped by change detection so reruns stay cheap, and per-run and per-company caps let a change roll out as a small canary before full volume.",
    result:
      "Live on fly.io, running unattended on its weekday cron. Persona and seniority now populate themselves as deals move, instead of being a field nobody gets around to filling in.",
    tags: ["Python", "HubSpot", "LLM", "OpenRouter"],
    links: [],
  },
  {
    slug: "trailmix",
    half: "day",
    name: "Trailmix",
    kind: "Web app",
    line: "Turns meeting notes into to-do items in Slack.",
    what:
      "Trailmix watches your meeting notes, pulls out the action items, and sends each one to Slack with approve and reject buttons. Approved items can drop straight into monday.com, already assigned.",
    why:
      "The to-dos people agree to in meetings usually die in the notes. Trailmix puts them where work actually happens, seconds after the meeting ends.",
    impact:
      "Follow-ups stop slipping. It checks for new notes every 30 seconds and filters out duplicates, so the team only sees what matters.",
    stat: ["30 sec", "from meeting notes to Slack"],
    link: ["Visit trailmix.fly.dev", "https://trailmix.fly.dev"],
    fill: "#e9a23b",
    markColor: "#2e1a03",
    textColor: "#2e1a03",
    bento: "sm",
    mark: { type: "stencil", src: "/projects/trailmix/stencil.png" },
    context:
      "Granola captures rich meeting notes, but action items die inside the transcript. Nothing routes them into the tools where work actually happens.",
    build:
      "Trailmix is a Next.js 16 app with a background worker that polls Granola every 30 seconds, runs extracted action items through an LLM for confidence scoring and deduplication, then delivers them to Slack with approve/reject buttons. Approvals optionally create monday.com items via GraphQL with mapped columns, groups, and assignees. Built on Drizzle ORM, NextAuth with Google OAuth, AES-256-GCM for stored credentials, and a circuit breaker that disables polling after repeated Slack failures.",
    result:
      "Live on Fly.io with a 3D-scene landing page. Operates in two modes, monday.com routing or Slack-only delivery, selected during a multi-step onboarding flow.",
    tags: ["Next.js", "Drizzle", "Slack API", "monday.com"],
    links: [
      { label: "Live", url: "https://trailmix.fly.dev" },
      { label: "Source", url: "https://github.com/alexandermazza/trailmix" },
    ],
  },
  {
    slug: "semrush-enricher",
    half: "day",
    name: "Semrush Enricher",
    kind: "Web tool",
    line: "Adds website traffic numbers to a whole list of companies at once.",
    what:
      "Upload a spreadsheet of up to 1,000 company websites and get it back with each site’s traffic numbers filled in.",
    why:
      "Before, that meant looking up every company one at a time. Now it is one upload, and it never stores anyone’s account key.",
    impact:
      "A list of 1,000 companies comes back complete from a single upload instead of 1,000 separate lookups, so sales can start with the busiest sites.",
    stat: ["1,000", "companies in one upload"],
    fill: "#ff6a2b",
    markColor: "#2a0d00",
    textColor: "#210a00",
    bento: "sm",
    mark: { type: "stencil", src: "/projects/semrush-enricher/stencil.png" },
    context:
      "HubSpot company exports list domains but carry no traffic data. Enriching a list manually means one lookup per domain.",
    build:
      "A Flask web tool that takes a CSV of up to 1,000 HubSpot company domains plus a user-supplied Semrush API key, calls the Semrush `/trends/summary` endpoint in batches of 200, and returns an enriched CSV. API keys live in the request scope only; they are never stored or logged. Docker and one-click deploy paths for Render and Google Cloud Run.",
    result:
      "Serves traffic-enrichment runs on demand. Per-request key handling means no account setup or tenant data to manage.",
    tags: ["Python", "Flask", "Semrush API", "HubSpot"],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/semrush-enricher" },
    ],
  },
  {
    slug: "event-attributor",
    half: "day",
    name: "In-Person Event Attributor",
    kind: "Analysis tool",
    line:
      "Shows marketing which outreach got people to sign up for events, and which got them to show up.",
    what:
      "For every attendee at an in-person event, it looks back over the months before and finds the last real touch before they signed up, and again before they walked in: a rep’s follow-up, a partner, an email.",
    why:
      "Events are expensive, and without this the next event budget is a guess. Now each event has a clear breakdown of what actually pulled people in.",
    impact:
      "Marketing sees, event by event, which channels fill the sign-up list and which ones get people through the door. Adding a new event takes one line.",
    fill: "#f4d35e",
    markColor: "#3a2a00",
    textColor: "#2b1f00",
    bento: "sm",
    mark: { type: "stencil", src: "/projects/event-attributor/stencil.png" },
    context:
      "Marketing runs in-person events across cities and wants to know what's working: was it the SDR follow-up, the AE relationship, the email blast, or something else? Without an answer, the next event budget is a guess.",
    build:
      "For every attendee, the tool looks back over the months leading up to the event and finds the last meaningful touch before they registered, and again before they showed up. Each touch maps to a category like SDR, AE, Account Manager, Partners, or one of the marketing email tracks. The result is a per-attendee story and an event-level breakdown of what's pulling people in.",
    result:
      "Marketing now sees, per event, which channels drove registrations versus which ones got people through the door. Reruns are fast, evidence is auditable, and adding a new event is a one-line config change.",
    tags: ["Python", "HubSpot", "Attribution"],
    links: [],
  },
  {
    slug: "secondround",
    half: "night",
    name: "SecondRound",
    kind: "Web app, live",
    line: "Rewrites your resume for each job, using only what you've really done.",
    what:
      "Add your career once, paste in a job posting, and SecondRound rewrites your resume for that job, scores how well you fit, and has a skeptical recruiter flag what to cut.",
    why:
      "Most resumes are now read by an AI screener before a person ever sees them. SecondRound writes for that reader, and it refuses to invent experience you don't have.",
    impact:
      "It's live at secondround.app. Building a tailored resume is free, and Pro unlocks the PDF export.",
    link: ["Visit secondround.app", "https://secondround.app"],
    fill: "#0e7a5f",
    markColor: "#ffffff",
    textColor: "#ffffff",
    bento: "xl",
    mark: {
      type: "vector",
      viewBox: "355 316 471 388",
      paths: [
        "M 476.918 329.100 C 413.614 335.223, 373.631 372.232, 369.527 428.500 C 369.206 432.900, 368.704 439.538, 368.411 443.250 L 367.879 450 402.290 450 L 436.701 450 437.329 441.150 C 439.991 403.643, 459.623 385.742, 498 385.826 C 533.795 385.904, 553 402.377, 553 433 C 553 461.277, 541.247 474.828, 474.500 523.506 C 410.683 570.047, 391.885 590.949, 376.481 632.500 C 370.060 649.819, 363.442 691.842, 366.633 695.033 C 367.260 695.660, 395.432 695.920, 444.908 695.756 L 522.203 695.500 511.351 682.362 C 505.383 675.136, 494.875 662.227, 488 653.676 L 475.500 638.128 461.250 638.064 C 453.413 638.029, 447 637.683, 447 637.296 C 447 636.909, 448.988 632.521, 451.418 627.546 C 460.349 609.258, 478.604 592.766, 528.657 557.763 C 573.267 526.568, 591.437 510.661, 606.379 489.722 C 635.894 448.360, 630.607 389.656, 594.500 357.822 C 568.976 335.319, 524.628 324.486, 476.918 329.100",
        "M 810.500 417.649 C 788.321 422.268, 768.803 431.038, 737.782 450.323 C 681.393 485.379, 621.771 546.004, 573.073 617.801 C 569.603 622.916, 566.207 626.966, 565.526 626.801 C 564.149 626.466, 559.113 620.637, 541.079 598.500 C 534.358 590.250, 528.439 583.349, 527.926 583.165 C 526.325 582.592, 483.945 617.101, 484.710 618.356 C 485.094 618.985, 490.844 626.025, 497.489 634 C 504.134 641.975, 517.205 657.908, 526.536 669.408 C 535.866 680.907, 544.693 691.595, 546.151 693.158 L 548.802 696 567.279 696 C 580.869 696, 586.015 695.669, 586.738 694.750 C 587.278 694.063, 589.660 689.900, 592.032 685.500 C 619.992 633.631, 662.590 570.304, 698.314 527.500 C 721.577 499.626, 756.945 463.506, 767.606 456.733 C 769.748 455.373, 772.400 453.241, 773.500 451.997 C 778.338 446.525, 813.371 420, 815.761 420 C 816.325 420, 817.045 419.325, 817.362 418.500 C 817.945 416.979, 815.295 416.650, 810.500 417.649",
      ],
    },
    context:
      "By 2026 the first readers of any resume are LLMs: ATS parsers, screening agents, summarize-this-candidate copilots. Most resume tools still optimize for the human reader and treat the AI layer as an afterthought.",
    build:
      "A multi-tenant Next.js web app. You add your career once; for every job you paste, a staged LLM pipeline weights each requirement (must-have vs nice-to-have, plus knockout checks), scores your honest fit, then rewrites your bullets from your real experience in a chosen tone. Nothing is fabricated: grounding is enforced in code with a post-generation detector, and refusal is a first-class output when a rewrite would need a fact you never gave. A skeptical-recruiter critic then reads the tailored resume bullet by bullet and flags what to cut, swap, or reword. Built on Supabase/Postgres, NextAuth, Stripe, Zod, and live SSE streaming, with an ATS-clean single-column Typst PDF export.",
    result:
      "Live in production at secondround.app. Building is free; Pro unlocks PDF and plain-text export.",
    tags: ["Next.js", "TypeScript", "Supabase", "Stripe"],
    links: [
      { label: "Live", url: "https://secondround.app" },
    ],
  },
  {
    slug: "daily-roman",
    half: "night",
    name: "Daily Roman",
    kind: "iPhone app",
    line: "A new story from ancient Rome every day.",
    what:
      "Each day brings one bite-size piece of Roman history, plus a quick quiz that brings old stories back right before you would forget them.",
    why:
      "Most learning apps are language drills or random trivia. Daily Roman makes history a daily habit, with a map of the empire, a coin to flip and ranks from Tiro to Imperator.",
    impact:
      "It's on the App Store, with home screen widgets that keep the day's story in view without nagging notifications.",
    stat: ["8", "eras of Roman history, from the founding to the fall"],
    link:
      ["Get it on the App Store", "https://apps.apple.com/mx/app/daily-roman-ancient-history/id6759132785?l=en-GB"],
    fill: "#d4a12a",
    markColor: "#3b2605",
    textColor: "#2e1d03",
    bento: "tall",
    mark: { type: "stencil", src: "/projects/daily-roman/stencil.png" },
    markScale: 0.58,
    image: "/projects/daily-roman/image-04.png",
    context:
      "Ancient Roman history is fascinating but rarely shows up in daily learning apps. Most are language drills or generic trivia.",
    build:
      "A React Native/Expo iOS app that serves one AI-generated fact per day across 8 historical eras and 18 topics, paired with a Leitner-based spaced-repetition quiz system with 6 question types. Features a 3D coin flip mechanic, Latin-to-English morphing animations, a scholar progression from Tiro to Imperator, an interactive map of the Roman Empire, and iOS home screen widgets.",
    result:
      "Live on the App Store. The one-fact-a-day cadence and widget surfacing drive daily engagement without push-notification fatigue.",
    tags: ["React Native", "Expo", "TypeScript"],
    links: [
      { label: "App Store", url: "https://apps.apple.com/mx/app/daily-roman-ancient-history/id6759132785?l=en-GB" },
    ],
  },
  {
    slug: "kalshi-trader",
    half: "night",
    name: "Kalshi Weather Trader",
    kind: "Trading bot",
    line: "A bot that bets on tomorrow's weather.",
    what:
      "It reads four different weather forecasts, works out the odds of tomorrow's high temperature landing in each range, and compares them with what the market believes.",
    why:
      "When the forecasts and the market disagree, it places a trade. It rechecks every 30 minutes and sends each move to my phone with its reasoning.",
    impact:
      "It runs on its own and keeps score every day, so how much it bets depends on how right its forecasts have actually been.",
    stat: ["4", "forecast models it weighs before every trade"],
    fill: "#4aa8ff",
    markColor: "#062a4d",
    textColor: "#04213d",
    bento: "tall",
    mark: { type: "icon", name: "kalshi-trader" },
    image: "/projects/kalshi-trader/image.png",
    context:
      "Short-dated temperature contracts get mispriced when forecast distributions disagree with market-implied probabilities. The hard part is the meteorology, not the execution.",
    build:
      "Pulls multi-source forecasts from NWS, HRRR, GFS, and ECMWF ensembles, calculates probability distributions across temperature buckets, and acts only when modelled edge clears a threshold. Claude-powered agents re-evaluate every 30 minutes with position recovery and risk management. APScheduler drives the engine, SQLAlchemy persists state, and a Flask dashboard surfaces live performance.",
    result:
      "Runs autonomously with daily outcome tracking that feeds back into agent decisions, closing the loop between forecast accuracy and position sizing.",
    tags: ["Python", "Claude API", "MCP", "Flask"],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/Kahshi-Trader" },
    ],
  },
  {
    slug: "shopify-app",
    half: "night",
    name: "ShopAI",
    kind: "Shopify app",
    line: "Lets shoppers ask a product page questions and get real answers.",
    what:
      "Shoppers type a question right on the product page and get an answer in the store's own voice. Long review sections get boiled down into a quick summary.",
    why:
      "People leave product pages when the description doesn't answer their question and the reviews are too long to read. ShopAI answers them before they go.",
    impact:
      "Store owners install it straight from their Shopify store, with no code changes to their theme.",
    link: ["Visit shop-ai.co", "https://shop-ai.co/"],
    fill: "#ff4f8b",
    markColor: "#3d0718",
    textColor: "#2e0512",
    bento: "wide",
    mark: { type: "stencil", src: "/projects/shopify-app/stencil.png" },
    image: "/projects/shopify-app/screen.png",
    context:
      "Shoppers land on a product page with questions the copy doesn't answer and reviews too long to read. Most bounce before buying.",
    build:
      "A Shopify Theme App Extension that answers natural-language product questions with OpenAI-powered, context-aware responses, and summarizes reviews into a sentiment snapshot so buyers can skip the scroll. Merchants configure brand voice, policies, and product context for on-brand responses without writing code. Built on Remix with Prisma.",
    result:
      "Live at shop-ai.co, installable directly from a Shopify store with no theme code changes.",
    tags: ["Remix", "Shopify", "OpenAI", "Prisma"],
    links: [
      { label: "Live", url: "https://shop-ai.co/" },
    ],
  },
  {
    slug: "shakedown",
    half: "night",
    name: "Shakedown",
    kind: "Add-on for Claude Code",
    line: "Finds the untested parts of an app and writes the missing tests.",
    what:
      "Point it at an app and it maps everything a person can do in it, finds what is not tested, and sends a small team of AI agents to write the tests. A second mode clicks through the running app like a tester and reports what is broken.",
    why:
      "Every new app ships with gaps nobody has time to check. Shakedown does the tedious audit in one sitting.",
    impact:
      "On one app it took the test count from 224 to 474 in a single session. One run on another app found 15 bugs and 3 dead pages.",
    stat: ["474", "tests on one app, up from 224 in a single session"],
    fill: "#d97757",
    markColor: "#2e120a",
    textColor: "#24100a",
    bento: "wide",
    mark: { type: "icon", name: "shakedown" },
    image: "/projects/shakedown/image.png",
    context:
      "New apps ship with big test coverage gaps and accumulated UX debt. Audits of either are manual, slow, and inconsistent.",
    build:
      "A Claude Code skill with two modes. In `code` mode it baselines the test infrastructure, maps every interaction, catalogs existing coverage in parallel, prioritizes uncovered paths by risk, then dispatches 3-5 parallel agents to write tests in rounds: pure functions first, stateful code second. In `ui` mode it tours the running app in a real browser via Playwright MCP, drives every control, captures screenshots, and sorts findings into bugs, friction, and dead features. Stack-agnostic; works on Next.js, React Native, Django, Rails, and Go.",
    result:
      "Took a real Expo app from 224 to 474 tests in a single session. A separate `ui` mode run on a React+Express app surfaced 15 bugs and 3 dead pages in one sitting. Distributed as an installable Claude Code plugin.",
    tags: ["Claude Code", "AI Agents", "Testing"],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/shakedown" },
    ],
  },
  {
    slug: "kalshi-mcp",
    half: "night",
    name: "Kalshi Trading MCP",
    kind: "Toolkit for AI assistants",
    line: "Lets an AI assistant like Claude research and place trades on Kalshi.",
    what:
      "It gives an assistant like Claude more than 20 tools for a prediction market: checking the account, reading weather forecasts, sizing up markets and placing orders.",
    why:
      "Most tools like this can only check your balance. This one can do the research, with real safety brakes: spending caps, daily limits and a confirm step before any order goes through.",
    impact:
      "Anyone can install it with one command and plug it into Claude, and it works on a practice account before any real money.",
    stat: ["20+", "tools, each behind safety brakes"],
    fill: "#19d39e",
    markColor: "#04261c",
    textColor: "#031e16",
    bento: "wide",
    mark: { type: "icon", name: "kalshi-mcp" },
    image: "/projects/kalshi-mcp/image.png",
    context:
      "Most Kalshi MCP servers are thin 5-10 tool API wrappers, useful for checking balance but useless for actual quantitative analysis.",
    build:
      "A pip-installable FastMCP server with 20+ tools covering account management, market analysis, multi-source weather forecasting (NWS, HRRR, GFS, ECMWF), real-time METAR observations, and position drift monitoring. Safety controls include price caps, daily limits, cash reserves, strategy enforcement, and a two-step `prepare_order` then `confirm_order` flow that makes accidental actions impossible. Supports 8 cities with cross-city correlation analysis and AFD change detection.",
    result:
      "Installable via `pip install kalshi-trading-mcp` and plugs into Claude Code or Claude Desktop via standard MCP config. Demo and production environments both supported.",
    tags: ["Python", "FastMCP", "Kalshi API"],
    links: [
      { label: "Source", url: "https://github.com/alexandermazza/kalshi-trading-mcp" },
    ],
  },
  {
    slug: "f1-globe",
    half: "night",
    name: "F1 Globe Calendar",
    kind: "3D website",
    line: "Every Formula 1 race this season, pinned on a spinning globe.",
    what:
      "Every Grand Prix on the calendar is pinned where it really happens, on a 3D globe you can spin.",
    why:
      "A list of dates doesn't show how far the sport travels. Spinning the globe traces the season's route around the world in race order.",
    impact: "It's live for anyone to play with and gets updated with each new season.",
    link: ["Spin the globe", "https://f1-globe-calendar.vercel.app/"],
    fill: "#e10600",
    markColor: "#ffffff",
    textColor: "#ffffff",
    bento: "wide",
    mark: { type: "stencil", src: "/projects/f1-globe/stencil.png" },
    image: "/projects/f1-globe/newimage.png",
    context:
      "Built to see the Formula 1 2026 calendar as a real-world route on a globe. Inspired by the GitHub contribution globe.",
    build:
      "A 3D WebGL globe built with vanilla JavaScript and Three.js. Each Grand Prix is pinned to its real-world coordinates; spinning the globe traces the season's journey across continents in calendar order. Updated yearly with the current season.",
    result: "Live at f1-globe-calendar.vercel.app.",
    tags: ["JavaScript", "Three.js", "WebGL"],
    links: [
      { label: "Live", url: "https://f1-globe-calendar.vercel.app/" },
      { label: "Source", url: "https://github.com/alexandermazza/f1-globe-calendar" },
    ],
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function projectsByHalf(half: Half): Project[] {
  return projects.filter((p) => p.half === half);
}

/** The next story: through the day, into the night, then back to the first day project. */
export function nextProject(slug: string): Project {
  const i = projects.findIndex((p) => p.slug === slug);
  if (i < 0) throw new Error(`Unknown project: ${slug}`);
  return projects[(i + 1) % projects.length];
}
