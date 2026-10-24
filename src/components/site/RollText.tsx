import { Fragment, type CSSProperties } from "react";
import styles from "./RollText.module.css";

/** Put on the link or button whose hover and focus roll the letters. */
export const rollHot = styles.hot;

/**
 * Each letter is two stacked copies in a one-line window; words stay together so lines break
 * between them. Screen readers get the plain text once.
 */
export function RollText({ text }: { text: string }) {
  let n = 0;
  const words = text
    .toUpperCase()
    .split(" ")
    .map((word) => [...word].map((c) => ({ c, i: n++ })));
  return (
    <>
      <span className={styles.srOnly}>{text}</span>
      <span aria-hidden="true">
        {words.map((letters, w) => (
          <Fragment key={w}>
            {w > 0 && " "}
            <span className={styles.w}>
              {letters.map(({ c, i }) => (
                <span key={i} className={styles.f} style={{ "--i": i } as CSSProperties}>
                  <i>{c}</i>
                  <i>{c}</i>
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}
