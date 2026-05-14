// Spawn `next dev`, watch its stdout for the local URL, then auto-open the
// browser once the server is ready. Cross-platform (Windows / macOS / Linux),
// no extra npm dependencies — only Node built-ins.
//
// Notes:
// - We resolve the Next.js binary via require.resolve() and spawn `node` on it
//   directly. This avoids `npx`, which on Windows requires shell:true and
//   triggers DEP0190 (security warning about un-escaped shell args).
// - The URL pattern is regex-matched from Next.js's stdout so port shifts
//   (e.g. when 3000 is in use, Next picks 3001) are handled automatically.

import { spawn, exec } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const next = spawn(process.execPath, [nextBin, 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
});

let opened = false;

function openBrowser(url) {
  if (opened) return;
  opened = true;
  // Small delay so the dev server is fully accepting connections before the
  // browser hits it — otherwise the first tab can race the server and show
  // a connection-refused error.
  setTimeout(() => {
    const platform = process.platform;
    let cmd;
    if (platform === 'win32') {
      // `start` is a cmd.exe builtin. The empty "" is the window title arg
      // (required when the URL itself is quoted, otherwise start treats the
      // URL as the title).
      cmd = `start "" "${url}"`;
    } else if (platform === 'darwin') {
      cmd = `open "${url}"`;
    } else {
      // Linux / BSD / other unix-likes — most freedesktop-compliant.
      cmd = `xdg-open "${url}"`;
    }
    exec(cmd, (err) => {
      if (err) {
        // Non-fatal: log and keep the dev server running. Common on headless
        // CI / WSL without a graphical browser.
        console.error(`\n[dev] could not auto-open browser: ${err.message}`);
        console.error(`[dev] open ${url} manually.`);
      }
    });
  }, 500);
}

function watch(stream, sink) {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    sink.write(text);
    if (!opened) {
      const match = text.match(/https?:\/\/localhost:\d+/);
      if (match) openBrowser(match[0]);
    }
  });
}

watch(next.stdout, process.stdout);
watch(next.stderr, process.stderr);

next.on('close', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => next.kill('SIGINT'));
process.on('SIGTERM', () => next.kill('SIGTERM'));
