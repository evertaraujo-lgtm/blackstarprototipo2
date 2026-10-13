# M9 — Terra esférica e gravidade central (2D)

Data: 2026-10-12. Base auditada: `450126a`. Complexidade: 9/10.
Autorização: adendo de execução autônoma M9-A–G; commits locais, sem push e sem deploy Firebase.

## M9-A — diagnóstico e proposta antes de alterar a física

Leitura: AGENTS.md completo; plano de engenharia BSS-005 de 2026-10-10, inclusive consolidação M0–M8-A; relatórios Markdown/JSON M0–M6 e voo BSS-006. M7 e M8-A não têm relatórios independentes: as evidências e limites são registrados nas seções 8.7–8.9 do plano anterior e nos testes. Não se presume que M8-B esteja concluída. O pedido M9 autoriza avançar apesar do backlog anterior. Nenhum resultado histórico será reescrito.

Protótipo 1 consultado: `src/js/core/physical_core.js` calcula aceleração em coordenadas radiais/tangenciais com termos de transporte, mas deriva μ de g superficial, limita raio artificialmente e usa atmosfera exponencial. `src/js/world/terra.js` é apresentação. Reaproveitar a separação de responsabilidades, não portar essas aproximações: o novo modelo usa posição/velocidade cartesiana inercial e μ fornecido, sem termos fictícios de Coriolis.

### Hipóteses encontradas e matriz de impacto

| Subsistema/módulos | Hipótese atual | Alteração necessária | Impacto | Risco |
|---|---|---|---|---|
| MundoFisico/IntegradorFisico | g=(0,-9,80665,0), Euler semi-implícito; mesma g em qualquer ponto | CampoGravitacional por posição; qualificação de integração orbital opt-in | Todos os corpos livres | Alto: deriva de energia e alteração de missões antigas |
| ConjuntoEstruturalRigido | Soma peso uniforme em cada membro, dinâmica XY | Campo por membro, incluindo torque de gradiente; preservar CM/inércia/impulsos | Ilhas e separação | Alto: massa variável e ordem da integração |
| SistemaAtmosferico | h=Y; ar com vetor global único; duas camadas extrapoladas | Geometria injetada, altitude radial, limite explícito do perfil | Casco, paraquedas, grid fins | Alto: arrasto duplicado ou vácuo implícito |
| SistemaTermico | rho(Y), mesmo arrasto do core | Consultar mesma geometria e política atmosférica | Convecção, aquecimento e dano | Médio: não qualificar reentrada |
| SuperficiePlano/ResolvedorContatoSuperficie | plano infinito, normal +Y, menor Y; apoio por extremos X; μN por abs(g.y) | Interface de distância assinada/projeção/normal; círculo terrestre no plano; plataformas locais finitas | Apoio, impulso, torque, penetração e atrito | Muito alto: preservar snapshots M7 e regressões |
| MundoFisico/SistemaSensores | tração/fim de curso por Y<=alturaM | Consultar geometria de superfície | Rodas, switches, pernas/sapatas | Alto: proximidade não é força de apoio |
| SensoresVeiculoComposto/SensorNivelInterno | GPS global; altitude=Y-ref, velocidades Vy/Vx; nível=theta; omega inercial | Serviço único de referencial; altitude geométrica, radial/tangencial, atitude/taxa local e inercial distintas | PID/Fuzzy-PID/GNC | Alto: sinal e taxa da vertical móvel |
| ControladorGuiaPousoBss06/BancadaBss | alvo X; Fx global; vento global misturado com velocidades locais; peso g0 | Erro em arco local, projeções de força/vento, g local lido do mundo | Gimbal e grid fins | Alto: manter arbitragem M3 e ganhos |
| ControladorDescidaFuzzyPid | sustentação por massa*g0 | Ler g local via sensores; legado usa g0 | Throttle e frenagem | Médio: sem controlador orbital |
| ControladorPouso/Desaceleracao/Inclinacao/Gimbal/Aletas | grandezas chamadas verticais/horizontais recebidas por interfaces | Fornecer grandezas locais coerentes, sem geometria nos controladores | Transições, PID e sensores obsoletos | Alto: envelope de qualificação limitado |
| EnsaioMissaoBss005 | leitura Y/X, menorY-solo, velocidade absoluta zero em repouso | Leituras geométricas e projeções; Terra estática mantém repouso inercial zero | Primeiro impacto/toque bilateral/repouso | Alto: classificações de falha não virar sucesso |
| TelemetriaMissaoBss/RegistroEnsaioBancada/ReproducaoDiarioBss005 | modelo implícito; replay compara fábrica atual | Versão/constantes/modelo em novos diários; rejeitar modelos incompatíveis; diários antigos explicitamente legados | Reprodutibilidade | Alto: não alegar equivalência histórica |
| testes.ts/sandbox | câmera XY, réguas, linha do solo y constante, ângulos Canvas=-theta | Câmera separada, demonstração orbital mínima após validação | Observação em metros/km | Médio: não mover estado físico |
| ResolvedorColisoes | SAT XY genérico; atrito entre corpos apenas normal quase +Y | Preservar colisões; restrição angular do atrito precisa de extensão específica antes de veículos terrestres planetários | Objetos independentes | Médio: não declarar qualificação global inexistente |
| ChumbadorAoSolo/GuiaLinear/TravaPorta | fundação estática; guia X/Y; trava compensa g0 | Preservar laboratórios legados; Terra estática permite ancoragem montada; rotação futura exige outro contrato | Infraestrutura | Alto se rotação for adicionada incompletamente |
| VeiculoTerrestre | limite de aderência=m*g0 e eixos do chassi | Preservar bancada terrestre; não qualificar tração planetária sem reação normal real | Domínio terrestre | Médio, fora da migração dos BSS |
| Bocal/propulsão química | g0 define Isp | Preservar g0=9,80665 separado do campo μ/r² | Empuxo/consumo | Alto se g local substituir g0 |
| Bss03/Bss04/montagens | coordenadas iniciais locais, thetaZ e peças em XY | Fábrica opt-in com transformação rígida de toda a montagem | BSS-001–006 | Alto: não ajustar massas, forças ou ganhos |

### O que pode ser preservado

Vetor3 e estado SI; Objeto e suas propriedades de massa/integridade/térmica; SAT de caixas orientadas; FixadorEstrutural/ResolvedorEsforcoEstrutural; conexões elétricas, bombas/linhas/válvulas, Bocal e g0 de Isp; atuador de gimbal e limites físicos; aerodinâmica por vetor de fluxo de Aleta/VeiculoAlado/Paraquedas; PID matemático, gerenciador de arbitragem e computador de voo por interfaces; TracePLC, persistência desacoplada e diários antigos. Referências a x/y em rotação de peças e geometria local são operações cartesianas legítimas, não hipóteses de vertical terrestre. Guias/mecanismos e bancadas planas permanecem explicitamente locais.

### Decisões propostas

- Ambiente legado permanece padrão: campo uniforme e referencial plano, integração Euler original. Ambiente terrestre esférico é configuração explícita, independente do ID do BSS.
- Campo gravitacional reutilizável separado da geometria operacional. Terra esférica estática com R=6.371.000 m, μ=3,986004418e14 m³/s², g0=9,80665 m/s² somente referência de Isp. Não calibrar μ para g0.
- Plano orbital XY, z=0, rotação somente em Z. Cenários centrais rejeitam estado inicial/forças fora do plano. Centro C=(0,-R,0), origem inercial translada no ponto inicial de lançamento e eixos fixos. Translação não cria referencial em rotação.
- r=p-C; a=-μr/|r|³; h=|r|-R. er=r/|r|, et=(er.y,-er.x,0); vt=v·et, vr=v·er. Vertical física thetaVertical=atan2(-er.x,er.y); thetaLocal=wrap(thetaInercial-thetaVertical). Taxa local=omegaZ+vt/|r|. Serviço único expõe essas operações e transformações cartesianas locais de uma âncora fixa; arco s=R atan2(rx,ry) é posição operacional no plano, não longitude geográfica.
- JS number/Float64: escala de ~1e7 m oferece resolução absoluta da ordem de nanômetros; verificar round-trip e conservação. Posição renderizada é diferença para câmera, nunca nova posição física.
- Propor kick–drift–kick para gravidade variável como opção do ambiente central; forças não gravitacionais continuam pelo passo operacional original, sem duplicar consumo/ignição. Reavaliar gravidade em cada corpo/membro após drift. Não substituir Euler globalmente. Qualificação de dois corpos em vácuo e sem propulsão; forças dissipativas mantêm erro de primeira ordem.
- Superfície geométrica com material separado por contrato. Manter classe SuperficiePlano/material e normal +Y para legado; adicionar círculo terrestre e plano local com orientação/extensão finita. Solver usa distância assinada, normal e projeções tangenciais, incluindo CM efetivo, fixadores, energia e calor.
- Perfil atmosférico M4 intacto até 20 km. Ambiente central requer política explícita: transição simplificada para vácuo entre 20 e 25 km (hipótese numérica, não fronteira física); órbitas de validação usam vácuo explícito desde o início. Ambiente antigo preserva extrapolação histórica identificada. Ar e solo estáticos no inercial, vento/rajadas vetoriais documentados.
- Rotação terrestre fica para fase posterior: definir fundação móvel, ar solidário, vPlataforma=Ω×r e limites geométricos 2D antes de ativar. Não representar latitude/longitude reais, inclinação orbital ou manobras fora do plano.

### Estratégia quantitativa de validação (definida antes da implementação)

Exatidão algébrica: erros relativos <=1e-12 para campo/projeções (altitude/round-trip absoluto <=1e-8 m); singularidade central rejeitada, sem regularização arbitrária. Campo exterior pontual somente: não é gravidade de interior da Terra.

Órbita circular de 400 km: velocidade sqrt(μ/r), período 2π sqrt(r³/μ); qualificar dt<=1 s em vácuo por 3 voltas. Orçamento inicial: excursão radial <=10 m, erro relativo de energia <=1e-6, momento angular <=1e-10, erro de período <=0,1 s/volta. Esses limites atendem observação de órbita em km com precisão métrica e não navegação real; validar convergência ao reduzir dt, sem relaxar limites para passar. Avaliar Euler e KDK com mesmos estados e passos 1/0,5/0,25 s, registrar também dt exploratório maior. Elipse e=0,1, perigeu=R+400 km: erro de apsides <=10 m, energia <=1e-6 e período <=0,1 s. Queda radial curta: direção/momento angular e energia <=1e-6. Escape: energia abaixo/próxima/acima de zero e raio crescente; não classificar elipse com perigeu dentro da Terra como órbita utilizável.

Contato: comparar plano antes/depois sem alterar tolerância de observação 2 mm; testar orientações cardinais e oblíquas, impulso normal/atrito/calor/dano/ruptura, ilhas e apoio bilateral, contato após ruptura e ausência de apoio. Não encobrir 34 mm por tolerância nova. Camada atmosférica: pontos M4/continuidades, mesmo rho para core/térmica/superfícies, vácuo sem arrasto/convecção. Sensores: mesma geometria em todo o círculo, idade/congelamento/atraso/desvio e taxa da vertical; observação não altera física. Controle: gimbal/fin/throttle por portas existentes em montagens transformadas, saturação/sem energia/sem fluxo, sem mudar ganhos.

### Matriz de regressões e sequência

| Marco | Entrega | Regressão/qualificação |
|---|---|---|
| M9-A | Esta auditoria + inventário versionado; somente documentação | Base, tipos/build; CI remoto não executado sem push |
| M9-B | Campo uniforme/central + constantes | A/B, singularidade, massas e direções; cenários intactos |
| M9-C | Referenciais 2D + integração opt-in | C–G, circular/elipse, energia/h, passos, ilhas e eventos |
| M9-D | Altitude radial/atmosfera/contato | Core plano, atmosfera M4, círculo em todos os quadrantes, dano/fixadores |
| M9-E | Sensores, GNC, telemetria, modelo/replay | M3/M4/M5/M8-A, local vs inercial, modelo incompatível |
| M9-F | Campanha BSS-001–006 legado vs central | Decolagem, subida/apogeu, consumo, descida/apoio/danos/falhas; diferenças explícitas |
| M9-G | API ambiental e demonstração mínima qualificada | Separação/suborbital/replay, build, smoke e comandos do CI local; sem BSS-007 |

### Pendências históricas preservadas

M5-B/C: diário manual de 15 km não disponível, retorno não qualificado; missão que ativa pouso ainda na subida não substitui esse perfil. M7: penetração histórica ~34 mm em 600 s sem causa/objeto confirmado, emApoio inclui proximidade 2 mm sem impulso positivo e corte bilateral retido não comprova apoio posterior. M8-B: falhas combinadas/por fase e recuperação ainda incompletas. Sem Mach/stall/CFD, radiatividade/reentrada orbital, balanço térmico integral de propulsão ou rotação terrestre. Nenhuma dessas pendências desaparece com a gravidade central.

## Evidências por marco

M9-A: auditoria de fonte completa por busca, documentação preservada. TypeScript e build aprovados (Vite, 12,05 s); git diff --check aprovado. Suíte completa de base iniciada, ainda sem resumo global neste commit: nenhum sucesso global presumido. Até aqui 3 testes de telemetria/replay e 7 da trava passaram. Validação orbital usará exclusivamente corpos de prova inertes com posições/velocidades iniciais explícitas, sem dependência de qualquer BSS ou decolagem. CI remoto não consultável para commits não publicados; validações locais não serão chamadas de CI verde.

### M9-B — campo isolado concluído

`CampoGravitacional`, `CampoUniforme` e `CampoCentral` adicionados sem ligação aos cenários. Constantes separadas de g0; g superficial calculado=9,820250487 m/s². Sete testes isolados aprovados: superfície/15/100/400 km em cinco posições angulares, continuidade e singularidades. TypeScript/build (4,64 s) aprovados após corrigir a inferência TypeScript literal do parâmetro μ; sem mudança numérica. CI remoto não executado (sem push).

Base: suíte ampla interrompida após timeout BSS-003 (90 s). Caso está sendo repetido isoladamente antes de atribuir falha ao código; a física nova ainda não estava conectada. Não se declara aprovação global.

### M9-C — referenciais e dinâmica de dois corpos concluídos

Ambiente plano preserva Euler e configurações anteriores; ambiente central opt-in usa KDK gravitacional. O mundo aplica meia contribuição gravitacional, drift/forças operacionais existentes e meia contribuição no estado novo. Ilhas recebem força em cada membro, incluindo torque de gradiente; as filas de força/impulso, consumo e contatos continuam no pipeline único. Sem troca global do integrador. Referencial público para altitude/arco/radial/tangencial, transformações de âncora e atitude/taxa local; estado/comandos centrais fora de XY rejeitados. Telemetria orbital osculadora distingue energia, interceptação de superfície e trajetórias ligadas/de escape.

Corpos de prova Objeto inertes, material já declarado pelos testes do core (limite térmico 1000 °C), sem foguete, propulsão, decolagem ou manobra. Vácuo explícito. Velocidade circular=7672,598648 m/s; período analítico=5544,855096 s. Período medido pelo cruzamento interpolado de voltas completas, não pelo período analítico da telemetria.

| Caso | dt(s) | Voltas | Excursão/erro apsides (m) | Erro período(s) | Erro energia relativo máximo | Erro momento angular relativo máximo |
|---|---:|---:|---:|---:|---:|---:|
| verlet-gravitacional, e=0 | 1 | 3 | 4.34712 | 0.00237327 | 4.13558e-13 | 1.12133e-14 |
| verlet-gravitacional, e=0 | 0.5 | 3 | 1.08678 | 0.000593319 | 6.4948e-14 | 2.15383e-14 |
| verlet-gravitacional, e=0 | 0.25 | 3 | 0.271696 | 0.00014833 | 6.89448e-14 | 3.37508e-14 |
| verlet-gravitacional, e=0 | 1 | 3 | 4.34712 | 0.00237327 | 4.13558e-13 | 1.12133e-14 |
| verlet-gravitacional, e=0 | 1 | 1 | 4.34712 | 0.00237327 | 4.1056e-13 | 1.12133e-14 |
| euler-semi-implicito, e=0 | 1 | 1 | 3840.65 | 0.00504313 | 1.28404e-06 | 3.33067e-15 |
| verlet-gravitacional, e=0.1 | 1 | 1 | 4.55052 | 0.00241093 | 1.00048e-07 | 7.77156e-15 |
| verlet-gravitacional, e=0.1 | 0.5 | 1 | 1.13519 | 0.000602732 | 2.50121e-08 | 9.76996e-15 |

Todos os limites quantitativos definidos na M9-A foram atendidos pelo KDK. Elipse e=0,1: período 6494,211629 s, apogeu analítico 1904666,667 m. Queda radial, escape 0,99/1/1,01×v_escape, singularidade/planaridade, ilhas/ruptura e repetição determinística cobertos. Falhas iniciais foram uma comparação extra sem fundamento exigindo melhoria por fator 1000 (substituída por comparar ambos contra o orçamento de 10 m previamente estabelecido) e assert Object.is distinguindo -0; nenhum limite físico foi afrouxado. Independência da massa é conferida com arredondamento Float64 explícito.

72 testes aprovados (55 do core legado + 17 do campo/dinâmica); após melhoria da medição de período os 10 orbitais passaram novamente. TypeScript/build (3,45 s) e diff-check aprovados. Base BSS-003 isolada passou em 57,25 s sem aumento do timeout de 90 s; timeout na execução ampla atribuído à concorrência no ambiente. CI remoto ainda não executado, sem push.

Limites: gravidade KDK de segunda ordem no problema conservativo; drag/propulsão mantêm discretização operacional explícita e requerem passos de bancada. dt<=1 s qualificado para corpos inertes no exterior terrestre; atmosfera/solo/sensores centrais ainda serão integrados nos marcos seguintes. Modelo não possui rotação planetária ou propagação 3D.

### M9-D — atmosfera e geometria de superfície concluídas

SuperficieFisica separa contrato geométrico/material; plano legado permanece disponível. SuperficieEsferica é secção circular XY (Z somente espessura de geometria), com distância radial, normal externa e candidatos em arestas de geometria convexa, incluindo tangência no interior de face. SuperficiePlanoLocal representa face superior estática finita e orientada, sem virar plano global. Resolvedor compartilhado projeta apoios na tangente e usa g·normal no atrito; preserva cada snapshot de primeiro impulso e energia, dano e ruptura. Sensores de contato e detecção de tração consultam a mesma geometria. Chumbadores continuam fundações estáticas, não Terra em rotação.

Atmosfera e térmica consultam uma única altitude geométrica; perfil M4 intacto em 0–20 km. Ambiente central usa transição suave 20–25 km para vácuo, identificada como hipótese simplificada. Legado mantém extrapolação identificada. Flags de proximidade/contato/impulso se somam ao emApoio histórico; o sinal histórico não é reclassificado silenciosamente como sustentação contínua.

102 testes distintos pertinentes aprovados nas execuções finais: 55 core, 13 M4, 4 switches, 13 esféricos, 10 veículos terrestres legados, 4 fixadores, 3 arraste de switch. Cobertura nova: contato/repouso nas cinco direções, apoios bilaterais em 0/90°, atrito/calor, impacto destrutivo com ruptura e preservação de impulso, plataforma finita, ausência de sustentação em proximidade, vácuo radial/sem convecção e fundação/switch a 90°. Fixtures iniciais corrigidas para declarar compressão de fixador, sinal PLC numérico e resistência estrutural obrigatória; nenhum critério de aceitação foi relaxado. TypeScript/build (2,61 s) aprovados. Chrome real iniciou BSS-001 por controles, t=5,896 s, empuxo=26 kN, vazão=2,60 kg/s, consumo positivo e zero erros JS. Sem deploy.

Limitações: superfície usa a geometria convexa declarada dos corpos; não há relevo/CCD ou lados sólidos da plataforma (modelar infraestrutura volumétrica como Objetos). Normal e velocidade da superfície são contratos separados; todas as superfícies desta fase são estáticas. Atrito entre corpos independentes ainda tem envelope quase horizontal legado e tração terrestre ainda usa g0 paramétrico; esses mecanismos de laboratório não são qualificados como transporte planetário. Investigação dos 34 mm continua aberta; tolerância de contato 2 mm preservada.

### M9-E — sensores, controles e telemetria concluídos (13/10)

O mundo injeta o ambiente nos sensores antes do primeiro passo. GPS continua posição inercial; altitude/radial/tangencial/atitude e taxa local vêm do referencial único. Taxa inercial fica separada. Fuzzy-PID recebe gravidade local para sustentação; guiagem BSS-006 recebe vento e carga tangencial projetados, arco do alvo (com erro pelo menor arco), braço do motor no casco e leituras locais. Arbitragem/ganhos/cursos não foram alterados. Controladores antigos com throttle de sustentação calibrado permanecem paramétricos; sua qualificação central será medida, não presumida. Montagem de BSS-005/006 aceita ambiente explícito e âncora por arco, transformando os estados iniciais de todos os módulos/pernas antes de registrá-los; não há transformação cinemática durante voo.

Telemetria distingue atitude local/inercial, g local e osculadores orbitais. Leituras/alturas de contato do ensaio BSS-005 consultam a geometria real do mundo. Novos diários incluem revisão/modelo, R, μ, g0, integração, maxDt, densidade, política atmosférica e rotação zero. Replay rejeita modelo incompatível; diário antigo sem modelo requer opção explícita permitirDiarioLegadoSemModelo e o resultado identifica a reexecução, sem alegar equivalência histórica. Mesma revisão continua necessária; não há snapshots importados no core.

62 testes distintos aprovados: 10 sensores/controle M9, 3 sensores M8, 6 computador, 8 Fuzzy-PID, 15 guiagem, 5 replay, 10 BancadaBss, 3 telemetria M4 e 2 diário. Regressões completas BSS-006 preservaram pouso em 80/300 m, alvos ±34,7 m, vento ±5 m/s, ausência de ignição e dano na falha elétrica; trace continua lendo deflexão real. Teste M4 reproduziu voo com/sem trace e estados finais iguais. Montagem a 90° decolou pelas mesmas portas de energia/ignição com uma autoridade de gimbal; ensaios orbitais continuam independentes desses veículos.

Correção adicional necessária de sensores: amostra congelada agora permanece retida além da janela de histórico de 60 s (caso de 70 s coberto). Descarte do histórico por cursor preserva amostras/tempo e evita shift O(n) por subpasso. Atraso usa a última amostra <= instante solicitado; a quantização de até um passo é testada, em vez de presumir interpolação contínua. Limite de obsolescência 0,25 s preservado. TypeScript/build (3,65 s), diff-check e smoke Chrome da bancada aprovados, zero erros JS. CI remoto não executado.

### M9-F — regressão integrada e estado de qualificação (13/10)

As fábricas reais da tela BSS-002/003/004 foram extraídas sem alterar dimensões, massa, materiais, energia, empuxo, reservas ou ganhos; seis fábricas compartilhadas aceitam ambiente explícito. Campanha usa 65%, mudança manual na subida a 80 m (corte para BSS-001/002, modo pouso para os demais) e watchdog observacional 120 s. É um perfil de comparação, não uma missão manual de 15 km nem uma declaração universal de pouso. JSON completo: docs/validacoes/2026-10-13-m9-bss-comparacao.json.

Achado adicional obrigatório: a geometria SAT/AABB legada podia escolher Z como eixo de menor penetração, inclusive após ruptura de ilhas. Isso contrariava dinâmica orbital estritamente 2D e foi detectado pela rejeição do core na campanha BSS-001/002. Agora contato entre corpos e pontos de superfície operam explicitamente em XY no ambiente central; espessura em Z não produz movimento/torque fora do plano. Legado conserva sua resolução anterior. Atrito entre corpos centrais usa vertical local para o envelope de apoio. Este achado completa/corrige a descrição inicial de SAT predominantemente XY da M9-A. Quatro regressões novas cobrem placas finas alinhadas/giradas, queda de placa e opt-in vs seleção Z legada. Nenhuma componente cinemática é apagada como correção posterior: o impulso é calculado no plano correto.

| BSS | Apogeu legado/central (m) | Consumo até observação legado/central (kg) | Resultado do perfil nos dois ambientes |
|---|---:|---:|---|
| BSS-001 | 106.536 / 106.413 | 16.369 / 16.380 | dano no retorno balístico sem controle de pouso |
| BSS-002 | 106.380 / 106.384 | 16.369 / 16.391 | dano no retorno balístico sem controle de pouso |
| BSS-003 | 85.306 / 85.208 | 21.997 / 16.097 | íntegro; apoio bilateral contínuo não qualificado |
| BSS-004 | 100.501 / 100.398 | 67.393 / 68.355 | íntegro; apoio bilateral contínuo não qualificado |
| BSS-005 | 117.310 / 117.219 | 506.143 / 512.601 | íntegro; apoio bilateral contínuo não qualificado |
| BSS-006 | 111.861 / 111.664 | 589.221 / 606.525 | íntegro; apoio bilateral contínuo não qualificado |

Diferenças de apogeu <0,2 m neste envelope: campo superficial 9,82025 versus g0 legado 9,80665, drift KDK versus Euler e instante discreto de mudança em 80 m. Os consumos são totais até 120 s e incluem atuação pós-toque: BSS-003 mantém throttle de sustentação paramétrico 0,6; transições discretas/contacto alteram esse regime sem reajustar ganhos. No retorno destrutivo BSS-001, contato posterior de casco difere (-8,51 versus -2,81 m/s) porque destroços deixam de escapar pelo eixo Z no novo modelo; primeiro impacto e dano continuam separados do toque do veículo. Não atribuir todas as diferenças exclusivamente a g.

**Qualificação separada:** BSS-006 preserva vínculos, integridade 1 e toque a aproximadamente -0,1200/-0,1204 m/s. Repouso geométrico dentro dos limites históricos da bancada >=3 s foi observado nos dois ambientes (maior janela: 78,1417/18,6917 s). Já a maior janela com apoio bilateral contínuo foi somente 0,02083 s em ambos, abaixo dos mesmos 3 s exigidos. Não se relaxou limite nem se declarou pouso bilateral seguro. A asserção inicial que pressupunha qualificação bilateral falhou também no legado; foi corrigida para testar e registrar explicitamente as duas classificações, preservando a reprovação bilateral. Essa é extensão observacional do backlog M7, não solução dos 34 mm. BSS-003/004/005 deste perfil de 80 m também não recebem qualificação de repouso bilateral; ganhos/materiais não foram ajustados para fabricar sucesso.

Falha elétrica BSS-006: queda, integridade mínima zero e rupturas nos dois ambientes. Ausência de ignição: zero empuxo e zero consumo nas 12 combinações BSS/ambiente. Campanha comparativa de oito testes executada (sete passaram inicialmente; pressuposição bilateral foi investigada e dois BSS006 repetidos com classificação corrigida). 55 core, 4 colisões planares, 13 superfície/atmosfera e 10 orbitais aprovados. Os seis BSS passaram no Chrome, com tempo/ignição/consumo positivos e zero erros JS; coletor corrigido para escopo lexical e para solicitar throttle 65% no BSS-003 (nasce a zero). TypeScript/build aprovados; verificação final de suíte completa prevista no M9-G. CI remoto sem execução, sem push.

M9-F entregue como campanha/regressão e matriz explícita de qualificação; NÃO qualifica todos os pousos nem o retorno de 15 km. A aprovação do núcleo conservativo/orbital não equivale à qualificação dos veículos ou do apoio contínuo de foguetes altos.

## Inventário de ocorrências na base (reproduzível)

Busca em todo `src`, exceto testes: `posicaoM.y|velocidadeMps.[xy]|alturaM|gravidadeTerrestreMps2|9.80665`. Este índice lista todas as linhas encontradas, inclusive geometria cartesiana legítima e laboratórios preservados. Cada ocorrência deve ser interpretada com a matriz acima; contagem não implica que toda linha deva mudar.

| Arquivo | Linhas na revisão auditada |
|---|---|
| `src/cenarios/BancadaBss.ts` | 242, 243, 254, 264, 280, 282, 325, 336, 337, 368, 370, 392 |
| `src/cenarios/EnsaioMissaoBss005.ts` | 105, 118, 121, 128, 129, 152 |
| `src/physics/MundoFisico.ts` | 49, 118, 199, 309, 312, 322, 323, 375, 386 |
| `src/physics/SuperficiePlano.ts` | 10, 21 |
| `src/physics/cenarios/EnsaioPortaVertical.ts` | 62, 63 |
| `src/physics/conexoes/GuiaLinear.ts` | 32, 33, 43, 44, 46 |
| `src/physics/conexoes/JuntaRotacionalDeBancada.ts` | 50 |
| `src/physics/geometria/ContatoCaixasOrientadas.ts` | 47, 59, 80, 91, 101, 113, 121 |
| `src/physics/objetos/base/ObjetoTriangularRetangulo.ts` | 27, 29, 30, 31 |
| `src/physics/objetos/mecanismos/TravaPorta.ts` | 53, 54, 85, 95, 108 |
| `src/physics/objetos/propulsao/combustao/Bocal.ts` | 3 |
| `src/physics/objetos/veiculos/VeiculoAlado.ts` | 45 |
| `src/physics/objetos/veiculos/VeiculoTerrestre.ts` | 146 |
| `src/physics/sensores/SistemaSensores.ts` | 58 |
| `src/physics/sensores/SwitchFimDeCurso.ts` | 15, 37, 46, 123, 124, 125 |
| `src/physics/sistemas de controle/ControladorDescidaFuzzyPidDePropulsores.ts` | 38 |
| `src/physics/sistemas de controle/ControladorGuiaPousoBss06.ts` | 111 |
| `src/physics/solucionadores/ResolvedorContatoSuperficie.ts` | 58, 112, 264 |
| `src/physics/solucionadores/SistemaAtmosferico.ts` | 10, 42 |
| `src/physics/solucionadores/SistemaTermico.ts` | 21 |
| `src/testes.ts` | 261, 267, 270, 275, 278, 280, 284, 289, 290, 293, 299, 300, 350, 354, 357, 362, 390, 391, 454, 514, 551, 552, 554, 597, 601, 602, 646, 647, 648, 822, 827, 858, 859, 860, 864, 865, 867, 892, 893, 931, 944, 963, 964, 991, 992, 1020, 1024, 1118, 1189, 1231, 1319, 1360, 1367, 1368, 1422, 1423, 1425, 1459, 1460, 1462, 1494, 1495, 1497, 1532, 1533, 1534, 1536, 1572, 1632, 1675, 1696, 1697, 1708, 1713, 1757, 1831, 1971, 2021, 2067, 2103, 2104, 2125, 2143, 2144, 2150, 2151, 2175, 2177, 2178, 2190, 2200, 2216, 2698, 2699, 2710, 2712, 2735, 2755, 2787, 3181, 3520 |
