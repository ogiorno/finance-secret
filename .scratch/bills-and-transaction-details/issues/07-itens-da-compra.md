# 07: Itens da compra

**What to build:** no detalhe de uma Transaction, adicionar, editar e remover itens (produto, quantidade, preço unitário). O total de cada item é calculado em centavos inteiros, e a diferença entre a soma dos itens e o total da compra aparece como aviso, sem bloquear.

**Blocked by:** 06 (Detalhe da transação)

**Status:** done

- [x] Itens são opcionais; uma Transaction sem itens continua válida
- [x] Quantidade aceita frações (ex.: 1,250 kg) guardada em milésimos inteiros; nenhum valor usa ponto flutuante
- [x] O total do item arredonda para o centavo mais próximo (metade para cima), calculado só com inteiros
- [x] Preços digitados em formato brasileiro viram centavos; valores fracionários ou inválidos são recusados
- [x] A diferença entre a soma dos itens e o total aparece como "ajustes/descontos"; o saldo e os gráficos usam sempre o total da Transaction
- [x] Remover um item pede confirmação; apagar a Transaction apaga os itens
- [x] Testes de core (arredondamento, conversão de texto em centavos, rateio sem perder centavo) e de repositório nos dois drivers
