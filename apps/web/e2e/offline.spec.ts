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
  await page.getByRole("button", { name: "Nova conta" }).first().click();
  await page.getByLabel("Nome").fill("Conta de teste");
  await page.getByLabel("Saldo inicial").fill("1.000,00");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Conta de teste")).toBeVisible();

  await page.getByRole("link", { name: "Lançamentos" }).click();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Conta", { exact: true }).selectOption({ label: "Conta de teste" });
  await dialog.getByLabel("Categoria", { exact: true }).selectOption({ label: "Mercado" });
  await dialog.getByLabel("Valor (R$)").fill("80,50");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Lançamento salvo")).toBeVisible();
  await expect(page.getByText(/ainda não foram exportadas/i)).toBeVisible();
  await page.getByRole("link", { name: "Importar e exportar" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Baixar/ }).click()]);
  const path = await download.path();
  await expect(page.getByText(/ainda não foram exportadas/i)).toHaveCount(0);

  // Recarregar descarta a memória (como fechar a aba): só o arquivo exportado guarda os dados.
  await page.goto("/");
  await expect(page.getByText("Comece com seus dados")).toBeVisible();
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

test("transactions: edit with the pencil icon, undo a delete, then delete for good", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar banco vazio" }).click();

  await page.getByRole("link", { name: "Contas" }).click();
  await page.getByRole("button", { name: "Nova conta" }).first().click();
  await page.getByLabel("Nome").fill("Conta A");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await page.getByRole("link", { name: "Lançamentos" }).click();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Conta", { exact: true }).selectOption({ label: "Conta A" });
  await dialog.getByLabel("Categoria", { exact: true }).selectOption({ label: "Mercado" });
  await dialog.getByLabel("Valor (R$)").fill("10,00");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();

  const row = page.getByRole("listitem").filter({ hasText: "Mercado" });
  await expect(row).toContainText("10,00");

  await row.hover();
  await row.getByRole("button", { name: /Editar lançamento/ }).click();
  await dialog.getByLabel("Valor (R$)").fill("25,00");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(row).toContainText("25,00");

  await row.hover();
  await row.getByRole("button", { name: /Excluir lançamento/ }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(row).toContainText("25,00");

  await row.hover();
  await row.getByRole("button", { name: /Excluir lançamento/ }).click();
  await expect(row).toHaveCount(0);
  await page.waitForTimeout(5600);
  await expect(page.getByText("Nada lançado neste mês.")).toBeVisible();
});