import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Big_Shoulders, Schibsted_Grotesk } from "next/font/google";
import { TransitionProvider, TransitionContainer } from "@/transitions";
import { HydrationBeacon } from "@/components/ui";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import "./globals.css";

const GA_ID = "G-FN3N8MH4F6";

const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const text = Schibsted_Grotesk({
  variable: "--font-text",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

// cover, so the safe-area gutters in tokens.css take effect on notched phones
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} h-full`}
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
          {/* the bar rides inside the container so page transitions carry it with the page */}
          <TransitionContainer>
            <SiteHeader />
            {children}
          </TransitionContainer>
          <SiteFooter />
        </TransitionProvider>
      </body>
    </html>
  );
}
