import { TransitionLink } from "@/transitions";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.foot}>
      <a className={styles.email} href="mailto:hello@mazzabuilds.com">
        hello@mazzabuilds.com
      </a>
      <TransitionLink className={styles.link} href="/privacy">
        Privacy
      </TransitionLink>
      <p className={styles.copy}>&copy; {new Date().getFullYear()} Mazza Builds</p>
    </footer>
  );
}
