"use client";

import React, { type ComponentProps, type MouseEvent } from "react";
import Link from "next/link";
import { useTransitionContext } from "./TransitionProvider";

type TransitionLinkProps = ComponentProps<typeof Link>;

export function TransitionLink({
  href,
  onClick,
  onMouseEnter,
  onTouchStart,
  children,
  ...props
}: TransitionLinkProps) {
  const { navigate, warmCanvasCache, isTransitioning } = useTransitionContext();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let browser handle modifier-key clicks (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const hrefStr = typeof href === "string" ? href : href.pathname || "/";

    // External links fall through
    try {
      const url = new URL(hrefStr, window.location.origin);
      if (url.origin !== window.location.origin) return;
    } catch {
      return;
    }

    e.preventDefault();
    if (!isTransitioning) {
      navigate(hrefStr);
    }

    if (onClick) {
      onClick(e);
    }
  };

  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    warmCanvasCache();
    if (onMouseEnter) onMouseEnter(e);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
    warmCanvasCache();
    if (onTouchStart) onTouchStart(e);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {children}
    </Link>
  );
}
