import { cp, mkdir, realpath, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, ".vercel/output");

await mkdir(join(out, "static"), { recursive: true });
await mkdir(join(out, "functions/ssr.func"), { recursive: true });

// dist/client already contains public/ files (Vite merges publicDir into build output).
// Copy everything to static/ — assets served at /assets/..., JS/CSS at /assets/...
await cp(join(root, "dist/client"), join(out, "static"), { recursive: true });

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

// sharp is excluded from the server.js bundle (see vite.config.ts, ssr.external)
// because it ships a native .node binary that Rollup can't inline — Node
// resolves `import "sharp"` against node_modules at runtime instead, so a
// real (non-bundled) copy needs to sit next to server.js.
//
// pnpm's isolated node_modules layout resolves a package's own dependencies
// as symlinks *siblings* to it, one level up (e.g. .../sharp@0.35.4.../
// node_modules/{sharp,@img,detect-libc,semver}/) — not nested inside the
// package's own folder — so the parent of node_modules/sharp's realpath
// (not sharp's own directory) is what needs copying, sharp included.
//
// Node's fs.cp({dereference:true}) does not actually follow *nested*
// directory symlinks (verified: it lists @img/sharp-linux-x64 as an entry
// but copies it empty, no binary) — shelling out to `cp -rL`, which does
// not have this bug, is a deliberate exception to "no shell-outs in build
// scripts" for this reason alone.
const sharpModulesDir = dirname(await realpath(join(root, "node_modules/sharp")));
const sharpDest = join(out, "functions/ssr.func/node_modules");
await mkdir(sharpDest, { recursive: true });
execFileSync("cp", ["-rL", sharpModulesDir + "/.", sharpDest]);

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

  // Buffer the body instead of streaming it via Readable.toWeb(): combined
  // with duplex:"half" that hangs indefinitely on POST requests in Vercel's
  // Node serverless runtime. Booking submission and other server-fn calls
  // carry small JSON payloads — large files (PMT documents) go straight to
  // Supabase Storage from the browser, never through this route.
  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body,
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
