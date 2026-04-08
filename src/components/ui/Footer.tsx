"use client";

import Image from "next/image";
import { TransitionLink } from "@/transitions";
import { SplitFlapText } from "@/components/effects/SplitFlapText";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/alexandermazza",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
  },
  {
    label: "Twitter",
    href: "https://twitter.com/mazza_builds",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
        <path d="M4 20l6.768 -6.768" />
        <path d="M20 4l-6.768 6.768" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:hello@mazzabuilds.com",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)]">
      {/* Logo */}
      <div className="flex justify-center pb-[var(--space-xl)]">
        <Image
          src="/logo.png"
          alt="Mazza Builds logo"
          width={48}
          height={46}
          className="h-12 w-auto opacity-60"
        />
      </div>

      {/* Nav links — centered */}
      <div className="flex flex-wrap justify-center gap-[var(--space-xl)] pb-[var(--space-xl)]">
        {navLinks.map((link) => (
          <TransitionLink
            key={link.label}
            href={link.href}
            className="font-mono text-[13px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            style={{
              transitionDuration: "var(--duration-micro)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            <SplitFlapText>{link.label}</SplitFlapText>
          </TransitionLink>
        ))}
      </div>

      <div className="h-px w-full bg-[var(--border)]" />

      {/* Social links — centered with icons, equally spaced */}
      <div className="flex justify-center gap-[var(--space-2xl)] py-[var(--space-xl)]">
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-[var(--space-sm)] font-mono text-[13px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            style={{
              transitionDuration: "var(--duration-micro)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {link.icon}
            {link.label}
          </a>
        ))}
      </div>

      <div className="h-px w-full bg-[var(--border)]" />

      {/* Bottom row */}
      <div className="flex flex-col gap-[var(--space-sm)] pt-[var(--space-xl)] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          &copy; {new Date().getFullYear()} MAZZA BUILDS
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          3D models:{" "}
          <a
            href="https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            iPhone 17 Pro Max
          </a>{" "}
          by MajdyModels,{" "}
          <a
            href="https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            MacBook Pro M3
          </a>{" "}
          by jackbaeten — CC-BY-4.0
        </p>
      </div>
    </footer>
  );
}
