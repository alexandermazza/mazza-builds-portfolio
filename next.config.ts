import type { NextConfig } from "next";

/**
 * Baseline security headers.
 *
 * Added after a recruiter hit a corporate web filter block page. These are not
 * a fix for that on their own, but scanners and URL-rating services read them
 * as signals of a maintained, legitimate site, and they are good practice
 * regardless.
 *
 * Deliberately NOT setting a Content-Security-Policy here: this site runs GSAP,
 * three.js, Google Analytics and an inline failsafe script, so a CSP written
 * without careful testing would block its own scripts and leave visitors on a
 * blank page - the exact failure mode we just removed. Worth adding later, but
 * only with the resilience check green against it.
 */
const securityHeaders = [
  // Force HTTPS for a year. Fly already 301s http -> https, but that redirect
  // only helps once the plaintext request has already gone out - and that
  // first plaintext request is exactly what a corporate filter intercepts and
  // answers with its own block page, which is why the recruiter's screenshot
  // showed "Not secure" against our perfectly valid certificate.
  //
  // `preload` is declared but does nothing on its own. It only takes effect
  // after submitting the domain at hstspreload.org, which bakes it into
  // browsers and takes months to reverse. That submission is a deliberate
  // decision, left to a human.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Stop browsers second-guessing declared MIME types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin cross-site, the full path same-site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No framing by third parties - cheap clickjacking protection.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Nothing here needs these, so decline them up front.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
