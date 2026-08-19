"use client";

import { type ComponentProps } from "react";
import { TagChip } from "./TagChip";
import { SplitFlapText } from "@/components/effects/SplitFlapText";

interface ProjectCardProps extends Omit<ComponentProps<"article">, "children"> {
  issueNumber: number;
  name: string;
  description: string;
  tags: string[];
  /** Square logo rendered top-right, same mark as the homepage device screen. Omit to render nothing. */
  logo?: string;
  /** Background behind the logo for transparent marks. Defaults to white. */
  logoBgColor?: string;
}

export function ProjectCard({
  issueNumber,
  name,
  description,
  tags,
  logo,
  logoBgColor = "#FFFFFF",
  className = "",
  ...props
}: ProjectCardProps) {
  const formattedNumber = String(issueNumber).padStart(2, "0");

  return (
    <article
      className={`group/flap border border-[var(--border)] bg-[var(--surface)] p-[var(--space-md)] md:p-[var(--space-lg)] transition-colors hover:border-[var(--border-visible)] ${className}`}
      style={{
        borderRadius: "var(--radius-card)",
        transitionDuration: "var(--duration-micro)",
        transitionTimingFunction: "var(--ease-out)",
      }}
      {...props}
    >
      {/* Tertiary: issue number + logo */}
      <div className="mb-[var(--space-md)] flex min-h-[32px] items-center justify-between">
        <span className="font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-disabled)]">
          ISSUE {formattedNumber}
        </span>
        {logo && (
          <span
            aria-hidden="true"
            className="flex h-[32px] w-[32px] shrink-0 items-center justify-center overflow-hidden border border-[var(--border-visible)]"
            style={{
              borderRadius: "var(--radius-compact)",
              backgroundColor: logoBgColor,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt=""
              width={32}
              height={32}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </span>
        )}
      </div>

      {/* Primary: project name */}
      <h3
        className="mb-[var(--space-sm)] font-sans text-[var(--heading)] leading-[1.2] tracking-[-0.01em] text-[var(--text-display)]"
        style={{ fontSize: "var(--heading)" }}
      >
        <SplitFlapText externalTrigger staggerMs={20}>{name}</SplitFlapText>
      </h3>

      {/* Secondary: description */}
      <p
        className="mb-[var(--space-lg)] font-sans text-[var(--body-sm)] leading-[1.5] tracking-[0.01em] text-[var(--text-secondary)] line-clamp-2 min-h-[calc(var(--body-sm)*1.5*2)]"
        style={{ fontSize: "var(--body-sm)" }}
      >
        {description}
      </p>

      {/* Tertiary: tech stack tags */}
      <div className="flex flex-wrap gap-[var(--space-sm)]">
        {tags.map((tag) => (
          <TagChip key={tag}>{tag}</TagChip>
        ))}
      </div>
    </article>
  );
}
