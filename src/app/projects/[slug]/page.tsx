import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects, getProjectBySlug, nextProject } from "@/data/projects";
import { TransitionLink } from "@/transitions";
import { RollText, rollHot } from "@/components/site/RollText";
import { ShiftBackdrop } from "@/components/projects/ShiftBackdrop";
import { StoryMedia } from "@/components/projects/StoryMedia";
import { HALF, MoonIcon, SunIcon } from "@/components/projects/shift";
import styles from "@/components/projects/StoryPage.module.css";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = getProjectBySlug((await params).slug);
  if (!project) return {};
  return { title: project.name, description: project.line };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const p = getProjectBySlug((await params).slug);
  if (!p) notFound();

  // "next" walks the day, crosses into the night, then wraps back to the morning
  const next = nextProject(p.slug);
  const nextLabel = next.half === p.half ? "Next project" : p.half === "day" ? "Clocking out. After hours" : "Back to the morning";
  const { name, video, poster, image, fill, markColor, textColor, mark, markScale } = p;

  return (
    <main>
      <ShiftBackdrop half={p.half} />
      <article className={styles.story}>
        <TransitionLink className={`${styles.back} ${rollHot}`} href={p.half === "night" ? "/projects?shift=night" : "/projects"}>
          <RollText text="← All projects" />
        </TransitionLink>
        <header className={styles.head}>
          <p className={styles.eyebrow}>
            {p.half === "day" ? <SunIcon /> : <MoonIcon />}
            {HALF[p.half].label} · {p.kind}
          </p>
          <h1 style={{ "--chars": Math.max(...p.name.split(" ").map((w) => w.length)) } as CSSProperties}>{p.name}</h1>
          <p className={styles.pitch}>{p.line}</p>
        </header>
        <StoryMedia project={{ name, video, poster, image, fill, markColor, textColor, mark, markScale }} />
        <div className={styles.body}>
          {p.stat ? (
            <p className={styles.stat}>
              <b>{p.stat[0]}</b>
              <span>{p.stat[1]}</span>
            </p>
          ) : (
            <span />
          )}
          <div className={styles.text}>
            <ol className={styles.flow}>
              <li>
                <h2>What it does</h2>
                <p>{p.what}</p>
              </li>
              <li>
                <h2>Why it&apos;s cool</h2>
                <p>{p.why}</p>
              </li>
              <li>
                <h2>The impact</h2>
                <p>{p.impact}</p>
              </li>
            </ol>
            {p.link && (
              <p className={styles.visit}>
                <a href={p.link[1]} target="_blank" rel="noopener">
                  {p.link[0]} ↗
                </a>
              </p>
            )}
            <details className={styles.hood}>
              <summary>
                <h2>Under the hood</h2>
              </summary>
              <div className={styles.parts}>
                <div>
                  <h3>Context</h3>
                  <p>{p.context}</p>
                </div>
                <div>
                  <h3>Build</h3>
                  <p>{p.build}</p>
                </div>
                <div>
                  <h3>Result</h3>
                  <p>{p.result}</p>
                </div>
                <div>
                  <h3>Stack</h3>
                  <p>{p.tags.join(", ")}</p>
                </div>
                {p.links.length > 0 && (
                  <div>
                    <h3>Links</h3>
                    <p className={styles.visit}>
                      {p.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener">
                          {l.label} ↗
                        </a>
                      ))}
                    </p>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
        <TransitionLink className={`${styles.next} ${rollHot}`} href={`/projects/${next.slug}`}>
          <small>{nextLabel}</small>
          <strong>
            <RollText text={next.name} />
            <span className={styles.arr} aria-hidden="true">
              →
            </span>
          </strong>
        </TransitionLink>
      </article>
    </main>
  );
}
