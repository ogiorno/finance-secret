// Pós-build: o SvelteKit injeta um <script> inline de inicialização cujo conteúdo muda a cada build
// (nomes de arquivo com hash). Calculamos o SHA-256 dele e o liberamos na CSP em build/_headers,
// mantendo `script-src` sem 'unsafe-inline'.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const build = join(fileURLToPath(new URL(".", import.meta.url)), "..", "build");
const html = readFileSync(join(build, "index.html"), "utf8");

const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
  (match) => `'sha256-${createHash("sha256").update(match[1] ?? "").digest("base64")}'`,
);
if (hashes.length === 0) throw new Error("Nenhum script inline encontrado em build/index.html: confira o build.");

const headersPath = join(build, "_headers");
const headers = readFileSync(headersPath, "utf8");
if (!headers.includes("__INLINE_SCRIPT_HASHES__")) throw new Error("Placeholder ausente em _headers.");
writeFileSync(headersPath, headers.replace("__INLINE_SCRIPT_HASHES__", hashes.join(" ")));
console.log(`CSP: ${hashes.length} script(s) inline liberado(s) por hash.`);
