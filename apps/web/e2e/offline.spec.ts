import { expect, test, type Page } from "@playwright/test";

/** Falha o teste se o app tentar falar com qualquer coisa fora da própria origem. */
function watchNetwork(page: Page) {
  const external: string[] = [];
  const problems: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol.startsWith("http")) external.push(request.url());
  });
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  return { external, problems };
}

test("demo database: dashboard renders with no external requests and no CSP violations", async ({ page }) => {
  const net = watchNetwork(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();

  await expect(page.getByText("Saldo total")).toBeVisible();
  await expect(page.getByText("Despesas por categoria")).toBeVisible();
  await expect(page.getByText("Moradia").first()).toBeVisible();

  expect(net.external).toEqual([]);
  expect(net.problems).toEqual([]);
});

test("create, edit, export and reopen keeps the data", async ({ page }) => {
  const net = watchNetwork(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Criar banco vazio" }).click();

  await page.getByRole("link", { name: "Contas" }).click();
  await page.getByLabel("Nome").fill("Conta de teste");
  await page.getByLabel("Saldo inicial").fill("1.000,00");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("cell", { name: "Conta de teste" })).toBeVisible();

  await page.getByRole("link", { name: "Lançamentos" }).click();
  await page.getByLabel("Conta", { exact: true }).first().selectOption({ label: "Conta de teste" });
  await page.getByLabel("Categoria").selectOption({ label: "Mercado" });
  await page.getByLabel("Valor (R$)").fill("80,50");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Lançamento salvo.")).toBeVisible();
  await expect(page.getByText(/ainda não foram exportadas/i)).toBeVisible();

  await page.getByRole("link", { name: "Importar e exportar" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Baixar/ }).click()]);
  const path = await download.path();
  await expect(page.getByText(/ainda não foram exportadas/i)).toHaveCount(0);

  // Recarregar descarta a memória (como fechar a aba): só o arquivo exportado guarda os dados.
  await page.goto("/");
  await expect(page.getByText("Abrir seus dados")).toBeVisible();
  await page.getByTestId("file-input").setInputFiles(path);
  await expect(page.getByText("Saldo total")).toBeVisible();
  await expect(page.getByText(/919,50/)).toBeVisible();

  expect(net.external).toEqual([]);
});

test("an invalid file shows a friendly error and keeps the open database", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();
  await expect(page.getByText("Saldo total")).toBeVisible();

  await page.getByRole("link", { name: "Importar e exportar" }).click();
  await page.getByTestId("file-input").setInputFiles({ name: "lixo.db", mimeType: "application/octet-stream", buffer: Buffer.from("isto não é sqlite") });
  await expect(page.getByRole("alert")).toContainText("não é um banco SQLite");

  await page.getByRole("link", { name: "Painel" }).first().click();
  await expect(page.getByText("Saldo total")).toBeVisible();
});
