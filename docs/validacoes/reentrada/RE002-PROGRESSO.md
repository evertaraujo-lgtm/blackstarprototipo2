# RE-002 — acompanhamento da campanha

Atualizado em 30/10/2026. Branch `codex/re-002`, base `0da1392`.

## Autorização e limites

Autorização expressa do operador para executar RE-002A–E sequencialmente,
inclusive commits locais estáveis. Sem deploy, alterações no Protótipo 1,
operações destrutivas no histórico ou mudanças físicas destinadas a forçar um
resultado. P01–P12 permanecem hipóteses provisórias com suas condições.

## Estado inicial

- O histórico já contém correção demonstrada de momento angular intrínseco,
  instrumentação por passo, campanhas e um supervisor/controlador protótipo de
  aproximação. Esses trabalhos serão reutilizados e auditados, sem duplicar
  modelos nem apagar suas evidências.
- Há evidência do ensaio RE-001 de 600 s: a 77,2 km, aproximadamente
  7.247 m/s; flaps acima de 900 °C desde ~369 s e integridade zero por ~405 s.
- Há campanhas finais RE-002 do branch, inclusive varreduras suborbitais
  iniciadas a 65 km/2.500 m/s. Elas não substituem a varredura solicitada na
  referência orbital de 120 km/7.700 m/s.
- O caminho de cena ativo continua identificado como RE-001. Ainda não foi
  encontrado ensaio independente que compare perfis de desaceleração orbital,
  registre cruzamentos Mach no passo efetivo e faça pitch-up desde estados
  observados.
- Permanecem fora do índice: `firebase-debug.log` e `img/blackbase.png`.

## Marcos

| Etapa | Estado | Próxima ação |
|---|---|---|
| RE-002A — diagnóstico | Concluída (diagnóstico preliminar) | Base reproduzida e qualificação numérica preliminar registrada; não é qualificação de voo. |
| RE-002B — desaceleração | Concluída (matriz experimental) | Oito casos atmosféricos e um caso de vácuo registrados; cruzamentos Mach e integridade coletados por passo. |
| RE-002C — aproximação | Concluída (lei de guia experimental) | Lei cinemática de velocidades terminais implementada e testada; integração a voo requer montagem RE-002E com motores reais. |
| RE-002D — pitch-up | Concluída (resultado negativo) | α=70° e 80° também perdem flaps antes dos marcos Mach; a descida terminal termina em contatos repetidos sem recuperação controlada. |
| RE-002E — propulsão | Concluída (ensaio interrompido por falha física) | Montagem real de objetos e permissivos executada; rotação não estabilizou, houve contato destrutivo aos 25,15 s. |

Nenhum perfil desta campanha demonstrou recuperação controlada. O orçamento de
coleta não é evento de sucesso; o contato final de RE-002E foi destrutivo.

## RE-002A — reprodução da revisão corrente

- Comando: `REENTRADA_EVIDENCIAS_DIR=docs/validacoes/reentrada/RE002-A npm run reentrada:validar`.
- `RE-002-r4`, 600 s, `dt = 1/240 s`, 144.000 passos; saída em
  `RE002-A/ensaio-600s.json`.
- Estado final: 77.208,773 m, 7.246,989 m/s, `v_r = −181,92 m/s`,
  `v_t = 7.244,705 m/s`; não é pouso nem recuperação.
- Máximos amostrados: fluxo térmico indicador 360.162,567 W/m², corpo
  138,909 °C e 0,491755 g. Flaps degradam em ~369 s e colapsam em 405,458 s e
  405,875 s; controle falha em 405,462 s. Corpo íntegro ao fim desse orçamento.
- Resultado: finitude e contabilidade do ensaio, sem qualificação de voo.
  Limites térmicos e materiais são hipóteses preliminares, não certificados.

## RE-002B — resultados da matriz orbital

Condições atmosféricas comuns: 120 km, 7.700 m/s, trajetória inicial −1°,
α físico inicial 40°, massa inicial 80.000 kg e `dt = 1/240 s`. O orçamento
atmosférico é 838 s. Os perfis usam o mesmo core e diferem nos alvos listados
em cada JSON.

- α=30°, 40°, 55°, 70° e 80° chegam aos marcos Mach depois de os flaps
  colapsarem. α=30°
  cruza Mach 10/5/2/1/0,8 em 746,05/749,02/753,86/755,71/755,71 s; Mach 1
  ocorre a 17,3 m e 340,2 m/s, seguido de contatos e destruição do corpo.
  α=55° cruza Mach 10 em 632,12 s (~14,23 km) e Mach 1 em 648,62 s
  (~15,18 km), também sem autoridade; termina em contatos, não em recuperação.
- α=40° cruza Mach 10, 5, 2, 1 e 0,8 pela primeira vez em
  715,43/717,76/723,61/732,56/736,82 s. Flaps em integridade zero e controle
  falho. Ao fim: 2.246,38 m, 209,65 m/s, `v_r = −209,62 m/s`, `v_t = 3,53 m/s`;
  sem contato, mas em descida rápida e sem controle terminal.
- Duas agendas de mudança de α em Mach 5 e Mach 1 foram aceitas, mas
  reproduziram exatamente a trajetória α=40°. Foram emitidas após a falha do
  controle (~405,46 s), sem efeito físico mensurável.
- O corte elétrico em Mach 2 também ocorreu após a falha de flaps e repetiu a
  trajetória α=40°; não representa teste com atuadores íntegros.
- α=70° cruza Mach 10 em 596,06 s e Mach 1 em 612,43 s; α=80° em 597,03 s e
  613,40 s. Em ambos os casos, os flaps já têm integridade zero. A segunda
  passagem descendente por Mach 0,8 ocorre a ~8,11 km em 686,93 s (70°) e
  687,89 s (80°), com velocidade total ~246,1 m/s, sem controle. Ambos os
  corpos terminam próximos da superfície após contatos repetidos; isso é
  assentamento físico descontrolado, não recuperação.
- A primeira hipótese de vácuo usou trajetória orbital descendente e cruzou a
  Terra (~560,26 s), com colisão e colapso dos flaps; não mede conservação em
  voo livre. O caso foi corrigido para órbita circular (`v = sqrt(μ/r)`,
  trajetória 0°). Em 600 s, sem contato, altitude final 119.999,964 m e
  variação de energia específica −0,0197058 J/kg (erro relativo ~6,4×10⁻¹⁰);
  `ω_z` varia de −0,00118608 para −0,00118062 rad/s.
- Evidências passo a passo: `RE002-B/*.json`. O orçamento não interrompe a
  física por evento de sucesso.

## RE-002C — guia de aproximação e energia

- `ControladorAproximacao` agora calcula velocidade horizontal admissível por
  `sqrt(2 a d)` e velocidade vertical de descida por `sqrt(2 a h)`, converte
  erros de velocidade em acelerações limitadas, compensa a gravidade local e
  calcula throttle/gimbal para uma lista explícita de propulsores. Requer
  amostra válida, idade ≤0,25 s, massa instantânea, gravidade e alvo adiante.
- A lei emite apenas solicitações arbitradas; não inicia ignição nem escreve
  cinemática. Montagem pressupõe eixos de motor paralelos ao +X do casco e cada
  motor deve ser declarado com empuxo e limite de gimbal próprios. Sem alvo,
  sensores, atuadores ou com alvo ultrapassado, não cria força; falha de sensor
  pede throttle zero aos motores configurados.
- Teste determinístico: com 80.000 kg, dois motores de 1 MN, `d=1.000 m`,
  `h=1.000 m`, `v_h=300 m/s`, `v_v=−50 m/s`, `g=9,8 m/s²`, a lei pede
  `v_h*=100 m/s`, `v_v*=−20 m/s`, acelerações líquidas `−5/+5 m/s²`,
  empuxo vertical equivalente a 14,8 m/s², throttle 0,625 e gimbal saturado
  em 0,2 rad. Os testes cobrem sensores inválidos, alvo ultrapassado e `dt`.
- A fronteira de recuperação é mais restritiva que este guia: α=40° na segunda
  descida Mach 0,8 tem `h≈6.756 m`, `v_r≈−250,53 m/s` e flaps destruídos. A
  distância ideal para zerar a componente vertical é ~6.276 m a 5 m/s²,
  ~15.690 m a 2 m/s² e ~31.376 m a 1 m/s². Mesmo a hipótese de 5 m/s² deixa
  somente ~480 m de margem ideal e não inclui orientação, rampas, limites de
  empuxo nem perdas; sem flaps íntegros não existe autoridade aerodinâmica.
- A montagem de RE-001 não contém propulsão, logo esta etapa valida lei e
  pedidos, não uma recuperação fechada. A integração e o ensaio do mundo real
  de propulsores pertencem a RE-002E.

## RE-002D — tentativa de pitch-up aerodinâmico

- Foram executados perfis α=70° e 80° com a mesma massa, atmosfera, passo e
  condições orbitais de RE-002B. A integridade de ambos os flaps chega a zero
  perto de 398 s; a perda de controle é registrada em ~398 s, antes dos
  cruzamentos de Mach 10 (~596–597 s).
- Na segunda passagem descendente por Mach 0,8, a atitude local está em torno
  de −2,23 rad, contra a verticalização necessária, com flaps destruídos. Os
  estados finais em ~4 m e velocidade ~0,037 m/s resultam de contatos
  repetidos com o solo; não provam pitch-up, pouso controlado nem integridade
  após uma recuperação.
- Conclusão: elevar o alvo de ângulo de ataque não recupera autoridade depois
  da falha térmica/aerodinâmica das superfícies nesta configuração.

## RE-002E — montagem propulsiva e resultado

- O ensaio reaproveita `PropulsorVetorizado`, cadeia de metano/oxigênio,
  válvulas, bombas, câmara, bocal, bateria, `VeiculoComposto`,
  `FixadorEstrutural`, sensores e controladores existentes. Todos os corpos
  participantes são registrados no mesmo `MundoFisico`; ignição é solicitada
  explicitamente e a massa instantânea cai com o consumo.
- A escala experimental usa 78.900 kg de casco, 2,4 MN de empuxo máximo,
  Isp=350 s, mistura O/F=4, 3.600 kg de metano, 14.400 kg de oxidante,
  gimbal limitado a 15° e atmosfera padrão 1,225 kg/m³. O empuxo e as massas
  são hipóteses de ensaio ancoradas no modelo interno BSS-005; não descrevem
  hardware certificado.
- Estado inicial reproduz a segunda passagem descendente Mach 0,8 de α=40°:
  h=6.755,829 m, `v_r=−250,526 m/s`, `v_t=7,380 m/s` e veículo invertido.
  Para desaceleração vertical líquida ideal de 8 m/s², a parada exige
  ~3.923 m (sem orientação, perdas, gimbal nem margem); a janela inicial é
  curta.
- Comando explícito de ignição foi aceito. A rotação com um motor vetorizado
  não estabilizou: o gimbal atingiu seu limite e a atitude oscilou. Houve
  contato aos 25,15 s, a 19,72 m, com velocidade vertical −20,07 m/s,
  velocidade horizontal −43,80 m/s e taxa angular 2,22 rad/s. A integridade
  do casco caiu a zero. Restavam ~786 kg de metano e ~3.145 kg de oxidante;
  a massa do conjunto caiu de ~105,9 t para 79 t por consumo e ruptura de três
  fixadores (tanques e propulsor), que deixaram de compor a ilha estrutural. O
  propulsor permaneceu íntegro como objeto independente.
- Resultado: impacto destrutivo movido por empuxo reproduzido e dano mensurável
  no `Objeto`; recuperação não alcançada. A oscilação do controlador e a
  compatibilidade da janela de altitude/autoridade angular ficam como lacunas
  para o próximo marco, sem correção artificial da trajetória.
- Evidência detalhada: `RE002-E/ensaio-verticalizacao-propulsiva.json`;
  reprodução: `npm run re002:propulsiva`.

## Validação final de código e artefatos

- `npm run typecheck`: aprovado.
- Testes direcionados do controlador e da montagem E: 6/6 aprovados.
- `npm run docs:gerar` e `npm run docs:verificar`: aprovados, 1.675/1.675
  contratos documentais e nenhum item pendente.
- `npm run build`: aprovado.
- `npm test`: 91 arquivos aprovados e 10 com falha; 694 testes aprovados,
  23 falhos, 11 ignorados e um erro não tratado. Os erros abrangem equivalência
  de referências M10/snapshots existentes, desempenho e replay, expectativa de
  texto Markdown e tentativa de abrir `127.0.0.1` (EPERM no sandbox). A base
  histórica registrava 22 falhas, mas não foi rodada de novo em checkout limpo;
  portanto esta execução não atribui causalidade por teste individual.
- Nenhuma interface foi modificada. `firebase-debug.log` e `img/blackbase.png`
  são arquivos não relacionados e permanecem fora dos artefatos da campanha.
