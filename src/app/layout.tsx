import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { TransitionProvider, TransitionContainer } from "@/transitions";
import { Footer } from "@/components/ui";
import { ExpandingMenu } from "@/components/effects";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://mazzabuilds.com"),
  title: {
    default: "Mazza Builds",
    template: "%s — Mazza Builds",
  },
  description:
    "Portfolio of Alex Mazza — solo indie developer building iOS apps, Shopify tools, and AI systems",
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
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <head>
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
