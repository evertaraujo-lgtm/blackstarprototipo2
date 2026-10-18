# Evidências RE-002

Dados de simulação local, não qualificação de voo. Relatório principal:
`docs/planos-codex/2026-10-18-re002.md`. Decisões excepcionais:
`docs/planos-codex/RE002-DECISOES.md`.

## Proveniência e reprodução

- `antes.json`: quatro receitas por 838 s, base 20405b8, com o erro angular
  original. Preservado como evidência, não atualizado por scripts posteriores.
- `depois-correcao-angular.json`: quatro receitas por 838 s no marco B,
  integrador translacional/polar/controle preservados; a mudança foi reconstruir
  L intrínseco com velocidades relativas. Reproduzir com o checkout do commit
  B e `vite-node scripts/validar-re002.ts`. Não executar esse driver sobre os
  arquivos históricos em um modelo novo sem definir saída distinta.
- `campanha-*.json`: matriz C/D na revisão final r4 / núcleo intrinseca-relativa-3. Executar
  `./node_modules/.bin/vite-node scripts/campanha-re002.ts`. A variável opcional
  `RE002_CASOS` recebe IDs separados por vírgula. Cada arquivo contém receita,
  configuração completa, revisões, estados inicial/final, extremos por passo,
  eventos por passo, amostras a 10 s e estatísticas de controle a 1 Hz.
- Casos ADM de 65 km/2500 m/s são investigações suborbitais de menor energia;
  não são retorno orbital. Alvo +2000 km de arco é sintético, não sítio real.
  Candidato A usa hipóteses necessárias de frenagem e não autoriza B.
- Duração 500/838/1000 s é orçamento de coleta. A simulação não é congelada ao
  contato ou destruição; o final do orçamento não declara repouso/pouso/missão
  concluída. Estatísticas de erro de controle incluem todo o orçamento,
  inclusive trechos após dano/perda de atuação; interpretar com os eventos.
- `m9/orbitas.json` e `testes-m9.json`: qualificação orbital inerte existente,
  reexecutada com `M9_EVIDENCIAS_DIR=docs/validacoes/re002/m9` e o teste
  `src/physics/ambiente/DinamicaOrbital.test.ts`. Tolerâncias originais preservadas.
- `convergencia-angular.json`: quatro dt em vácuo central por 10 s, driver
  `scripts/convergencia-angular-re002.ts`. Não inferir ordem de convergência
  quando o arredondamento domina o resíduo.
- `testes-B.json` / `testes-C.json`: resultados intermediários validados.
- `testes-D-intermediario.json`: execução intermediária concorrente; não é o
  parecer final (o caso angular 1/960 excedeu orçamento computacional padrão).
- `testes-completos.json`: primeira suíte integral, 612/634 aprovados; preserva
  as 22 falhas diagnosticadas, incluindo 21 oráculos históricos incompatíveis.
- `testes-finais.json`: 155/155 regressões dirigidas após corrigir a ordem de
  soma lote/individual e completar a telemetria. Nenhuma tolerância física mudou.
- `testes-compatibilidade.json`: comparação nova de bancada/missão atuais e
  recusa explícita de diário histórico de revisão diferente.
- `m10-candidata` / `testes-m10-candidata.json`: gerador preexistente com
  `M10_REFERENCIA_DIR` apontando pasta nova; verifica critérios físicos e produz
  candidatos para revisão. Nesse modo a comparação com o JSON antigo é
  explicitamente desativada pelo gerador. Não significa suíte histórica verde,
  substituição de oráculos ou aprovação de requalificação (R04).
- `smoke-{B,C,D} e smoke-D-r4`: evidências do navegador e diários reais exportados. Para
  novos runs usar `REENTRADA_EVIDENCIAS_DIR=docs/validacoes/re002/<nova-pasta>`
  com `npm run reentrada:smoke`, preservando a pasta histórica RE-001.

## Distinção entre dados

- Estado: calculado pelo `MundoFisico` e sistemas físicos reais.
- Amostra: estado observado em instante discreto identificado no arquivo.
- Extremo: mínimo/máximo reduzido em **todo passo**, com passo e tempo; não
  inferido das curvas esparsas.
- Evento: cruzamento detectado no passo, com valor, causa e sentido ativo/inativo.
- Predição: limites ideais sob aceleração líquida hipotética, não trajetória
  integrada, motor instalado ou garantia de sobrevivência.
- Balanço angular: C/D mede cargas efetivamente integradas; B usa quadratura
  externa. Contato/topologia variável marcam passos incompletos. O resíduo
  desses passos não pode ser certificado como erro conservativo do integrador.

Unidades SI nas chaves; temperaturas e limiares em °C. Todos os cenários usam
atmosfera declarada salvo o caso cujo nome e configuração dizem vácuo.
Nenhum dado em `docs/validacoes/reentrada` foi substituído por estas evidências.

A identificação r4 acrescenta extremos globais de carga G, erro normalizado de
alpha e calor acumulado de cada componente. A receita angular `intrinseca-relativa-3`
preserva a associatividade do caminho individual também no lote. Referências
B/r3 anteriores documentam as etapas da investigação; não sobrescrevem essa
identificação final nem são prometidas como replay estrito no novo esquema.

`resumo-campanha.json` reduz os doze arquivos finais, com hashes SHA-256 das
fontes e confirmação do prefixo nominal idêntico até 830 s. Carga G e erro de
alpha são extremos por passo; RMS/cruzamentos são amostrados a 1 Hz. A revisão
r4 final também corrige o rótulo/portas do modo manual inicial; a receita sem
automação foi reexecutada e não altera forças por essa correção de apresentação.
