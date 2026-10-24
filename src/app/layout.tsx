import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Big_Shoulders, Schibsted_Grotesk } from "next/font/google";
import { TransitionProvider, TransitionContainer } from "@/transitions";
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
      </head>
      <body className="min-h-full flex flex-col">
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
