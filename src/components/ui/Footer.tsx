"use client";

import { TransitionLink } from "@/transitions";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const socialLinks = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-xl)]">
      {/* Nav links */}
      <div className="flex flex-wrap gap-[var(--space-lg)] pb-[var(--space-lg)]">
        {navLinks.map((link) => (
          <TransitionLink
            key={link.label}
            href={link.href}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            style={{
              transitionDuration: "var(--duration-micro)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {link.label}
          </TransitionLink>
        ))}
      </div>

      <div className="h-px w-full bg-[var(--border)]" />

      {/* Social links */}
      <div className="flex flex-wrap gap-[var(--space-lg)] py-[var(--space-lg)]">
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            style={{
              transitionDuration: "var(--duration-micro)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {link.label} ↗
          </a>
        ))}
      </div>

      <div className="h-px w-full bg-[var(--border)]" />

      {/* Bottom row */}
      <div className="flex flex-col gap-[var(--space-sm)] pt-[var(--space-lg)] sm:flex-row sm:items-center sm:justify-between">
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
