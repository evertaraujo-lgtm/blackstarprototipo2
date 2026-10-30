# RE-004 — entrega

## Implementação

Rede optante no core, com três regiões por corpo/flap e nó próprio da bateria.
Calor aero entra uma vez na superfície; condução conserva energia; radiação
Stefan–Boltzmann funciona inclusive no vácuo. Dano superficial, estrutural e do
mecanismo são separados. Dano estrutural térmico soma ao dano mecânico anterior.
Objetos sem rede e diários RE-003 preservam seu modelo concentrado.

Configuração avançada: **sem TPS**, **TPS experimental** e **legado**. Materiais,
capacidades, emissividades, condutâncias e limites regionais são hipóteses
editáveis, identificadas no editor e no JSON. Os antigos limites 1100/900 °C
migram explicitamente para superfície; estrutura 800 °C, interior 80 °C e
articulação 120 °C são hipóteses separadas. Bateria mantém 60 °C, com condução
interna configurada e sem geração/reações químicas presumidas.

Arquivos principais: `physics/termica/RedeTermica.ts`, `SistemaTermico.ts`,
`Objeto.ts`, `FixadorEstrutural.ts`, `ConfiguracaoTermicaReentrada.ts`,
`OrbitadorReentrada.ts`, `FlapReentrada.ts`, `AletaAerodinamica.ts`,
`EnsaioReentrada.ts`, entrada/interface `reentrada` e `RenderizadorReentrada.ts`.
[Contrato e hipóteses](../../planos-codex/2026-10-18-re004.md),
[impacto por função](../../planos-codex/RE004-IMPACTO-FUNCOES.md).

## Comparação com RE-003

Receita: 120 km, 7700 m/s, γ=−1°, α=40°, automático, semente 1, dt=1/240 s.
Corpo/flaps: limites superficiais ou concentrados 5000 °C; bateria 60 °C.
Janela **900 s**, 216000 passos por perfil, 648000 no total. Controle legado
executado em árvore arquivada do commit `9db1ef9`; históricos não foram alterados.

| Perfil | Pico corpo superfície / estrutura | Pico máximo flap superfície / estrutura | Bateria em 900 s | Resultado na janela |
|---|---:|---:|---:|---|
| RE-003 concentrado | 216,1 °C uniforme | 2480,5 °C uniforme | 20,000000 °C | Estruturas íntegras |
| RE-004 sem TPS | 1239,5 / 280,2 °C | 3132,0 / 1624,8 °C | 20,136030 °C | Colapso dos flaps em 430,6 e 431,1 s |
| RE-004 TPS experimental | 1325,7 / 21,1 °C | 1687,3 / 23,4 °C | 20,000524 °C | Estruturas íntegras na janela |

Picos da tabela são amostrados a 1 s; o JSON também registra picos por passo.
No CSV legado, as colunas de regiões repetem a temperatura uniforme do objeto;
não representam regiões independentes no modelo antigo.
O perfil sem TPS cruza o limite estrutural do primeiro flap em 366,3 s; sua
perda de controle altera a trajetória. Legado e TPS conservam trajetória idêntica
na janela e terminam ainda a **77,7 km de altitude**. Não se afirma sobrevivência
à reentrada completa nem pouso. Não há teto de 1600 °C.

O maior resíduo numérico por objeto foi 0,01635 J, frente a 13,61 GJ de calor
incidente total no TPS; resíduo final somado 0,01660 J. Condução entre objetos
cancela até erro de ponto flutuante. O balanço dos nós fecha; o fluxo SG é fonte
prescrita e **não fecha o balanço energético do escoamento**.

[Curvas PNG](curvas-temperatura.png) · [SVG](curvas-temperatura.svg) ·
[PDF](curvas-temperatura.pdf) · [CSV](curvas.csv) ·
[balanço térmico](balanco-termico.png) · [resumo numérico](comparacao-resumo.json).
Os 429/5160 °C citados no prompt não foram reproduzidos nesta janela; a duração
daquela captura não foi fornecida. Não se ajustou receita para forçar os valores.

## Validação

- **126/126 testes focados aprovados**, incluindo legado, dano combinado,
  vácuo radiativo, condução, bateria, incidência única, TPS, pulso de 120 s,
  estabilidade/convergência 1/240–1/480 e replay regional.
- **4/4 smokes de interface aprovados** em 1440/390 px: edição, limites,
  downloads, JSON inválido restaurado, recuperação e cena desenhada.
- Rodada integral: **706 testes, 685 aprovados, 21 falhas**. A lista coincide
  exatamente com as 21 divergências históricas anteriores; nenhuma referência
  foi requalificada. [Classificação](classificacao-suite.json).
- A revisão posterior de dano combinado acrescentou um teste e recebeu a rodada
  focada acima; o caminho nominal foi preservado sem recompor seus bits.
- Tipos, build, documentação AST e recursos institucionais verificados.
- Compatibilidade: 480 passos no código antigo e atual produzem resultados
  idênticos no mesmo Node/V8. Replay exato entre Chrome e Node já apresenta
  diferença numérica no legado; não se relaxou comparação nem se regravou diário.
  [Evidência](compatibilidade-legada.json).
- Firefox isolado: parâmetros, regiões, avanço de 1 s e captura verificados.
  Houve warning de timeout no renderer headless; sem qualificação de desempenho
  prolongado. [Evidência](firefox.json).
- Tentativas sob carga e diferença de runtimes ficam em `tentativas/`; falhas de
  orçamento foram reexecutadas com timeout de teste declarado, sem alterar física.

Limitações: sem ablação, CFD, plasma, entalpia de parede quente, visada radiativa
variável, geração interna da bateria ou qualificação dos materiais. As pequenas
variações reais da bateria são exibidas com seis casas na UI regional.

Fontes primárias: [NASA TR R-376, Sutton–Graves](https://ntrs.nasa.gov/citations/19720003329)
e [NIST CODATA, Stefan–Boltzmann](https://physics.nist.gov/cgi-bin/cuu/Value?sigma).
Demais calibrações são hipóteses ajustáveis, conforme contrato.

Commit autorizado na `codex/re-002`. Sem merge ou deploy.
