import { TransitionLink } from "@/transitions";
import { getProjectBySlug, projects } from "@/data/projects";
import { buildTransit } from "@/lib/constellation";
import { HomeStage } from "@/components/home/HomeStage";
import { StatsSection } from "@/components/home/StatsSection";
import { Ticker } from "@/components/home/Ticker";
import { TransitMap } from "@/components/home/TransitMap";
import styles from "@/components/home/Home.module.css";

// Render per request so the stats see the usage DB (a mounted volume) and GITHUB_TOKEN (injected by Fly at runtime).
export const dynamic = "force-dynamic";

const TICKER = ["iOS Apps", "AI Agents", "Dashboards", "Web Crawlers", "Trading Bots", "Shopify Apps", "MCP Servers", "Attribution Engines", "GTM Tools"];
const transit = buildTransit(projects);

function Work({ slug, proj }: { slug: string; proj: number }) {
  const p = getProjectBySlug(slug)!;
  return (
    <article className={styles.item} data-proj={proj}>
      <span className={styles.kind}>{p.kind}</span>
      <h4>
        <TransitionLink href={`/projects/${p.slug}`}>{p.name}</TransitionLink>
      </h4>
      <p>{p.line}</p>
    </article>
  );
}

export default function Home() {
  return (
    <HomeStage>
      <div id="hero-wrap">
        <section className={`${styles.hero} ${styles.wrap}`} id="hero">
          <h1>
            <span>Mazza</span>
            <span>Builds</span>
          </h1>
          <p className={styles.tag}>building things that work</p>
        </section>
        <div className={styles.spacer} aria-hidden="true" />
      </div>

      <section className={`${styles.intro} ${styles.wrap}`} id="intro" data-proj="0" aria-label="About Alex">
        <div className={styles.col}>
          <p className={`${styles.lede} ${styles.reveal}`}>
            I&apos;m Alex Mazza. Spent years in GTM ops. Turns out I&apos;d rather write the software than evaluate it.
            AI-powered apps, automation systems, and tools end-to-end - iOS, web, trading systems, the works. Day job:
            Senior GTM Engineer, AI, at a healthcare SaaS company. Side projects: whatever I can&apos;t stop thinking about.
          </p>
        </div>
        <p className={`${styles.dict} ${styles.col} ${styles.reveal}`}>
          <b>mazza</b> <i>/ˈmah.zuh/</i> · noun · <i>Italian</i> - a construction worker&apos;s sledgehammer
        </p>
      </section>

      <StatsSection />

      <section className={styles.ticker} id="ticker" aria-labelledby="ticker-title">
        <div className={styles.wrap}>
          <h2 id="ticker-title" className={styles.reveal}>
            Building things like...
          </h2>
        </div>
        <Ticker words={TICKER} />
        <p className={styles.srOnly} id="ticker-list">
          {TICKER.join(", ")}.
        </p>
      </section>

      <section className={styles.wrap} id="work" aria-labelledby="work-title">
        <div className={styles.workHead}>
          <h2 id="work-title">Selected work</h2>
        </div>
        <div>
          <header className={styles.halfHead} data-proj="1">
            <svg className={styles.glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
            </svg>
            <h3>9 to 5</h3>
            <p>Tools I build for the team at Freshpaint.</p>
          </header>
          <Work slug="distill" proj={1} />
          <Work slug="web-tracker-scanner" proj={2} />
        </div>
        <div>
          <header className={styles.halfHead} data-proj="3">
            <svg className={styles.glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
            </svg>
            <h3>5 to 9</h3>
            <p>Side projects, built on nights and weekends.</p>
          </header>
          <Work slug="secondround" proj={3} />
          <Work slug="daily-roman" proj={4} />
        </div>
      </section>

      <TransitMap lines={transit.lines} stops={transit.stops} />

      <section className={`${styles.foot} ${styles.wrap}`} id="foot" aria-labelledby="foot-title">
        <h2 id="foot-title">Let&apos;s build something.</h2>
        <span className={styles.email}>hello@mazzabuilds.com</span>
      </section>
    </HomeStage>
  );
}
