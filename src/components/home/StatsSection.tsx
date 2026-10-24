import { loadUsageData } from "@/lib/usage-data";
import { loadGitHubData } from "@/lib/github-data";
import { formatCompact, toYearSeries } from "@/lib/activity";
import { Heatmap } from "@/components/site/Heatmap";
import { PlatformIcon } from "@/components/site/PlatformIcon";
import styles from "./Home.module.css";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const active = (xs: number[]) => xs.filter((v) => v > 0).length;

function tokenSeries(year: number, today: Date): number[] {
  try {
    return toYearSeries(loadUsageData().data.map((d) => ({ date: d.date, value: d.total_tokens })), year, today);
  } catch {
    return []; // no usage DB here: leave the figure out rather than fail the page
  }
}

/** "2026, so far": this year's AI tokens and GitHub contributions from the live loaders. Each figure is left out when its source has nothing. */
export async function StatsSection() {
  const today = new Date(), year = today.getUTCFullYear();
  const month = today.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const tokens = tokenSeries(year, today);
  const gh = await loadGitHubData(year);
  const commits = gh && toYearSeries(gh.data.map((d) => ({ date: d.date, value: d.count })), year, today);
  const showTokens = sum(tokens) > 0;
  if (!showTokens && !commits) return null;

  return (
    <section className={`${styles.stats} ${styles.wrap}`} id="stats" data-proj="0" aria-labelledby="stats-title">
      <h2 id="stats-title" className={styles.reveal}>{year}, so far</h2>
      {showTokens && (
        <figure className={`${styles.stat} ${styles.col} ${styles.reveal}`}>
          <p className={styles.num}>{formatCompact(sum(tokens))}</p>
          <p className={styles.label}>tokens of AI-assisted building, across {active(tokens)} days</p>
          <Heatmap values={tokens} tone="white" label={`Daily AI token use from January to ${month} ${year}`} />
        </figure>
      )}
      {commits && (
        <figure className={`${styles.stat} ${styles.col} ${styles.reveal}`}>
          <p className={styles.num}>
            <PlatformIcon name="github" />
            <span className={styles.srOnly}>GitHub: </span>
            {formatCompact(sum(commits))}
          </p>
          <p className={styles.label}>GitHub contributions, across {active(commits)} days</p>
          <Heatmap values={commits} tone="green" label={`Daily GitHub contributions from January to ${month} ${year}`} />
        </figure>
      )}
      <p className={`${styles.meta} ${styles.col}`}>These update every day.</p>
    </section>
  );
}
