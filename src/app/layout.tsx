import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { TransitionProvider, TransitionContainer } from "@/transitions";
import { CrosshairCursor, ExpandingMenu } from "@/components/effects";
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
  title: "Mazza Builds",
  description: "Portfolio of Alex Mazza — solo indie developer",
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
      <body className="min-h-full flex flex-col">
        <TransitionProvider>
          <TransitionContainer>{children}</TransitionContainer>
          <CrosshairCursor />
          <ExpandingMenu items={menuItems} />
        </TransitionProvider>
      </body>
    </html>
  );
}
