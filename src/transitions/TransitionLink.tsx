"use client";

import { type ComponentProps, type MouseEvent } from "react";
import Link from "next/link";
import { useTransitionContext } from "./TransitionProvider";

type TransitionLinkProps = ComponentProps<typeof Link>;

export function TransitionLink({
  href,
  onClick,
  children,
  ...props
}: TransitionLinkProps) {
  const { navigate, isTransitioning } = useTransitionContext();

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

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
