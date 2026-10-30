# BLACK RISE — Relatório da campanha experimental RE-002

**Data:** 30/10/2026
**Revisão simulada:** `RE-002-r4`
**Branch:** `codex/re-002`
**Status:** campanha A–E executada; nenhuma recuperação foi demonstrada.

## Escopo e leitura dos resultados

Este relatório reúne a reprodução da referência, comparação de desaceleração,
guia de aproximação, ensaio de pitch-up e montagem propulsiva. Os ensaios usam o
mesmo core físico do projeto. O término de um orçamento de coleta ou o repouso
depois de múltiplos contatos não equivale a recuperação controlada.

As propriedades térmicas, estruturais, aerodinâmicas e de propulsão são
hipóteses experimentais da revisão identificada. Não constituem limites
certificados, nem qualificação de um veículo real. Os fatores de escala BSS-005
da montagem E são internos ao protótipo.

## Resumo executivo

- **A:** a reprodução de 600 s preserva o estado orbital, mas não demonstra
  reentrada ou pouso; flaps colapsam por volta de 405 s.
- **B:** perfis α=30°, 40°, 55°, 70° e 80°, duas agendas em Mach e um corte
  elétrico foram comparados; todos chegam aos marcos de baixa velocidade com
  superfícies de controle já falhas. Um caso separado em vácuo conserva energia
  específica com erro relativo de aproximadamente `6,4×10⁻¹⁰`.
- **C:** um controlador de aproximação emite solicitações limitadas de
  throttle/gimbal a partir de sensores, massa e gravidade; testes determinísticos
  validam a lei, não uma recuperação de voo.
- **D:** α=70° e 80° não recuperam autoridade após a falha térmica dos flaps.
- **E:** um motor vetorizado físico consome propelente e reduz massa, mas a
  verticalização oscilou. O impacto ocorreu a 25,15 s e destruiu o casco; isso
  confirma dano estrutural mensurável, não recuperação.

## A — reprodução da referência

Execução: `REENTRADA_EVIDENCIAS_DIR=docs/validacoes/reentrada/RE002-A npm run reentrada:validar`.

`RE-002-r4`, 600 s, `dt=1/240 s`, 144.000 passos. Ao final: altitude
77.208,773 m, velocidade 7.246,989 m/s, componente radial −181,92 m/s e
tangencial 7.244,705 m/s. Máximos amostrados: fluxo térmico indicador
360.162,567 W/m², temperatura do corpo 138,909 °C e 0,491755 g. Os flaps
degradam por volta de 369 s e colapsam em 405,458 s e 405,875 s; o controle
falha perto de 405,462 s. O corpo permanece íntegro no fim do orçamento, ainda
em órbita. Evidência: [`RE002-A/ensaio-600s.json`](RE002-A/ensaio-600s.json).

## B — matriz de desaceleração

Condições comuns dos casos atmosféricos: altitude inicial 120 km, velocidade
7.700 m/s, trajetória −1°, α inicial 40°, massa 80.000 kg, atmosfera terrestre
padrão de 1,225 kg/m³ e `dt=1/240 s`. O orçamento atmosférico é 838 s. Os
cruzamentos Mach estão interpolados entre passos consecutivos e incluem a
integridade dos flaps e a disponibilidade do controle.

| Perfil | Resultado ao fim do orçamento | Achado principal |
|---|---|---|
| α=30° | 838 s; Mach 1 a 17,3 m e 340,2 m/s; contatos e corpo destruído | Margem terminal insuficiente. |
| α=40° | 2.246 m; 209,65 m/s; `v_r=−209,62 m/s`; sem contato | Descida rápida sem controle terminal. |
| α=55° | ~4 m e 0,049 m/s após contatos | Repouso físico descontrolado, flaps destruídos. |
| α=70° | ~4 m e 0,037 m/s após contatos | Perda dos flaps antes de Mach 10; sem pitch-up controlado. |
| α=80° | ~4 m e 0,037 m/s após contatos | Resultado próximo ao α=70°; sem autoridade de controle. |
| Agenda α40→30→55 em Mach | Igual à trajetória α=40° | Comandos chegaram após falha de controle (~405,46 s). |
| Agenda α40→55→30 em Mach | Igual à trajetória α=40° | Comandos chegaram após falha de controle (~405,46 s). |
| Corte elétrico em Mach 2 | Igual à trajetória α=40° | Não isolou efeito com atuadores íntegros. |

Referências de cruzamento: α=40° cruza Mach 10/5/2/1/0,8 pela primeira vez
em 715,43/717,76/723,61/732,56/736,82 s. α=55° cruza Mach 10 em 632,12 s
(~14,23 km) e Mach 1 em 648,62 s (~15,18 km). α=70° cruza Mach 10/Mach 1
em 596,06/612,43 s; α=80° em 597,03/613,40 s. Nos dois últimos perfis, a
segunda passagem descendente por Mach 0,8 acontece a ~8,11 km, sem flaps
íntegros ou controle disponível.

O primeiro caso de vácuo foi descartado como ensaio de conservação porque a
condição inicial descendente colidiu com a Terra perto de 560,26 s. O caso
corrigido usa órbita circular a 120 km, `v=sqrt(μ/r)`, trajetória 0° e vácuo
declarado explicitamente. Após 600 s sem contato, a altitude é 119.999,964 m e
a energia específica varia −0,0197058 J/kg (erro relativo ~`6,4×10⁻¹⁰`).

Dados completos: [`RE002-B/resumo.json`](RE002-B/resumo.json) e arquivos
individuais em [`RE002-B`](RE002-B).

## C — guia de aproximação

`ControladorAproximacao` calcula envelopes de velocidade por
`v*=sqrt(2ad)` (horizontal) e `v*=−sqrt(2ah)` (vertical), limita erros de
velocidade em aceleração, considera a gravidade e converte a aceleração pedida
em solicitações de throttle e gimbal para motores explicitamente configurados.
Ele não comanda ignição nem escreve posição, velocidade ou orientação. Exige
leituras válidas e recentes, massa, gravidade e alvo adiante; em falha de sensor
ou ultrapassagem do alvo, solicita throttle zero.

No caso determinístico de 80.000 kg, dois motores de 1 MN, `d=h=1.000 m`,
`v_h=300 m/s`, `v_v=−50 m/s` e `g=9,8 m/s²`, resulta
`v_h*=100 m/s`, `v_v*=−20 m/s`, aceleração líquida horizontal/vertical de
−5/+5 m/s², throttle 0,625 e gimbal saturado em 0,2 rad. A configuração
pressupõe eixos de motor alinhados com +X local do casco; é uma lei
experimental, não resultado de voo integrado.

Na segunda descida Mach 0,8 do perfil α=40°, a distância vertical ideal de
parada é ~6.276 m a 5 m/s², enquanto a altitude observada é ~6.756 m. Esta
estimativa não inclui orientação, rampas de comando, limites reais de empuxo,
arrasto, perdas ou margem operacional.

## D — pitch-up aerodinâmico

Os casos α=70° e 80° perdem integridade dos flaps perto de 398 s, muito antes
dos cruzamentos Mach 10 (~596–597 s). Na segunda descida por Mach 0,8, a atitude
local está em torno de −2,23 rad, com superfícies destruídas. O estado final
próximo de 4 m e velocidade ~0,037 m/s decorre de contatos repetidos com o
solo; não é evidência de manobra nem pouso controlado.

## E — montagem propulsiva

A montagem usa `VeiculoComposto`, casco de 78.900 kg, `PropulsorVetorizado`,
cadeia existente de metano/oxigênio (válvulas, linhas, bombas, câmara e bocal),
bateria, tanques e quatro fixadores estruturais, todos registrados como
objetos no mesmo `MundoFisico`. Configuração experimental: empuxo máximo
2,4 MN, Isp 350 s, O/F=4, 3.600 kg de metano, 14.400 kg de oxidante e gimbal
limitado a 15°. Ambiente atmosférico padrão de 1,225 kg/m³. A ignição é uma
operação explícita; não há inserção direta de força ou estado cinemático.

Condição inicial copiada da segunda passagem descendente Mach 0,8 do perfil
α=40°: altitude 6.755,829 m, `v_r=−250,526 m/s`, `v_t=7,380 m/s` e atitude
invertida. A solicitação de ignição foi aceita. Durante 25,15 s, o gimbal
atingiu o limite e a rotação oscilou, sem completar uma verticalização
estável. O casco colidiu a 19,72 m com `v_v=−20,07 m/s`, `v_h=−43,80 m/s` e
`ω=2,22 rad/s`; a integridade do casco caiu a zero. O propulsor permaneceu
íntegro. Restaram ~786 kg de metano e ~3.145 kg de oxidante. A massa do conjunto
caiu de ~105,9 t para 79 t por consumo e ruptura de três fixadores (tanques e
propulsor), que deixaram de compor a ilha estrutural. O propulsor permaneceu
íntegro como objeto independente. O resultado demonstra ignição, consumo,
mudança de composição, ruptura de vínculos e impacto destrutivo com dano
mensurável no objeto. Não demonstra desaceleração ou recuperação controlada.

Evidência reproduzível: [`RE002-E/ensaio-verticalizacao-propulsiva.json`](RE002-E/ensaio-verticalizacao-propulsiva.json); comando `npm run re002:propulsiva`.

## Conclusão e limitações

Nenhum dos perfis A–E satisfaz uma recuperação controlada. A campanha revela
dois bloqueios encadeados: perda térmica das superfícies antes da desaceleração
final, e controle angular propulsivo insuficiente na tentativa integrada da
etapa E. O evento destrutivo da etapa E atende ao ensaio de dano por impacto
movido a empuxo; não transforma a tentativa em sucesso de missão.

Todos os parâmetros de resistência térmica, material, aerodinâmica,
propulsão, estrutura e ganhos de controle são dados experimentais do
protótipo. Resultados não devem ser extrapolados para hardware real. A
próxima investigação exige resolver a autoridade e estabilidade de atitude e
reavaliar a janela de altitude antes de declarar qualquer recuperação.

## Validação de software

- `npm run typecheck`: aprovado.
- Testes direcionados do controlador e da montagem E: 6/6 aprovados.
- `npm run docs:gerar` e `npm run docs:verificar`: aprovados; 1.675/1.675
  funções com contrato, zero pendências de revisão e catálogo/mapa atualizados.
- `npm run build`: aprovado.
- `npm test`: 91 arquivos passaram, 10 falharam; 694 testes passaram, 23
  falharam, 11 foram ignorados, com 1 erro não tratado. As falhas se concentram
  em referências/determinismo M10 e snapshots de desempenho, replay e montagem;
  também houve uma expectativa textual divergente em teste de Markdown. O
  teste de build do site encontrou `listen EPERM` em `127.0.0.1` no sandbox.
  O histórico documental anterior registrava 22 falhas da suíte, mas esta
  execução não foi repetida sobre a base limpa para atribuir cada diferença.
- Nenhuma interface visual foi alterada; o build foi usado como validação de
  integração da aplicação.
