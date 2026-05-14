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
};

export default nextConfig;
