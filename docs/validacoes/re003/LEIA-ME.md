# Evidências RE-003

Fontes examinadas inicialmente: `d1b9625`, revisão física `RE-002-r4`.
Contrato/diagnóstico inicial: `1cafa59`. Correção limitada à configuração e
interface; núcleo, leis físicas, materiais e referências históricas preservados.

## Arquivos

- `reproducao-antes.json`: seis reproduções anteriores à correção, sobre fontes
  servidas pelo Vite. Atribuição a `input.value` sem eventos simula o caminho de
  restauração; não prova o histórico do navegador do operador. A edição normal
  seguida de início aplicava valores; exportação anterior ao preparo/início
  conservava a instância anterior sem explicar a pendência.
- `testes-configuracao.json`: novos testes determinísticos de validação, getters
  reais de corpo/flaps/bateria/fixadores, configuração congelada e replay.
- `interface/resultado.json`: oito conjuntos de verificações reais, 53 downloads
  JSON em 1440/390 px, com/sem eventos; preparação no passo zero, continuidade
  explícita, cancelamento, reinício, dados inválidos e exportação imutável.
- `interface/*.json`: os diários efetivamente baixados, sem editar seus valores.
  O número de passos no teste de início/pausa livre depende do renderer; não é
  oráculo de trajetória. Os testes manuais avançam exatamente 240 passos por s.
- `interface/*.png`: capturas da interface desktop/mobile, sem overflow.
- `comparacao-termica.json`: teste H, duas instâncias EnsaioReentrada em receitas
  idênticas, exceto limite dos flaps 900/5000 °C. Inclui configuração oficial,
  início, cruzamento em passo físico, amostras a 1 Hz, finais e eventos.
- `smoke-geral/`: regressão do smoke existente, em diretório novo, preservando
  resultados RE-001/RE-002. Comandos, modo manual, bank, energia, dano,
  aproximação bloqueada, passo 1/480 e exportações.
- `testes-completos.json`: resultado integral da execução no sandbox, quando
  disponível; limitações ambientais são distinguidas no relatório do marco.
- `testes-reentrada.json`: 111 verificações específicas do laboratório.
- `testes-site.json`: testes institucionais repetidos com servidor local autorizado.
- `testes-documentacao.json`: validação documental com subprocessos Node locais.

## Reprodução após a correção

```bash
npm test -- --maxWorkers=1 --reporter=json --outputFile=docs/validacoes/re003/testes-completos.json
npx vitest run src/cenarios/ConfiguracaoReentrada.test.ts
npm run typecheck
npm run typecheck:missoes
npm run docs:verificar
npm run test:documentacao
npm run build
npm run site:verificar
npx vite-node scripts/smoke-configuracao-re003.ts
REENTRADA_EVIDENCIAS_DIR=docs/validacoes/re003/smoke-geral npm run reentrada:smoke
npx vite-node scripts/validar-termica-re003.ts
```

Chrome local em `/usr/bin/google-chrome` (ou `CHROME_BIN`). Servidores de
preview e subprocessos Node podem exigir permissão de execução fora do sandbox.
Os scripts gravam somente evidências RE-003; executar novamente substitui estas
medições locais, sem promover os oráculos antigos M10/M11. A suíte completa
continua incluindo essas comparações históricas, pendentes de requalificação.

## Resultado físico H

Receita orbital já estudada: 120 km, 7700 m/s, demais padrões declarados,
semente 1, dt 1/240 s, 410 s de coleta. Sem alterar coeficientes, resistências,
calor, temperatura inicial, trajetória ou modelo de dano. Antes do início de
degradação, estados e temperaturas comparados a 1 Hz são exatamente iguais.

Primeiro cruzamento no passo 88569 (369,0375 s): flap traseiro a
900,013170161718 °C. A referência de 900 °C tem integridade
0,9999999890248652; o diagnóstico de 5000 °C tem integridade 1 no mesmo instante
com a mesma temperatura. Aos 410 s: referência com ambos os flaps destruídos,
temperaturas 1041,6533/1043,2377 °C; diagnóstico com integridade 1/1,
temperaturas 1041,5564/1043,1662 °C. Nenhum dos dois tocou a superfície nesse
intervalo. O caso diagnóstico não cruzou 5000 °C; não se afirma que esse limiar
seja seguro, qualificado ou elimine outras falhas.

A montagem existente também usa limiteFlapsC nos fixadores; esse acoplamento
paramétrico já existia e não foi alterado nesta correção. Bateria permanece
termicamente isolada. Depois do dano, trajetórias/temperaturas podem divergir
por resposta física; igualdade pós-dano não é critério de aceitação.
