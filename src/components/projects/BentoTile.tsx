import type { CSSProperties } from "react";
import type { Project } from "@/data/projects";
import { TransitionLink } from "@/transitions";
import { RollText, rollHot } from "@/components/site/RollText";
import { ProjectMark } from "./ProjectMark";
import styles from "./ProjectsBoard.module.css";

export type TileProject = Pick<
  Project,
  "slug" | "half" | "name" | "kind" | "line" | "fill" | "markColor" | "textColor" | "bento" | "mark" | "markScale"
>;

/** One bento cell: the project's colour, its mark, and its name. `k` orders the rise and the drop. */
export function BentoTile({ project: p, k, out }: { project: TileProject; k: number; out: boolean }) {
  const className = [styles.t, styles[p.bento], rollHot, out && styles.out].filter(Boolean).join(" ");
  const colours = { "--fill": p.fill, "--mk": p.markColor, "--txt": p.textColor, "--k": k } as CSSProperties;
  return (
    <TransitionLink href={`/projects/${p.slug}`} className={className} style={colours}>
      <ProjectMark mark={p.mark} scale={p.markScale} className={styles.art} />
      <span className={styles.cap}>
        <p className={styles.kind}>{p.kind}</p>
        <h3>
          <RollText text={p.name} />
        </h3>
        <p className={styles.line}>{p.line}</p>
      </span>
    </TransitionLink>
  );
}
