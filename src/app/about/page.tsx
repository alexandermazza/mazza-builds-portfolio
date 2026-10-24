import type { Metadata } from "next";
import Image from "next/image";
import { loadUsageData } from "@/lib/usage-data";
import { loadGitHubData } from "@/lib/github-data";
import { toYearSeries, formatCompact } from "@/lib/activity";
import { Heatmap } from "@/components/site/Heatmap";
import { PlatformIcon } from "@/components/site/PlatformIcon";
import { StreetMap } from "@/components/about/StreetMap";
import { SystemDiagram } from "@/components/about/SystemDiagram";
import { ProcessLoop } from "@/components/about/ProcessLoop";
import { BuildLog } from "@/components/about/BuildLog";
import { Connections } from "@/components/about/Connections";
import styles from "@/components/about/About.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Solo indie developer based in the Midwest. I build things from concept to production.",
};

// Render per request: the usage DB and GITHUB_TOKEN only exist at runtime.
export const dynamic = "force-dynamic";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const activeDays = (values: number[]) => values.filter((v) => v > 0).length;

export default async function AboutPage() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const tokens = toYearSeries(loadUsageData().data.map((d) => ({ date: d.date, value: d.total_tokens })), year, today);
  const github = await loadGitHubData(year);
  const commits = github && toYearSeries(github.data.map((d) => ({ date: d.date, value: d.count })), year, today);
  const tokenTotal = sum(tokens);

  return (
    <main className={styles.page}>
      {/* the map is drawn by script; without it there is nothing to show in its place */}
      <noscript>
        <style>{"#map-wrap{display:none}"}</style>
      </noscript>

      <section className={`${styles.head} ${styles.wrap}`}>
        <div className={styles.inner}>
          <h1>About</h1>
          <p className={styles.rev}>
            <span>Spec sheet</span>
            <span>Revised October 2026</span>
          </p>
        </div>
      </section>

      <section className={`${styles.spec} ${styles.wrap}`} aria-labelledby="l-identity">
        <div className={styles.inner}>
          <p className={styles.label} id="l-identity">Spec: Identity</p>
          <div className={styles.idGrid}>
            <div className={styles.bio}>
              <p>
                I&apos;m Alex Mazza. Spent years in GTM ops. Turns out I&apos;d rather write the software than evaluate
                it. AI-powered apps, automation systems, and tools end-to-end - iOS, web, trading bots, the works.
              </p>
              <p>
                Day job: Senior GTM Engineer, AI, at a healthcare SaaS company. Side projects: whatever I can&apos;t
                stop thinking about.
              </p>
            </div>
            <figure className={styles.portrait}>
              <Image src="/about/sketch.jpg" alt="Pencil sketch portrait of Alex Mazza" width={360} height={427} />
            </figure>
          </div>
        </div>
      </section>

      <section className={`${styles.spec} ${styles.flush} ${styles.wrap}`} aria-labelledby="l-location">
        <div className={styles.inner}>
          <p className={styles.label} id="l-location">Spec: Location</p>
          <div className={styles.loc}>
            <div className={styles.locText}>
              <h2>Chicago</h2>
              <p>Based in Chicago - a city built on a grid, which felt appropriate.</p>
            </div>
            <p className={styles.coords}>41.8925° N, 87.6335° W</p>
          </div>
        </div>
      </section>
      <StreetMap />

      <section className={`${styles.spec} ${styles.wrap}`} aria-labelledby="l-systems">
        <div className={styles.inner}>
          <p className={styles.label} id="l-systems">Spec: Systems</p>
          <h2>The system I run at work</h2>
          <p className={styles.sub}>
            Where the go-to-market data lives, the tools I built that do something with it, and the teams who use them
            every day. Point at any part to trace it.
          </p>
          <SystemDiagram />
        </div>
      </section>

      {(tokenTotal > 0 || commits) && (
        <section className={`${styles.spec} ${styles.wrap}`} aria-labelledby="l-activity">
          <div className={styles.inner}>
            <p className={styles.label} id="l-activity">Spec: Activity, {year} so far</p>
            <div className={styles.strip}>
              {tokenTotal > 0 && (
                <div className={styles.stat}>
                  <p className={styles.num}>{formatCompact(tokenTotal)}</p>
                  <p className={styles.lbl}>AI tokens, on {activeDays(tokens)} days</p>
                  <Heatmap values={tokens} tone="white" compact label={`Daily AI token use from January to ${month} ${year}`} />
                </div>
              )}
              {commits && (
                <div className={styles.stat}>
                  <p className={styles.num}>
                    <PlatformIcon name="github" />
                    {formatCompact(sum(commits))}
                  </p>
                  <p className={styles.lbl}>GitHub contributions, on {activeDays(commits)} days</p>
                  <Heatmap values={commits} tone="green" compact label={`Daily GitHub contributions from January to ${month} ${year}`} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className={`${styles.spec} ${styles.wrap}`} aria-labelledby="l-process">
        <div className={styles.inner}>
          <p className={styles.label} id="l-process">Spec: Process</p>
          <h2>A loop, not a line</h2>
          <ProcessLoop />
        </div>
      </section>

      <section className={`${styles.spec} ${styles.wrap}`} aria-labelledby="l-history">
        <div className={styles.inner}>
          <p className={styles.label} id="l-history">Spec: History</p>
          <h2>Build log</h2>
          <p className={styles.sub}>Every job shipped a new version of me. Newest release first.</p>
          <BuildLog tokens={tokenTotal} year={year} />
        </div>
      </section>

      <section className={`${styles.spec} ${styles.wrap}`} aria-labelledby="l-conn">
        <div className={styles.inner}>
          <p className={styles.label} id="l-conn">Spec: Connections</p>
          <Connections />
        </div>
      </section>
      <p className={styles.end}>End of spec</p>
    </main>
  );
}
