# M6 — Área projetada e cargas aerodinâmicas

Data: 11/10/2026. Escopo: M6 da auditoria BSS-005/BSS-006, independente da
qualificação de retorno de 15 km do M5.

## Implementação

- `Objeto` pode optar por escalar a área frontal de referência pela projeção da
  sua geometria retangular XY no plano normal ao fluxo relativo. O padrão é
  manter a área configurada constante, preservando objetos sem essa declaração.
- Para o casco do BSS-005/006, `A_ref = 7 m²` representa a face X×Z na atitude
  longitudinal. A largura projetada é
  `w = dimX·|n·eX| + dimY·|n·eY|`, onde `n` é a normal planar ao fluxo relativo e
  `eX/eY` são os eixos locais transformados pela orientação. Logo,
  `A_proj = A_ref·w/dimX`.
- O core calcula `F_arrasto = -½·rho·Cd·A_proj·|v_rel|·v_rel`, com a mesma
  densidade local e velocidade relativa ao ar já usadas pelo mundo. A força é
  integrada no centro de pressão local transformado para coordenadas do mundo;
  quando declarado fora do centro do objeto, o braço gera torque no integrador
  e na ilha estrutural.
- A montagem BSS habilita a projeção no casco. Sua área de casco atua no centro
  do casco. Tanques, propulsor, painel e grid fins continuam objetos separados;
  só acrescentam arrasto quando suas áreas estão configuradas. Nas grid fins,
  a área efetiva de arrasto permanece no caminho único da classe-base e a força
  de sustentação continua separada, sem repetir o arrasto removido em M3.

## Evidência quantitativa

Para as dimensões do casco `3,2 × 6 × 2,4 m`, `Cd = 0,65`, `rho = 1,225 kg/m³`
e velocidade relativa de 50 m/s, a atitude longitudinal dá `A_proj = 7 m²` e
`|F_arrasto| = 6.967,19 N`. Com o corpo lateral ao fluxo vertical, a projeção
passa a `13,125 m²` (`6/3,2` vezes a área longitudinal) e o arrasto a
`13.063,48 N`. O teste M6 também integra uma queda com corpo girando e confirma
que a área muda com a orientação; outro caso verifica que o centro de pressão
deslocado produz torque e correção angular pelo core.

Na regressão de subida BSS-005, a troca de área constante por projeção geométrica
alterou o instante de atingir 15 km de `72,6875 s` para `72,74583 s` e a reserva
registrada de `458,7215 kg` para `456,6821 kg`. A diferença é compatível com a
mudança de arrasto durante a inclinação do veículo. O teste continua cobrindo
somente capacidade de subida; não afirma retorno seguro.

## Limites

Este modelo planar representa um casco retangular e usa `Cd` constante; não
modela curva de `Cd` com ângulo de ataque, número de Mach, Reynolds ou regime de
escoamento. Não calcula sombra/oclusão entre módulos, deformação nem escoamento
tridimensional. Áreas de componentes seguem parâmetros explícitos. O centro de
pressão configurado para o casco representa somente o casco; momentos adicionais
vêm das forças dos componentes aplicadas em suas próprias posições. Esses
resultados são comparação determinística entre orientações, não dados de túnel
de vento nem precisão aerodinâmica real.

## Validação

- `npm test -- src/physics/solucionadores/AerodinamicaM6.test.ts`: **4 aprovados**, incluindo torque transmitido por ilha estrutural.
- `npm test -- src/cenarios/BancadaBss.test.ts`: **9 aprovados**, incluindo
  vento de `-5` e `+5 m/s` e perda elétrica.
- `npm test -- src/physics/objetos/veiculos/Bss05Missao.test.ts`: **1 aprovado**,
  subida a 15 km e balanço de massa.
- `npm test -- src/cenarios/ControleLateralM3.test.ts`: **16 aprovados**.
- `npm test -- src/physics/MundoFisico.test.ts`: **50 aprovados**.
- `npm test -- src/physics/solucionadores/AtmosferaTermicaM4.test.ts`:
  **13 aprovados**.
- `npm run typecheck` e `npm run build`: **aprovados** após a implementação.
- A suíte completa foi iniciada na base e não produziu resumo global após vários
  minutos; foi interrompida (código 130). Não há resultado global declarado.
