// Falha se um componente ou tela usar valores visuais fora do tema central.
// Só src/theme.css pode definir cores, medidas e sombras.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const roots = [join(here, "..", "src"), join(here, "..", "..", "..", "apps", "web", "src")];

// Arquivos que precisam de uma cor resolvida em RGB (o canvas do ECharts não lê oklch).
const allowed = new Set(["lib/chart-colors.ts"]);

const rules = [
  { name: "cor literal (hex)", re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "função de cor literal", re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/ },
  {
    name: "cor da paleta padrão do Tailwind (use um token)",
    re: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|shadow|decoration|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:\b|-)/,
  },
  { name: "valor arbitrário de utilitário (crie um token)", re: /\b(?!(?:aria|data)-\[)[a-z][a-z0-9-]*-\[[^\]]*\]/ },
];

// Só nas telas do app: controles que devem vir do design system.
const APP_RULES_FAIL = true;
const appRules = [
  { name: "botão cru (use Button)", re: /<button\b/ },
  { name: "link estilizado à mão (use Link ou Button)", re: /<a\b[^>]*\bclass=/ },
  { name: "checkbox cru (use Checkbox)", re: /<input\b[^>]*type="checkbox"/ },
  { name: "confirm() do navegador (use ConfirmDialog)", re: /\bconfirm\(/ },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(svelte|ts)$/.test(name)) yield path;
  }
}

let failures = 0;
for (const root of roots) {
  const isApp = root.includes(join("apps", "web"));
  for (const file of files(root)) {
    const rel = relative(root, file).replaceAll("\\", "/");
    if (allowed.has(rel)) continue;
    const checkApp = isApp && !rel.startsWith("lib/");
    const active = checkApp ? [...rules, ...appRules] : rules;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const { name, re } of active) {
          if (re.test(line)) {
            if (appRules.some((rule) => rule.name === name) && !APP_RULES_FAIL) {
              console.warn(`aviso ${relative(join(root, ".."), file)}:${i + 1}  ${name}`);
              continue;
            }
            failures++;
            console.error(`${relative(join(root, ".."), file)}:${i + 1}  ${name}\n    ${line.trim()}`);
          }
        }
      });
  }
}

if (failures > 0) {
  console.error(`\n${failures} violação(ões). Defina o valor em src/theme.css e use o token ou o componente.`);
  process.exit(1);
}
console.log("check:tokens ok");
