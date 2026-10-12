Status: ready-for-agent

# Desktop mode (Fase 3.6, só plano)

## Problem Statement

Quero usar o app como um programa no meu computador, apontando para um arquivo SQLite numa pasta e vendo cada alteração salva direto nele, sem subir um servidor na mão e sem baixar e reenviar arquivos. Depois quero levar o mesmo arquivo para o navegador (Offline mode) ou guardá-lo num drive.

## Solution

Um aplicativo de computador (Electron) que empacota o mesmo servidor e o mesmo frontend, abre um `.db` que eu escolho e grava nele direto. Leitura de cupom e Assistant funcionam quando há internet. Sem senha. Guardar o arquivo num drive ou levá-lo a outro lugar é responsabilidade minha. Esta entrega é **somente o plano**: um documento que fecha as decisões e define a ordem de trabalho, sem código.

## User Stories

1. Como usuário, quero instalar um aplicativo no meu computador, para usar as finanças sem abrir o navegador.
2. Como usuário, quero escolher qual arquivo `.db` o app abre, para apontá-lo à pasta que eu quiser.
3. Como usuário, quero que cada alteração seja salva direto nesse arquivo, para não precisar exportar.
4. Como usuário, quero abrir outro `.db` sem reinstalar nada, para alternar entre arquivos.
5. Como usuário, quero que o app use o mesmo código dos outros modos, para o comportamento ser idêntico.
6. Como usuário, quero que funcione sem internet, exceto cupom e Assistant, para consultar e lançar a qualquer hora.
7. Como usuário, quero ler cupons e usar o Assistant no Desktop mode quando houver internet, para ter os mesmos recursos do Connected mode.
8. Como usuário, quero que o app não peça senha nesta versão, para abrir direto.
9. Como usuário, quero que outros programas do meu computador não consigam falar com o app, para meus dados ficarem protegidos mesmo sem senha.
10. Como usuário, quero ser avisado se o mesmo arquivo já está aberto em outro lugar, para não corromper o banco.
11. Como usuário, quero que o app evite arquivos auxiliares ao lado do `.db`, para não estragar o arquivo numa pasta sincronizada por drive.
12. Como usuário, quero que a chave de IA e as configurações fiquem na pasta de dados do aplicativo e não ao lado do `.db`, para a chave não ir junto quando eu levo o arquivo.
13. Como usuário, quero levar o `.db` ao Offline mode e abri-lo lá, para consultar e editar no navegador.
14. Como usuário, quero poder baixar uma cópia do banco ativo, para guardar um backup.
15. Como usuário, quero um aviso claro de que guardar e sincronizar o arquivo é por minha conta, para entender a responsabilidade.

## Implementation Decisions

- **Empacotamento:** Electron, rodando dentro do aplicativo o mesmo servidor e o mesmo frontend do Connected mode. O servidor escuta somente em `127.0.0.1`, numa porta escolhida na abertura.
- **Sem senha** nesta versão (vale para todos os modos). Para proteger a porta local de outros programas, cada abertura gera um token aleatório, entregue só à janela do app.
- **Arquivo aberto:** o usuário escolhe o `.db`; o app o abre diretamente em vez de usar uma pasta de bancos. Para outro arquivo, abre-se outro `.db`.
- **Pastas sincronizadas por drive:** o SQLite usa o modo de journal normal (`DELETE`), sem os arquivos `-wal` e `-shm` ao lado do `.db`. Um arquivo de trava indica que o banco já está aberto e o app avisa antes de abrir de novo.
- **Configuração e chave de IA:** na pasta de dados do aplicativo do sistema, fora do `.db` (ADR 0004).
- **Compartilhamento do código:** nenhuma regra nova de domínio. As mesmas migrações e as mesmas consultas (ADR 0001); o Assistant segue as mesmas Proposals (ADR 0003).
- O plano também registra: como o app localiza e atualiza seus binários, o que muda no teste de "zero requisições externas" para este modo, e a ordem: primeiro servidor e Assistant funcionando no navegador, depois o empacotamento.
- Entrega desta fase: **um documento de plano**, sem implementação.

## Testing Decisions

- Não há testes nesta entrega, pois é só plano.
- O plano deve definir, para a fase de implementação, o seam principal: um E2E que abre o aplicativo empacotado sobre um `.db` de teste, altera um dado e confere que o arquivo mudou no disco e que não restaram arquivos auxiliares ao lado dele; mais um teste de que a abertura de um arquivo já travado avisa o usuário.
- Prior art: o E2E do Offline mode e as suítes do repositório nos dois drivers.

## Out of Scope

- Qualquer código do aplicativo.
- Senha de acesso e criptografia do SQLite (V2).
- Sincronização entre dispositivos e armazenamento em nuvem (responsabilidade do usuário).
- Aplicativos móveis.
- Instaladores para outros sistemas além do necessário para validar o plano.

## Further Notes

- Depende do servidor local (Fase 3) e das entregas do spec `receipts-assistant-databases`, pois reaproveita servidor e Assistant.
- Alternativa descartada: PWA instalado com acesso a arquivos pelo navegador. Não resolve a leitura de cupom, porque o navegador não consegue baixar a página da SEFAZ.
