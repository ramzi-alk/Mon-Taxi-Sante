// Minimal static file server for the Playwright push-notification tests
// (e2e/push-notifications.spec.ts). Serves `public/` at the site root so the
// tests exercise the real /sw.js shipped in the repo, without booting the
// full TanStack Start app (which needs live Supabase/VAPID env vars we don't
// want the test suite to depend on). No extra dependency: plain Node http.
//
// "/" is served from e2e/fixtures/index.html (a bare test harness page) —
// deliberately kept out of public/ so nothing test-only ships in the real
// production static assets.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.E2E_STATIC_PORT ?? 4319);
const E2E_DIR = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_ROOT = join(E2E_DIR, "..", "public");
const FIXTURES_ROOT = join(E2E_DIR, "fixtures");

const MIME_TYPES = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".html": "text/html",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function resolveFilePath(urlPath) {
  if (urlPath === "/") return join(FIXTURES_ROOT, "index.html");
  return join(PUBLIC_ROOT, urlPath);
}

const server = createServer((req, res) => {
  const urlPath = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]));
  const safePath = urlPath.includes("..") ? "/" : urlPath;
  const filePath = resolveFilePath(safePath);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, { "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`e2e static server ready on http://127.0.0.1:${PORT}`);
});
