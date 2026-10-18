# Reentrada — recuperação de configuração rejeitada

Complexidade: **3/10**. Evidência: captura do operador em Firefox mostra
“Configuração rejeitada: Curso/taxa/carga fora do domínio experimental”,
antes de criar o ensaio. Chrome e Firefox isolados carregam o build atual.
Não há evidência de que branches sejam a causa nem identificação confirmada
do campo editado/restaurado no navegador do operador.

## CONTRATO DE IMPACTO FUNCIONAL

Registrado antes da primeira alteração de produção.
Objetivo: identificar precisamente a entrada rejeitada e recuperar a bancada
por ação explícita, preservando validação e autoridade física.

| Função / assinatura | Mudança, responsabilidade, dependências e efeitos |
|---|---|
| `src/physics/reentrada/ModeloAerodinamicoReentrada.ts::configurarParametrosReentrada(entrada: Partial<ParametrosReentrada> = {}): ParametrosReentrada` | Modificar somente diagnósticos das cinco restrições mecânicas existentes. Mesmos limites, retornos imutáveis e exceções; mensagem inclui chave, valor e limite SI. Não alterar arredondamento/tolerâncias. |
| `src/reentrada.ts::iniciarBancada(): void` | Definir `defaultValue` dos campos de engenharia gerados, registrar ação explícita de restauração e ocultar aviso de cena vazia somente quando houver ensaio válido. Dependências: DOM, fábrica, renderer e executor existentes. |
| `src/reentrada.ts::iniciarBancada.rejeitarConfiguracao(erro: unknown): void` | Reutilizada sem mudança: comunica diagnóstico e atualiza estado. |
| `src/reentrada.ts::iniciarBancada.preparar(configuracao?: ConfiguracaoReentrada): boolean` | Após preparação válida, ocultar aviso sobre canvas; mantém substituição transacional, pausa e diário existente. |
| `src/reentrada.ts::iniciarBancada.restaurarConfiguracaoPadrao(): void` | Nova: `form.reset()` e reinicialização pela porta existente, exclusivamente após clique explícito. Reinicia ensaio preparado, tempo zero. Restaura também os padrões térmicos já aprovados, sem executar automaticamente. |
| `src/reentrada.ts::iniciarBancada.reinicializar(): void` | Reutilizada sem mudança: cancela escolha pendente e prepara valores visíveis. |
| `src/reentrada.ts::iniciarBancada.lerConfiguracao(): ConfiguracaoReentrada` | Reutilizada sem mudança: lê campos visíveis e valida pelo domínio, sem fallback oculto. |

Nenhuma função removida. HTML: aviso inicial visível sobre a cena vazia e botão
explícito de recuperação; o aviso permanece se a primeira preparação falhar.
Unidades: curso em radianos, taxas em rad/s e carga elétrica adimensional;
limites térmicos em °C. Nenhuma mudança de física, `dt`, semente ou materiais.

Aceite: configuração padrão desenha a cena; curso de rolagem `1.5707963267949`
reproduz rejeição com chave/valor/limite; entrada inválida permanece visível;
restaurar padrões recupera cena preparada sem iniciar execução e restaura todos
os campos avançados. Testes focados do validador, tipos, build, documentação e
smoke local nos navegadores. Sem push, merge ou deploy.

## Resultado e validação

Implementado o diagnóstico individual das cinco restrições, aviso sobre cena
não preparada e restauração explícita dos padrões. Os padrões dinâmicos usam
`defaultValue` para participar corretamente de `form.reset()`.

- 6 testes novos do validador e 13 regressões de instrumentação: aprovados.
- 2 smokes do build em Chrome (1440/390 px): aprovados, cobrindo primeira
  preparação rejeitada, aviso, recuperação, rejeição mecânica e preservação da
  entrada, novo reset, limites térmicos padrão, tempo zero e pixels no canvas.
- Firefox 146.0.1 isolado, via BiDi: preparação, rejeição do curso de rolagem
  explicitamente injetado, recuperação e avanço físico de 1 s confirmados.
  Foram observados avisos de timeout no desenho durante diagnóstico headless;
  não se declara validação visual completa do Firefox a partir desses dados.
- Emulador existente em 127.0.0.1:5000: HTTP 200, cena inspecionada com 2072
  cores, início/pausa com 120× disponível, sem erros de console/página ou HTTP.
- `typecheck`, `build`, `docs:gerar`, `docs:verificar`, 23 testes de documentação
  e `site:verificar`: aprovados. Total: **44 testes focados aprovados**.
- Suite integral não reexecutada; permanecem os resultados históricos RE-003.

Evidências: [resumo](../validacoes/reentrada-recuperacao/resumo.json),
[Firefox](../validacoes/reentrada-recuperacao/firefox.json) e
[cena local](../validacoes/reentrada-recuperacao/cenario.png).

O build local foi reconstruído, sem reiniciar o emulador do operador. Recarregar
com Ctrl+Shift+R e usar **Restaurar configuração padrão** recupera a configuração
válida, descartando explicitamente as edições. Não se alterou branch nem se
realizou commit, push, merge ou deploy nesta correção.

Não há evidência suficiente para identificar qual dos cinco campos estava
inválido no navegador original. O arredondamento observado em `valueAsNumber`
do Firefox não prova a origem da entrada: a página lê `Number(input.value)`.
Nenhuma tolerância, conversão automática ou hipótese física foi acrescentada.
