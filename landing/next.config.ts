import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to the directory where Next was invoked
  // (the landing project root). Prevents Next.js from walking up the tree and
  // accidentally selecting a stray lockfile (e.g. C:\Users\<you>\package-lock.json
  // from a misplaced `npm install`) as the project root. Without this pin,
  // dev mode prints a "We detected multiple lockfiles" warning on every start.
  turbopack: {
    root: process.cwd(),
  },

  // The /contact page was renamed to /build (the workflow generator). Keep
  // the old path working for any external links, bookmarks, or shared URLs.
  async redirects() {
    return [
      {
        source: '/contact',
        destination: '/factory',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
