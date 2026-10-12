import { expect, test, type Page } from "@playwright/test";

function watchNetwork(page: Page) {
  const external: string[] = [];
  const problems: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol.startsWith("http")) external.push(request.url());
  });
  page.on("console", (message) => { if (message.type() === "error") problems.push(message.text()); });
  page.on("pageerror", (error) => problems.push(error.message));
  return { external, problems };
}

test("demo database: dashboard renders without external requests", async ({ page }) => {
  const net = watchNetwork(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();
  await expect(page.getByText("Saldo total")).toBeVisible();
  await expect(page.getByText("Despesas por categoria")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Receitas e despesas" })).toBeVisible();
  const monthly = page.getByRole("table").first();
  await expect(monthly.getByRole("row", { name: /out\. de 26.*6\.500,00.*3\.288,00/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Moradia/ }).first()).toContainText("65,4%");
  await page.getByRole("button", { name: "Mês anterior" }).click();
  await expect(monthly.getByRole("row", { name: /out\. de 26/ })).toHaveCount(0);
  expect(net.external).toEqual([]);
  expect(net.problems).toEqual([]);
});

test("create, edit, export and reopen keeps the data", async ({ page }) => {
  const net = watchNetwork(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Criar banco vazio" }).click();

  await page.getByRole("link", { name: "Contas" }).click();
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill("Conta de teste");
  await page.getByRole("textbox", { name: "Saldo inicial" }).fill("1.000,00");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("cell", { name: "Conta de teste" })).toBeVisible();

  await page.getByRole("link", { name: "Transações" }).click();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("textbox", { name: "Valor (R$)" }).fill("80,50");
  await expect(page.getByLabel("Prévia do lançamento")).toContainText("80,50");
  await page.getByRole("combobox", { name: "Conta", exact: true }).selectOption({ label: "Conta de teste" });
  await page.getByRole("combobox", { name: "Categoria", exact: true }).selectOption({ label: "Mercado" });
  await page.getByRole("textbox", { name: "Descrição" }).fill("Mercado de teste");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("row", { name: /Mercado de teste/ })).toBeVisible();

  await page.getByRole("button", { name: /Editar Mercado de teste/ }).click();
  await page.getByRole("textbox", { name: "Valor (R$)" }).fill("90,50");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("row", { name: /Mercado de teste/ })).toContainText("90,50");
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("table").first()).toContainText("90,50");
  await page.getByRole("link", { name: "Transações" }).click();
  await expect(page.getByText(/ainda não foram exportadas/i)).toBeVisible();

  await page.getByRole("link", { name: "Importar e exportar" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Baixar/ }).click()]);
  const path = await download.path();
  if (!path) throw new Error("O arquivo exportado não foi encontrado.");
  await expect(page.getByText(/ainda não foram exportadas/i)).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText("Comece com seus dados")).toBeVisible();
  await page.getByTestId("file-input").setInputFiles(path);
  await expect(page.getByText("Saldo total")).toBeVisible();
  await expect(page.getByText(/909,50/)).toBeVisible();
  expect(net.external).toEqual([]);
  expect(net.problems).toEqual([]);
});

test("undo deletion preserves a transaction", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();
  await page.getByRole("link", { name: "Transações" }).click();
  await page.getByRole("button", { name: "Excluir Farmácia de 22/10/2026" }).click();
  await expect(page.getByRole("row", { name: /Farmácia/ }).first()).toContainText("Exclusão pendente");
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByRole("row", { name: /Farmácia/ }).first()).not.toContainText("Exclusão pendente");
  await page.getByRole("searchbox", { name: "Buscar" }).fill("Farmácia");
  await expect(page.getByRole("row", { name: /Farmácia/ })).toHaveCount(3);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("combobox", { name: "Categoria" }).selectOption({ label: "Saúde" });
  await expect(page.getByRole("row", { name: /Farmácia/ })).toHaveCount(3);
});

test("archive warning, archive and reactivate keep the account available", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();
  await page.getByRole("link", { name: "Contas" }).click();
  await page.getByRole("row", { name: /Reserva \(demo\)/ }).getByRole("button", { name: "Renomear" }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill("Reserva renomeada");
  await page.getByRole("button", { name: "Salvar nome" }).click();
  await expect(page.getByRole("row", { name: /Reserva renomeada/ })).toBeVisible();
  await page.getByRole("row", { name: /Reserva renomeada/ }).getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByText(/saldo desta conta deixará/)).toBeVisible();
  await page.getByRole("button", { name: "Arquivar conta" }).click();
  await expect(page.getByRole("heading", { name: "Arquivadas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reativar" })).toBeVisible();
  await page.getByRole("button", { name: "Reativar" }).click();
  await expect(page.getByRole("row", { name: /Reserva renomeada/ })).toBeVisible();
});

test("export waits for a pending deletion and saves its final state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();
  await page.getByRole("link", { name: "Transações" }).click();
  await page.getByRole("button", { name: "Excluir Farmácia de 22/10/2026" }).click();
  await page.getByRole("link", { name: "Importar e exportar" }).click();
  await expect(page.getByText(/aguardará o fim do prazo/)).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.getByRole("button", { name: /Baixar/ }).click()]);
  const path = await download.path();
  if (!path) throw new Error("O arquivo exportado não foi encontrado.");
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles(path);
  await page.getByRole("link", { name: "Transações" }).click();
  await expect(page.getByRole("row", { name: /22\/10\/2026 Farmácia/ })).toHaveCount(0);
});

test("invalid file shows a friendly error and keeps the open database", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();
  await page.getByRole("link", { name: "Importar e exportar" }).click();
  await page.getByTestId("file-input").setInputFiles({ name: "lixo.db", mimeType: "application/octet-stream", buffer: Buffer.from("isto não é sqlite") });
  await expect(page.getByRole("alert")).toContainText("não é um banco SQLite");
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByText("Saldo total")).toBeVisible();
});
