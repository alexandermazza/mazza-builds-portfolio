import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Space_Mono, Instrument_Serif } from "next/font/google";
import { TransitionProvider, TransitionContainer } from "@/transitions";
import { Footer } from "@/components/ui";
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
        <link
          rel="preload"
          as="fetch"
          crossOrigin="anonymous"
          href="/models/iphone.glb"
        />
        <link
          rel="preload"
          as="fetch"
          crossOrigin="anonymous"
          href="/models/macbook.glb"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TransitionProvider>
          <TransitionContainer>{children}</TransitionContainer>
          <Footer />
          <ExpandingMenu items={menuItems} />
        </TransitionProvider>
      </body>
    </html>
  );
}
