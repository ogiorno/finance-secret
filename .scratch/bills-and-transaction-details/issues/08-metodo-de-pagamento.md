# 08: Método de pagamento

**What to build:** campo opcional "método de pagamento" (débito, crédito, pix, boleto, VR, dinheiro, outro) em Opções avançadas, já preenchido pelo tipo da Account. O padrão por tipo de conta é editável, então tipos personalizados também definem o seu. O método descreve e filtra, nunca altera saldos.

**Blocked by:** 01 (Registro rápido e "Sem categoria")

**Status:** done

- [x] Tipos de conta ganham um método padrão: cartão = crédito, VR = VR, corrente = débito (os demais sem padrão)
- [x] O padrão de cada tipo é editável na tela de tipos de conta, inclusive nos personalizados
- [x] Ao escolher a Account no registro, o método vem preenchido e pode ser trocado em Opções avançadas
- [x] Sem método, o lançamento continua válido
- [x] O método aparece na linha secundária da lista e no detalhe, e a lista filtra por método
- [x] Bancos antigos são migrados sem perder dados; testes de repositório nos dois drivers
