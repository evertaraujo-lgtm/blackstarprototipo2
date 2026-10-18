# Black Star Space · RE-004 — Caderno de próximos ensaios
**18/10/2026 · Protocolo técnico, versão 1**

## Receita-base
Altitude 120.000 m; velocidade 7.700 m/s; ângulo de ataque 40°; trajetória -1°; rolamento 0°; controle automático; semente 1; passo físico 1/240 s; coleta 1 Hz. Perfil `tps-experimental`, limites superficiais corpo 1.100 °C, flaps 900 °C, bateria 60 °C; configuração regional exportada por inteiro.

## Sequência de experimentos
1. **E1 — Ângulo de incidência:** adicionar pequenas regiões equivalentes de ventre, dorso, nariz e flaps, com exposição contínua em função de AoA. Não alterar a trajetória inicialmente; comparar carga total absorvida e distribuição.
2. **E2 — Falha do TPS:** comparar retenção versus perda da capacidade/emissividade superficial, com mecanismo explicitamente justificado. Não inventar colapso apenas para obter curvas desejadas.
3. **E3 — Sensibilidade:** variar separadamente emissividade, condutância, capacidade equivalente e temperatura limite. Registrar fluência térmica, máximos e atraso de aquecimento.
4. **E4 — Controle degradado:** estudar correção de autoridade dos flaps após estabilizar o modelo térmico. Não alterar simultaneamente controle e aquecimento.
5. **E5 — Passo de integração:** repetir 1/240 e 1/480 s e comparar estados, energia e eventos; velocidade visual 240×/500× não deve alterar física.

## Pacote obrigatório por voo
- Commit/revisão e configuração integral, incluindo dt e semente;
- V, altitude, AoA, trajetória, q, carga g, fluxo, calor por área acumulado;
- Temperatura e integridade de superfície, estrutura, articulação e bateria;
- Linha do tempo de limites, degradações, perda de alimentação, controle e contato;
- Resíduos de energia e diferença entre pico amostrado e pico por passo;
- Separação entre resultados em voo e eventos posteriores ao contato.

## Critérios de aceitação
A/B deve alterar **uma família de parâmetros por vez**. Não tratar proximidade de temperatura com Shuttle/Starship como validação. Manter limites de domínio e falhas claras. O objetivo é explicabilidade didática, não certificação aeroespacial nem pouso artificialmente bem-sucedido.

## Próxima prioridade
Distribuição térmica por ângulo e carga integrada. Depois revisar a semântica do TPS destruído. O controlador dos flaps fica para um ensaio separado.

**Referências internas:** estudos 01 e 02; diários RE-004 `(9)` e `(10)`; implementação commit `efd6967`.
