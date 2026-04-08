"use client";

import { type ComponentProps } from "react";
import { StatusBadge } from "./StatusBadge";
import { TagChip } from "./TagChip";
import { SplitFlapText } from "@/components/effects/SplitFlapText";

type Status = "LIVE" | "IN PROGRESS" | "ARCHIVED";

interface ProjectCardProps extends Omit<ComponentProps<"article">, "children"> {
  issueNumber: number;
  name: string;
  description: string;
  tags: string[];
  status: Status;
}

export function ProjectCard({
  issueNumber,
  name,
  description,
  tags,
  status,
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
      {/* Tertiary: issue number + status */}
      <div className="mb-[var(--space-md)] flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase leading-[1.2] tracking-[0.08em] text-[var(--text-disabled)]">
          ISSUE {formattedNumber}
        </span>
        <StatusBadge status={status} />
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
