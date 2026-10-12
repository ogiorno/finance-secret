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
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(row).toContainText("25,00");

  await row.hover();
  await row.getByRole("button", { name: /Excluir lançamento/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(row).toHaveCount(0);
  await page.waitForTimeout(5600);
  await expect(page.getByText("Nada lançado neste mês.")).toBeVisible();
});

test("quick entry needs only the amount and keeps the date under advanced options", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar banco vazio" }).click();
  await page.getByRole("link", { name: "Contas" }).click();
  await page.getByRole("button", { name: "Nova conta" }).first().click();
  await page.getByLabel("Nome").fill("Conta rápida");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await page.getByRole("link", { name: "Lançamentos" }).click();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Data")).toBeHidden();
  await dialog.getByLabel("Conta", { exact: true }).selectOption({ label: "Conta rápida" });
  await dialog.getByLabel("Valor (R$)").fill("12,00");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Lançamento salvo")).toBeVisible();
  await expect(page.getByText("Sem categoria").first()).toBeVisible();

  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByRole("dialog").getByText("Opções avançadas").click();
  await expect(page.getByRole("dialog").getByLabel("Data")).toBeVisible();
});

test("deleting a transaction asks for confirmation first", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();
  await page.getByRole("link", { name: "Lançamentos" }).click();
  const rows = page.getByRole("listitem");
  const before = await rows.count();

  await page.getByRole("button", { name: /Excluir lançamento/ }).first().click({ force: true });
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Cancelar" }).click();
  await expect(rows).toHaveCount(before);

  await page.getByRole("button", { name: /Excluir lançamento/ }).first().click({ force: true });
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(rows).toHaveCount(before - 1);
});

test("register a bill, pay it from an account and undo the payment", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar banco vazio" }).click();
  await page.getByRole("link", { name: "Contas", exact: true }).click();
  await page.getByRole("button", { name: "Nova conta" }).first().click();
  await page.getByLabel("Nome").fill("Conta das contas");
  await page.getByLabel("Saldo inicial").fill("5.000,00");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await page.getByRole("link", { name: "A pagar e receber" }).click();
  await expect(page.getByText("Nenhuma conta para este mês.")).toBeVisible();
  await page.getByRole("button", { name: "Nova conta" }).first().click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Nome").fill("Aluguel");
  await form.getByLabel("Valor esperado (R$)").fill("1.800,00");
  await form.getByLabel("Dia do vencimento").fill("28");
  await form.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Aluguel")).toBeVisible();
  await expect(page.getByText("Pendente").first()).toBeVisible();

  await page.getByRole("button", { name: "Pagar", exact: true }).click();
  const pay = page.getByRole("dialog");
  await pay.getByLabel("Conta de onde saiu o dinheiro").selectOption({ label: "Conta das contas" });
  await pay.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(page.getByText("Paga", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Desmarcar pagamento de Aluguel/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Desmarcar" }).click();
  await expect(page.getByText("Paga", { exact: true })).toHaveCount(0);
});

test("income from the spouse: create a source, register the monthly income and receive it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar banco vazio" }).click();
  await page.getByRole("link", { name: "Contas", exact: true }).click();
  await page.getByRole("button", { name: "Nova conta" }).first().click();
  await page.getByLabel("Nome").fill("Conta da casa");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByRole("button", { name: "Nova fonte" }).click();
  await page.getByRole("dialog").getByLabel("Nome").fill("Esposa");
  await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Esposa").first()).toBeVisible();

  await page.getByRole("link", { name: "A pagar e receber" }).click();
  await page.getByRole("radio", { name: "A receber" }).click();
  await page.getByRole("button", { name: "Nova receita" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Nome").fill("Repasse mensal");
  await form.getByLabel("Valor esperado (R$)").fill("2.500,00");
  await form.getByLabel("Dia do vencimento").fill("28");
  await form.getByLabel("Fonte da renda").selectOption({ label: "Esposa" });
  await form.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("A receber", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Receber", exact: true }).click();
  const receive = page.getByRole("dialog");
  await receive.getByLabel("Conta onde entrou o dinheiro").selectOption({ label: "Conta da casa" });
  await receive.getByRole("button", { name: "Registrar recebimento" }).click();
  await expect(page.getByText("Recebida", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Lançamentos" }).click();
  await expect(page.getByText("Esposa").first()).toBeVisible();
});

test("goals: create a trip goal, put money in, spread the month's leftover and read the report", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar banco vazio" }).click();
  await page.getByRole("link", { name: "Metas" }).click();
  await expect(page.getByText("Nenhuma meta ainda.")).toBeVisible();

  await page.getByRole("button", { name: "Nova meta" }).first().click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Nome").fill("Viagem");
  await form.getByLabel("Valor alvo (R$), se tiver").fill("6.000,00");
  await form.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Viagem")).toBeVisible();

  await page.getByRole("button", { name: "Colocar", exact: true }).click();
  const put = page.getByRole("dialog");
  await put.getByLabel("Valor (R$)").fill("100,00");
  await put.getByRole("button", { name: "Colocar", exact: true }).click();
  await expect(page.getByText("R$ 100,00").first()).toBeVisible();

  await page.getByRole("button", { name: "Ver relatório de Viagem" }).click();
  await expect(page.getByRole("dialog").getByText("Mês a mês")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Retirar", exact: true }).click();
  const take = page.getByRole("dialog");
  await take.getByLabel("Valor (R$)").fill("500,00");
  await take.getByRole("button", { name: "Retirar", exact: true }).click();
  await expect(take.getByText(/passa do que está guardado/)).toBeVisible();
});

test("money flow: pick a destination and see the transactions behind it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver demonstração" }).click();
  await page.getByRole("link", { name: "Fluxo do dinheiro" }).click();
  await expect(page.getByText("Quem trouxe")).toBeVisible();

  await page.getByRole("button", { name: /^Mercado:/ }).click();
  await expect(page.getByText("Lançamentos de Mercado")).toBeVisible();
  await expect(page.getByText("Compras do mês")).toBeVisible();

  await page.getByRole("button", { name: "Limpar escolha" }).click();
  await expect(page.getByText("Lançamentos de Mercado")).toHaveCount(0);
  await expect(page.getByText("Os mesmos trechos em tabela")).toBeVisible();
});
