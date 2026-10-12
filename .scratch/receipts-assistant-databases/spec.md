Status: ready-for-agent

# Cupons, Assistant, vários bancos e configurações (Fase 3.5)

## Problem Statement

Registrar as compras de supermercado à mão é lento e eu perco o detalhe do que comprei. Também não tenho como pedir a uma IA para cadastrar ou ajustar meus dados, nem como controlar gastos que se repetem (assinaturas, aluguel) separando o que é necessário do que é supérfluo. E o app só enxerga um banco por vez, sem um jeito simples de trocar entre, por exemplo, finanças pessoais e da casa.

## Solution

No Connected mode, mando o QR Code de um cupom fiscal (pela câmera, colando o link ou enviando uma foto). O servidor baixa a página, a IA do meu provedor extrai estabelecimento, data e itens, e eu reviso uma prévia editável antes de gravar: o cupom vira uma Transaction de despesa na Category "Mercado" mais a lista de itens. Um Assistant com a minha própria chave de IA propõe alterações nos dados (Proposals) que só valem depois que eu aprovo. Cadastro uma lista de Recurring bills (Fixa ou Supérflua) com total mensal. Tenho uma pasta com dois ou três bancos, um ativo por vez, e troco por um seletor na barra superior. Tudo sem senha nesta versão. A chave e o provedor ficam numa tela de configurações, fora do arquivo `.db`.

## User Stories

1. Como usuário, quero mandar o QR Code de um cupom fiscal, para que o gasto do mercado seja registrado sem eu digitar.
2. Como usuário de computador, quero apontar a câmera para o QR Code, para ler o cupom na hora.
3. Como usuário, quero colar o link do QR Code, para importar quando não tenho câmera.
4. Como usuário de celular, quero enviar uma foto do QR Code, para importar mesmo sem HTTPS na câmera.
5. Como usuário, quero que a opção de câmera some com uma explicação quando o navegador não a permite, para entender o motivo.
6. Como usuário, quero ver as etapas da leitura ("Baixando a página", "Lendo os itens"), para saber que o app está trabalhando.
7. Como usuário, quero poder cancelar uma leitura em andamento, para não esperar uma operação travada.
8. Como usuário, quero uma mensagem clara quando o domínio do link não é aceito, a página está fora do ar ou a IA não tem chave, para saber o que corrigir.
9. Como usuário, quero revisar uma prévia editável (estabelecimento, data, conta, total e itens) antes de gravar, para corrigir leituras erradas da IA.
10. Como usuário, quero ser avisado quando a soma dos itens difere do total, para desconfiar de uma leitura incompleta.
11. Como usuário, quero que campos que a IA não encontrou fiquem vazios, para eu não aceitar valores inventados.
12. Como usuário, quero ser impedido de importar o mesmo cupom duas vezes, para não duplicar o gasto.
13. Como usuário, quero escolher a conta na importação, para que o gasto entre na conta certa.
14. Como usuário, quero que o cupom vire uma despesa Posted na Category "Mercado" na data do cupom, para o gasto de mercado do mês somar sozinho.
15. Como usuário, quero ver os itens comprados e o estabelecimento de cada cupom, para consultar o que comprei e onde.
16. Como usuário, quero ver o gasto de mercado do dia e do mês, para acompanhar o orçamento.
17. Como usuário, quero que dados extras do cupom (horário, instituição, CNPJ, outros) fiquem guardados mesmo que nem todo cupom os tenha, para não perder informação.
18. Como usuário, quero que o servidor só baixe páginas `https` de domínios de SEFAZ, para um QR malicioso não alcançar minha rede.
19. Como usuário, quero configurar URL, chave e modelo de um provedor compatível com OpenAI (OpenAI, DeepSeek, OpenRouter e outros), para usar a IA que eu quiser.
20. Como usuário, quero a chave mascarada na tela e uma opção "Trocar", para nunca vê-la exposta de novo.
21. Como usuário, quero um botão "Testar conexão", para saber se a configuração funciona antes de usar.
22. Como usuário, quero que a chave nunca vá dentro do arquivo `.db` exportado, para eu guardá-lo num drive com segurança.
23. Como usuário, quero pedir ao Assistant para cadastrar ou ajustar dados em linguagem natural, para ganhar tempo.
24. Como usuário, quero que cada alteração do Assistant apareça como Proposal com resumo em uma frase, para entender o que ele quer fazer.
25. Como usuário, quero editar os campos de uma Proposal antes de aprovar, para ajustar sem recusar.
26. Como usuário, quero aprovar, editar ou rejeitar cada Proposal, para manter o controle.
27. Como usuário, quero "Aprovar todas" quando o Assistant propõe várias alterações, para ganhar tempo.
28. Como usuário, quero que nada seja gravado antes da aprovação, para a IA não alterar meus dados sozinha.
29. Como usuário, quero desfazer uma Proposal já aprovada, para corrigir um erro depois.
30. Como usuário, quero que o Assistant respeite as regras do app (Transfer de duas pernas, tipo da Category), para meus dados continuarem coerentes.
31. Como usuário, quero que o Assistant nunca execute SQL livre, para nenhum comando ferir o banco.
32. Como usuário, quero ver no Assistant o nome do banco ativo, para não aprovar alterações no banco errado.
33. Como usuário, quero que o Assistant só enxergue o banco ativo, para os outros bancos ficarem privados.
34. Como usuário, quero um estado vazio que leva às configurações quando não há chave, para saber como habilitar o Assistant.
35. Como usuário, quero cadastrar uma Recurring bill (nome, valor, periodicidade, vencimento, Category, Fixa ou Supérflua, conta opcional), para controlar o que se repete.
36. Como usuário, quero editar e arquivar uma Recurring bill, para refletir mudanças.
37. Como usuário, quero ver o total mensal Fixo e o Supérfluo e a proporção entre eles, para enxergar onde cortar.
38. Como usuário, quero filtrar as Recurring bills por Category e por classificação, para analisar um grupo.
39. Como usuário, quero que a lista de Recurring bills deixe claro que não gera lançamentos nem altera saldos, para não me confundir.
40. Como usuário, quero ter uma pasta com dois ou três bancos `.db`, para separar finanças pessoais e da casa.
41. Como usuário, quero trocar de banco por um seletor na barra superior, para mudar de contexto rápido.
42. Como usuário, quero ver sempre o nome do banco ativo, para saber em qual estou.
43. Como usuário, quero criar um banco novo (vazio com as categorias padrão), para começar outro conjunto de dados.
44. Como usuário, quero renomear um banco, para organizá-los.
45. Como usuário, quero baixar o banco ativo como arquivo `.db`, para guardá-lo num drive ou abri-lo no Offline mode.
46. Como usuário, quero excluir um banco digitando o nome dele, para evitar apagar o errado.
47. Como usuário, quero que o backup copie todos os bancos da pasta, para não perder nenhum.
48. Como usuário, quero abrir no Offline mode um `.db` com cupons, itens e Recurring bills e ver e editar tudo, para consultar fora do servidor.
49. Como usuário do Offline mode, quero ver desabilitadas (com a explicação "Disponível no modo conectado") a importação de cupom e o Assistant, para entender por que não funcionam.
50. Como usuário, quero que o servidor escute só em `127.0.0.1`, para ninguém na minha rede acessar meus dados.
51. Como usuário, quero que o app funcione sem senha nesta versão, para começar a usar sem atrito.

## Implementation Decisions

- **Pré-requisito externo:** o servidor local (Fase 3: API HTTP, repositório de servidor, backup, "Baixar banco") ainda não existe no código. Este spec o assume. Sem senha, o servidor escuta somente em `127.0.0.1` e recusa qualquer outro endereço (substitui a autenticação da Fase 3).
- Vocabulário do glossário: **Receipt**, **Recurring bill**, **Assistant**, **Proposal**, Connected mode, Offline mode.
- **Receipt:** vira uma Transaction de despesa, Posted, com o total do cupom, na data do cupom, na Category "Mercado", na conta escolhida na importação. Os itens ficam numa tabela própria ligada à Transaction (nome, quantidade, preço) mais o estabelecimento. A chave de acesso do cupom é única, o que impede importar duas vezes. Dados que nem todo cupom tem ficam num campo flexível de metadados; seu desenho fino fica para a implementação.
- **Leitura do cupom:** o QR vira um link. O servidor (nunca o navegador) baixa a página e entrega o conteúdo ao modelo, que devolve JSON estruturado. O servidor valida o JSON por um esquema, e o usuário revisa uma prévia editável; só a confirmação grava. Não há um leitor por estado: a IA interpreta a página.
- **Segurança do download:** só `https`; só domínios de SEFAZ; nunca endereços IP nem `localhost`.
- **Provedor de IA:** um único formato compatível com OpenAI (URL base, chave, modelo). URL, chave e modelo ficam num arquivo de configuração do servidor, fora do SQLite e fora do Git, e nunca vão para o navegador (ADR 0004). A tela de configurações mostra a chave mascarada e oferece "Testar conexão".
- **Assistant:** só altera dados por um conjunto fixo de operações do repositório, nunca por SQL livre. Cada operação vira uma Proposal, editável e aprovada antes de ser aplicada; aprovadas podem ser desfeitas (ADR 0003). O Assistant enxerga somente o banco ativo.
- **Recurring bill:** nome, valor, periodicidade (mensal ou anual), dia de vencimento, Category, classificação Fixed ou Discretionary (na interface, "Fixa" e "Supérflua"), conta opcional. É uma lista de controle: não gera Transactions e não entra em saldos nem em totais de receita e despesa. Funciona também no Offline mode, porque usa o mesmo SQL (ADR 0001).
- **Vários bancos:** o Connected mode possui uma pasta de bancos `.db`; um ativo por sessão, trocado por um seletor na barra superior. Sem totais nem transferências entre bancos. Operações: criar (vazio, com as categorias padrão), renomear, trocar, baixar o ativo e excluir digitando o nome. Senha, chave e provedor valem para todos os bancos. O backup da Fase 3 copia todos.
- **Offline mode:** abre, mostra e edita Receipts, itens e Recurring bills como qualquer outro dado, mas não lê cupom nem usa o Assistant (sem rede). Esses recursos aparecem desabilitados com explicação.
- **Migrações:** as tabelas novas (itens do cupom, Recurring bills) entram por migração, no navegador e no servidor, pelas mesmas migrações (ADR 0001). Um banco antigo é migrado depois de oferecer cópia do original, como já previsto.
- **Interface:** segue `docs/ui-spec.md` (fluxo em etapas do cupom, cartões de Proposal, contas fixas, seletor de banco, configurações). Texto em PT-BR.
- **Sem senha:** vale para todos os modos nesta versão.

## Testing Decisions

- Um bom teste exercita comportamento visível pela API e pela tela, nunca detalhes internos: entra uma página de cupom e uma resposta de IA, sai uma prévia e, depois da confirmação, os dados gravados.
- Seam principal: **servidor, pela API HTTP**, com dois colaboradores substituídos por versões falsas nos testes: o download da página (devolve uma página de cupom salva) e o provedor de IA (devolve uma resposta salva). Cobre: prévia correta, soma dos itens diferente do total, campo ausente vazio, cupom duplicado recusado, domínio fora da lista recusado (incluindo IP e `localhost`), nada gravado sem confirmação, e Proposal só aplicada após aprovação (e desfeita ao desfazer).
- Teste de segurança da chave: a chave não aparece no arquivo `.db`, nem em respostas da API ao navegador, nem nos logs.
- Seam secundário: **repositório** (`packages/database`, nos dois drivers) para as tabelas novas de Receipt e Recurring bill, a unicidade da chave de acesso e os totais Fixo e Supérfluo.
- **E2E** no navegador para o fluxo de revisão e aprovação, o seletor de banco (criar, renomear, trocar, baixar, excluir digitando o nome) e a abertura, no Offline mode, de um `.db` com os dados novos.
- O teste "zero requisições externas" continua para o Offline mode. No Connected mode, passa a permitir apenas o servidor local; a SEFAZ e o provedor de IA são sempre falsos nos testes.
- Prior art: suítes de repositório de transferências e de exclusão; o E2E de demonstração e de exportar e reabrir.

## Out of Scope

- O servidor local em si (Fase 3), tratado em spec próprio.
- Senha de acesso e criptografia do SQLite (V2).
- Sincronização entre dispositivos, Tailscale e acesso do celular ao servidor (V2).
- Empréstimos e investimentos com cotação automática.
- Leitores específicos por SEFAZ (a IA interpreta a página).
- Desktop mode (spec `desktop-mode`).
- Geração automática de lançamentos a partir de Recurring bills.

## Further Notes

- Pergunta ainda aberta: quem especifica o servidor da Fase 3. Recomendação: um spec próprio antes deste.
- A câmera exige `localhost` ou HTTPS; fora disso ficam colar o link e enviar foto.
- Ordem sugerida: Recurring bills (independente do servidor), seletor de banco, configurações de IA, cupom por link, cupom por câmera e foto, Assistant.
