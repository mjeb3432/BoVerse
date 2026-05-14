// Spawn `next dev`, watch its stdout for the local URL, then auto-open the
// browser once the server is ready. Cross-platform (Windows / macOS / Linux),
// no extra npm dependencies — only Node built-ins.

import { spawn, exec } from 'node:child_process';

const next = spawn('npx', ['next', 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
});

let opened = false;

function openBrowser(url) {
  if (opened) return;
  opened = true;
  // Small delay so the dev server is fully accepting connections before the
  // browser hits it — otherwise the first tab can race the server and show a
  // connection-refused error.
  setTimeout(() => {
    const platform = process.platform;
    const cmd =
      platform === 'win32'
        ? `start "" "${url}"`
        : platform === 'darwin'
          ? `open "${url}"`
          : `xdg-open "${url}"`;
    exec(cmd, (err) => {
      if (err) {
        // Non-fatal: just log and keep the dev server running.
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
