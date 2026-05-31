import type { Metadata } from "next";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import Magnetic from "@/components/swarm/magnetic";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://boverse.ai"),
  title: "BoVerse · Describe it. We build it.",
  description:
    "Tell BoVerse the outcome you want and upload whatever you already have. Two AI swarms infer the workflow and build it. You only review and approve.",
  openGraph: {
    title: "BoVerse · Describe it. We build it.",
    description: "The workflow factory. Two AI swarms infer your workflow and build it.",
    siteName: "BoVerse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BoVerse · Describe it. We build it.",
    description: "The workflow factory. Two AI swarms infer your workflow and build it.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="sw min-h-full flex flex-col">
        {/* Skip link for keyboard / screen reader users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:text-xs focus:tracking-widest focus:rounded focus:outline-none focus:ring-2 focus:ring-[#38e1ff]"
        >
          Skip to main content
        </a>
        <Magnetic />
        {children}
      </body>
    </html>
  );
}
