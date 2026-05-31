import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Editorial system: Bricolage Grotesque (display — characterful, print-grade),
// Inter (body — neutral workhorse), JetBrains Mono (technical annotations /
// data). The mono var keeps the legacy name --font-geist-mono so the whole CSS
// kit + pages keep referencing one variable.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
const mono = JetBrains_Mono({
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
      className={`${bricolage.variable} ${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="sw min-h-full flex flex-col">
        {/* Skip link for keyboard / screen reader users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#17150F] focus:text-[#F1ECE1] focus:text-xs focus:tracking-widest focus:outline-none focus:ring-2 focus:ring-[#E5402A]"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
