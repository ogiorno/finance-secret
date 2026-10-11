// Falha se um componente usar valores visuais fora do tema central.
// Só src/theme.css pode definir cores, medidas e sombras.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");

const rules = [
  { name: "cor literal (hex)", re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "função de cor literal", re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/ },
  {
    name: "cor da paleta padrão do Tailwind (use um token)",
    re: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|shadow|decoration|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:\b|-)/,
  },
  { name: "valor arbitrário de utilitário (crie um token)", re: /\b[a-z][a-z0-9-]*-\[[^\]]*\]/ },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(svelte|ts)$/.test(name)) yield path;
  }
}

let failures = 0;
for (const file of files(root)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const { name, re } of rules) {
        if (re.test(line)) {
          failures++;
          console.error(`${relative(root, file)}:${i + 1}  ${name}\n    ${line.trim()}`);
        }
      }
    });
}

if (failures > 0) {
  console.error(`\n${failures} violação(ões). Defina o valor em src/theme.css e use o token.`);
  process.exit(1);
}
console.log("check:tokens ok");
