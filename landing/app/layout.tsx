import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoVerse · Atomic Workflows",
  description: "Where artifacts become workflows. Five primitives. Infinite forms. BoVerse turns the expert in your team's head into a workflow that runs every time.",
  openGraph: {
    title: "BoVerse · Atomic Workflows",
    description: "Where artifacts become workflows. Five primitives. Infinite forms.",
    siteName: "BoVerse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BoVerse · Atomic Workflows",
    description: "Where artifacts become workflows. Five primitives. Infinite forms.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        {/* Skip link for keyboard / screen reader users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:font-mono focus:text-xs focus:tracking-widest focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        >
          SKIP TO MAIN CONTENT
        </a>
        {children}
      </body>
    </html>
  );
}
