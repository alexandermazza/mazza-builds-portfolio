import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Space_Mono, Instrument_Serif } from "next/font/google";
import { TransitionProvider, TransitionContainer } from "@/transitions";
import { Footer, HydrationBeacon } from "@/components/ui";
import { ExpandingMenu } from "@/components/effects";
import "./globals.css";

const GA_ID = "G-FN3N8MH4F6";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mazzabuilds.com"),
  title: {
    default: "Mazza Builds",
    template: "%s - Mazza Builds",
  },
  description:
    "building things that work",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Mazza Builds",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const menuItems = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* The .glb models are NOT preloaded here on purpose. As <link
            rel="preload" as="fetch"> they pulled 6.7MB on every route -
            including /about and /contact, which render no 3D at all - and
            held back the load event by several seconds. ProjectShowcase and
            useGLTF.preload() already warm them on the routes that use them. */}

        {/* Failsafe watchdog. Inline so it survives the main bundle being
            blocked, mangled, or unparseable. If React has not hydrated within
            6s, mark the document so the CSS in globals.css reveals content
            instead of leaving the visitor on a black screen. ES5 syntax and
            fully try/catch'd so it cannot itself be the thing that breaks. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var t=setTimeout(function(){d.className+=' js-stalled';},6000);window.__siteReady=function(){try{clearTimeout(t);d.className=d.className.replace(/\\bjs-stalled\\b/g,'');}catch(e){}};window.__siteFailsafe=function(){try{clearTimeout(t);if(d.className.indexOf('js-stalled')<0){d.className+=' js-stalled';}}catch(e){}};}catch(e){}})();`,
          }}
        />
        <noscript>
          <style>{`
            [data-boot-overlay]{display:none!important}
            [style*="opacity:0"]{opacity:1!important}
            body{overflow:visible!important}
          `}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <HydrationBeacon />
        <TransitionProvider>
          <TransitionContainer>{children}</TransitionContainer>
          <Footer />
          <ExpandingMenu items={menuItems} />
        </TransitionProvider>
      </body>
    </html>
  );
}
