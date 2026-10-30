# Black Star Space · RE-004 — Arquitetura e física térmica
**18/10/2026 · Estudo de implementação**

## Identidade física
Os componentes seguem a arquitetura central **Objeto**:
```text
Objeto
├── OrbitadorReentrada (+ RedeTermica)
├── AletaAerodinamica → FlapReentrada (+ RedeTermica)
└── FonteEletrica → Bateria (+ RedeTermica)
```
Os flaps e a bateria se conectam ao corpo com `FixadorEstrutural`. A `RedeTermica` **não é um objeto mecânico separado**, mas um estado térmico de cada corpo. As massas regionais não acrescentam massa mecânica ao conjunto. Não migrar o RE-001 para `VeiculoComposto` nesta etapa; o futuro orbitador completo com propulsão/tanques deve empregar `VeiculoComposto`.

## Localização no código
| Arquivo | Responsabilidade |
|---|---|
| `src/physics/reentrada/ConfiguracaoTermicaReentrada.ts` | perfis `sem-tps` / `tps-experimental`; hipóteses de materiais |
| `src/physics/termica/RedeTermica.ts` | condução, radiância, capacidade, temperatura e integridade de regiões |
| `src/physics/solucionadores/SistemaTermico.ts` | aplica aquecimento e evolui energia no núcleo |
| `src/physics/objetos/base/Objeto.ts` | instala a rede em um objeto e traduz dano regional |
| `src/cenarios/EnsaioReentrada.ts` | instala as redes no cenário e exporta observação |

## Equações
- Indicador Sutton–Graves: `fluxo ~ sqrt(rho / R) * V^3` (aproximação de estagnação, **não mapa local de superfície**).
- Condução: `P = G * (T_A - T_B)`.
- Radiação: `P = emissividade * sigma * A * (T_superficie[K]^4 - T_ambiente[K]^4)`.
- Convecção ambiente é simplificada e dependente de densidade; a rede usa 270 K como ambiente radiativo equivalente, sem Sol/Terra separado.
- Dano superficial faz a condutância térmica aumentar em direção à estrutura.

## Parâmetros do ensaio RE-004 orbital
| Nó | Capacidade equivalente | Área exposta | Início de dano |
|---|---:|---:|---:|
| Corpo, superfície | 2.000 kg × 1.000 J/(kg·°C) | 80 m² | 1.100 °C |
| Corpo, estrutura | 70.000 kg × 800 | 0 | 800 °C |
| Corpo, interior | 6.900 kg × 900 | 0 | 80 °C |
| Flap, superfície | 30 kg × 1.000 | 2 m² | 900 °C |
| Flap, estrutura | 420 kg × 500 | 0 | 800 °C |
| Flap, articulação | 50 kg × 600 | 0 | 120 °C |
| Bateria | 100 kg × 1.000 | 0 | 60 °C |

**Todos são equivalentes hipotéticos, não especificações certificadas de material.**

## Limitações
1. Ataque e rolamento não distribuem diretamente o aquecimento entre ventre, dorso, nariz e faces dos flaps. O efeito de AoA no calor é sobretudo via trajetória.
2. Uma superfície com integridade zero ainda possui capacidade térmica e emissividade; a remoção física de TPS não é representada.
3. Sutton–Graves e raio efetivo não validam o fluxo médio de toda a superfície de 80 m².
4. Não há material qualificado, ablação, perfis dependentes de temperatura, tensão térmica, CFD ou mapa 3D.
5. O ensaio ainda tolera cargas aerodinâmicas de dezenas de g sem dano estrutural proporcional.

## Decisões
Preservar herança `Objeto`, não separar milhares de placas e não migrar a montagem para `VeiculoComposto` agora. Melhorias devem preservar balanço de energia e determinismo a dt fixo.
