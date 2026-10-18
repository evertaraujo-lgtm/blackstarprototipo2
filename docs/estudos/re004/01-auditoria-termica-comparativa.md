# Black Star Space · RE-004 — Auditoria térmica comparativa

**Estudo de engenharia didático · 18/10/2026 · Versão 1.0**

## Síntese
O RE-004 passou de uma temperatura uniforme por objeto para uma rede de regiões térmicas com superfície, estrutura e interior. As curvas respondem de modo qualitativamente correto à velocidade, densidade, radiação e atraso por isolamento. **Não há validação quantitativa das temperaturas absolutas nem certificação de materiais.**

## Diários e condições
| Ensaio | Diário | Altitude inicial | Velocidade | AoA alvo | TPS | Observação |
|---|---|---:|---:|---:|---|---|
| RE-004 suborbital | `blackstar-RE-001(9).json` | 120 km | 3.000 m/s | 40° | experimental | sem dano térmico estrutural antes do contato aos 705,9 s; flap superficial com limite de 5.000 °C |
| RE-004 orbital | `blackstar-RE-001(10).json` | 120 km | 7.700 m/s | 40° | experimental | TPS do flap limitado a 900 °C; danos estruturais começam em 1.472,7 s |
| RE-002 antigo | `blackstar-RE-001(3).json` | 120 km | 7.700 m/s | 40° | sem rede regional | primeiro flap colapsa em ~405,46 s |
| RE-002 5.000 °C | `blackstar-RE-001(8).json` | 120 km | 7.700 m/s | 40° | sem rede regional | teste artificial de causalidade, primeiro flap colapsa em ~1.778,76 s |

Os ensaios **não são um experimento A/B exclusivo de TPS**: há mudanças de limites térmicos ou condições iniciais.

## Picos antes do contato, amostragem de 1 Hz
| Grandeza | RE-004 3.000 m/s | RE-004 7.700 m/s |
|---|---:|---:|
| Corpo, superfície | 350,3 °C | 1.218,6 °C |
| Corpo, estrutura | 20,24 °C | 306,3 °C |
| Corpo, interior | ~20,0 °C | 26,7 °C |
| Flap dianteiro, superfície | 863,0 °C | 1.982,8 °C |
| Flap dianteiro, estrutura | 21,0 °C | 864,7 °C |
| Flap dianteiro, articulação | 20,02 °C | 73,3 °C |
| Bateria | 20,0 °C | 20,6 °C |
| Pressão dinâmica máxima | 22,6 kPa | 512,0 kPa |
| Carga máxima | 7,97 g | 36,6 g |

Os máximos são amostrados a cada segundo; os extremos entre passos de 1/240 s podem ser ligeiramente maiores. Exclui o aquecimento por contato após tocar o solo.

## Temperatura × velocidade × ângulo no RE-004 a 7.700 m/s
| Tempo | Velocidade | Altitude | Ataque | Corpo superficial | Flap superficial |
|---|---:|---:|---:|---:|---:|
| 200 s | 7,73 km/s | 87 km | 40,0° | 336 °C | 898 °C |
| 300 s | 7,58 km/s | 73,5 km | 39,6° | 1.112 °C | 1.548 °C |
| 800 s | 6,90 km/s | 71 km | 39,4° | 968 °C | 1.572 °C |
| 1.400 s | 4,92 km/s | 63 km | 39,1° | 877 °C | 1.385 °C |
| 1.600 s | 3,99 km/s | 55 km | 16,4° | 779 °C | 1.294 °C |
| 1.690 s | 3,21 km/s | 26 km | -5,6° | 1.119 °C | 1.891 °C |

O pico tardio apesar da redução de velocidade é plausível, pois o mergulho leva o orbitador a densidades atmosféricas maiores.

## Sequência de falhas do ensaio a 7.700 m/s
- 200 s: primeiros excessos de 900 °C na superfície dos flaps.
- 230,7–230,8 s: integridade das superfícies dos flaps cai a zero.
- 298,3 s: corpo externo ultrapassa 1.100 °C.
- 1.472,7 s: estrutura do flap traseiro excede 800 °C e degrada; flap dianteiro segue em 1.474,7 s.
- ~1.500–1.650 s: perda progressiva de autoridade e de ângulo de ataque.
- 1.700,9 s: colapso do flap traseiro e falha de controle.
- 1.702,3 s: colapso do dianteiro.
- 1.765,8 s: contato destrutivo do corpo.

**Importante:** a superfície com integridade zero ainda conserva capacidade térmica e emissividade no modelo. Isso não equivale à eliminação física da proteção.

## Comparação com veículos reais
| Referência | Dado externo | Conclusão pertinente |
|---|---|---|
| Space Shuttle | ~7,9 km/s e ~40° de ataque hipersônico; TPS cerâmico em regiões até ~1.260 °C e carbono-carbono em regiões mais quentes | RE-004 tem ordens de grandeza próximas, mas nós térmicos não correspondem a faces locais de uma nave real |
| Shuttle, estrutura | limite nominal de alumínio ~177 °C | os ~306 °C de estrutura do corpo Black Star seriam excessivos para uma estrutura de alumínio projetada como a do Shuttle |
| NASA, NTRS 20080042413 | ~60 kW/m² no ventre central; ~600 kW/m² no bordo de ataque | RE-004 calcula indicadores ~360 kW/m² para corpo e ~720 kW/m² para flaps na fase controlada; posições não equivalentes |
| Starship, estudo CEAS | cerâmica e manta isolante sobre aço; artigo assume limite superficial ~1.870 K (~1.597 °C) | **hipótese de pesquisa, não medição real de voo** |

A integral aproximada do **indicador de fluxo** no RE-004 7.700 m/s até contato foi ~335 MJ/m² no corpo e ~669 MJ/m² no flap. O valor de referência externo da região central inferior do Shuttle é de ordem ~60 MJ/m². **O indicador de estagnação aplicado à área equivalente não é diretamente comparável ao fluxo local real.** A carga térmica acumulada é um alerta importante para calibrar a distribuição aerotérmica.

## Veredito
**Coerência das tendências: BOA. Previsão quantitativa de temperatura: LIMITADA.** Prioridade: distribuição de incidência por ângulo e região, integral térmica e comportamento do TPS destruído. Não alterar controladores e materiais simultaneamente para forçar sobrevivência.

## Fontes
- Diários completos: `blackstar-RE-001(9).json`, `blackstar-RE-001(10).json`, `blackstar-RE-001(3).json`, `blackstar-RE-001(8).json`.
- Commit do núcleo regional: `efd696740ffae4a3a9aa0d73627950f1bde00d5b`.
- NASA, história do TPS: https://www.nasa.gov/history/sts1/pages/tps.html
- NASA NTRS, fluxo aerotérmico: https://ntrs.nasa.gov/citations/20080042413
- NASA NTRS, integridade de placas: https://ntrs.nasa.gov/citations/19820030853
- Herberhold et al., CEAS Space Journal: https://doi.org/10.1007/s12567-025-00625-8

> Universo Black Star ficcional, ensaios de simulação reais. Não existe qualificação de voo.
