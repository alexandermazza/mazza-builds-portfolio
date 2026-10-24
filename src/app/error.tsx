"use client";

import styles from "@/components/site/PlainPage.module.css";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.center}>
      <h1 className={styles.title}>Error</h1>
      <p className={styles.note}>Something broke on this page.</p>
      {error.digest && <p className={styles.small}>Ref: {error.digest}</p>}
      <button type="button" className={styles.action} onClick={reset}>
        Try again
      </button>
    </main>
  );
}
