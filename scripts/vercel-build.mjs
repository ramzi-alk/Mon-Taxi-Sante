import { cp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, ".vercel/output");

await mkdir(join(out, "static"), { recursive: true });
await mkdir(join(out, "functions/ssr.func"), { recursive: true });

// TanStack Start serves client assets at /_build/... (client.base default).
// Copy dist/client → static/_build/ so the filesystem handler resolves them.
await cp(join(root, "dist/client"), join(out, "static/_build"), { recursive: true });

// Public folder assets (images, fonts, etc.) served at /...
await cp(join(root, "public"), join(out, "static"), { recursive: true }).catch(() => null);

// Bundled SSR server (self-contained with ssr.noExternal)
await cp(
  join(root, "dist/server/server.js"),
  join(out, "functions/ssr.func/server.js")
);
await cp(
  join(root, "dist/server/assets"),
  join(out, "functions/ssr.func/assets"),
  { recursive: true }
).catch(() => null);

// Thin Node.js wrapper — imports from server.js and adapts fetch API → Node http
await writeFile(
  join(out, "functions/ssr.func/index.js"),
  `
import { Readable } from "node:stream";
import server from "./server.js";

export default async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = new URL(req.url, \`\${proto}://\${host}\`);

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v != null) headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD"
      ? Readable.toWeb(req)
      : undefined,
    duplex: "half",
  });

  const response = await server.fetch(request);

  res.statusCode = response.status;
  for (const [k, v] of response.headers.entries()) {
    res.setHeader(k, v);
  }

  if (response.body) {
    Readable.fromWeb(response.body).pipe(res);
  } else {
    res.end();
  }
}
`.trimStart()
);

// ESM flag — without this Node.js treats .js files as CJS and chokes on import statements
await writeFile(
  join(out, "functions/ssr.func/package.json"),
  JSON.stringify({ type: "module" }, null, 2)
);

// Vercel Node.js serverless function config
await writeFile(
  join(out, "functions/ssr.func/.vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
    },
    null,
    2
  )
);

// Build Output API v3 routing.
// filesystem handler serves /_build/... from static/_build/ and /assets/... from static/assets/
// Everything else falls through to the SSR function.
await writeFile(
  join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/ssr" },
      ],
    },
    null,
    2
  )
);

console.log("✓ .vercel/output/ prêt pour le déploiement");
