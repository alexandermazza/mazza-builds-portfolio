import styles from "./Heatmap.module.css";

interface HeatmapProps {
  /** One value per day from Jan 1 of the current year, as `toYearSeries` returns. */
  values: number[];
  tone: "white" | "green";
  label: string;
  /** The about page's denser strip, coloured for the blueprint. */
  compact?: boolean;
}

// The heat() helper from home.html and about.html: weekday rows, five levels relative to the busiest day
export function Heatmap({ values, tone, label, compact }: HeatmapProps) {
  const max = Math.max(1, ...values);
  const pad = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).getUTCDay();
  const level = (v: number) => {
    const r = v / max;
    return v <= 0 ? 0 : r < 0.08 ? 1 : r < 0.25 ? 2 : r < 0.55 ? 3 : 4;
  };
  return (
    <div
      className={`${styles.heat} ${styles[tone]}${compact ? ` ${styles.compact}` : ""}`}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: pad }, (_, i) => (
        <i key={`pad${i}`} className={styles.pad} />
      ))}
      {values.map((v, i) => (
        <i key={i} data-l={level(v)} />
      ))}
    </div>
  );
}
