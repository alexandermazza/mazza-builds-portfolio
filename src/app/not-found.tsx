import { TransitionLink } from "@/transitions";
import styles from "@/components/site/PlainPage.module.css";

export default function NotFound() {
  return (
    <main className={styles.center}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.note}>This page isn&apos;t here.</p>
      <TransitionLink className={styles.action} href="/">
        Back to home
      </TransitionLink>
    </main>
  );
}
