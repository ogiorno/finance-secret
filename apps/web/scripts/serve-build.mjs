// Serve build/ aplicando os headers de static/_headers, como a hospedagem faz.
// Assim o e2e roda com a mesma CSP de produção.
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const buildDir = join(root, "build");
const port = Number(process.env.PORT ?? 4173);

const headers = {};
for (const line of readFileSync(join(buildDir, "_headers"), "utf8").split("\n")) {
  const match = /^\s+([\w-]+):\s*(.+)$/.exec(line);
  if (match) headers[match[1]] = match[2];
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".db": "application/vnd.sqlite3",
  ".json": "application/json",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let file = normalize(join(buildDir, decodeURIComponent(url.pathname)));
  if (!file.startsWith(buildDir)) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(buildDir, "index.html"); // fallback de SPA
  res.writeHead(200, { ...headers, "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}`));
