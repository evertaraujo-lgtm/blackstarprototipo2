# Validação de voo completo do BSS-006

O ensaio executa a montagem real da bancada: decolagem do solo, seleção do
modo Pouso durante a subida, passagem pelo apogeu, descida controlada, contato
das sapatas e observação após o toque. A fábrica foi extraída para
`src/cenarios/BancadaBss.ts`, compartilhada pela tela e pela regressão.

## Falhas reproduzidas e correções

- A guia anterior comandava uma força lateral que produzia torque contrário
  ao das grid fins. Após inclinar o casco, o empuxo aumentava a deriva para o
  lado errado. No alvo X = 0, trocando para Pouso a 300 m, o foguete tocava
  perto de X = 242 m, com velocidade horizontal de 16,5 m/s, e rompia vínculos.
  Agora ambos os atuadores perseguem a mesma atitude física em direção ao alvo.
- Dividir a correção pelo empuxo quase nulo saturava o gimbal quando o motor
  cortava. A referência passa a considerar também o peso instantâneo.
- O corte por altitude ocorria até 1 cm antes do solo. O foguete acelerava
  novamente para baixo, religava potência e podia romper o vínculo do tanque.
  No BSS-006, o corte depende da leitura geométrica de contato das sapatas,
  com tolerância de 1 µm. A velocidade-alvo final é 0,15 m/s.

Os parâmetros e a lógica dos BSS anteriores foram preservados. O controlador
compartilhado mantém seu comportamento anterior quando o sensor opcional de
contato não é fornecido. Nenhuma posição ou velocidade é imposta para pousar.

## Resultados

Atmosfera: 1,225 kg/m³; passo fixo: 1/240 s; throttle de decolagem: 65%.
A troca para Pouso foi solicitada a 300 m, ainda subindo; o apogeu foi 358,4 m
na leitura GPS. Velocidades abaixo são medidas imediatamente antes da resposta
física ao primeiro contato, em módulo.

| Alvo X (m) | X no toque (m) | Vertical (m/s) | Horizontal (m/s) | Erro horizontal (m) |
| --- | --- | --- | --- | --- |
| 0 | 0,529 | 0,131 | 0,001 | 0,529 |
| +34,7 | +35,122 | 0,131 | 0,027 | 0,422 |
| −34,7 | −34,065 | 0,131 | 0,028 | 0,635 |

Todos completaram o pouso com empuxo zero, combustível restante, integridade
de 100% em todos os corpos e nenhum fixador rompido. A regressão observa pelo
menos 3 s contínuos de repouso: casco abaixo de 0,05 m/s, cada componente
abaixo de 0,1 m/s e velocidade angular abaixo de 0,01 rad/s. Essa tolerância
admite as pequenas oscilações numéricas do apoio sem congelar corpos.

Também foi executado um voo curto com troca a 80 m e apogeu de 107,5 m. Na
interface, o Chrome local operou os botões de sistemas, ignição, início do
teste e seletor de modo. A simulação avançou pelo loop real de animação a
30×, completou o pouso e observou mais de 3 s de repouso, sem erros de tela.

Na perda elétrica após a decolagem, controle e propulsão ficaram indisponíveis.
A queda rompeu vínculos e destruiu uma sapata, confirmando dano físico
mensurável. Selecionar Pouso sem ignição também foi coberto: não houve
decolagem nem consumo de propelente.

Os resultados qualificam os percursos descritos acima. Um ciclo até 15 km
exige validação própria da reserva de combustível e da curva de descida.

## Reprodução

```sh
npm test -- src/cenarios/BancadaBss.test.ts 'src/physics/sistemas de controle/ControladorGuiaPousoBss06.test.ts' 'src/physics/sistemas de controle/ControladorDescidaFuzzyPidDePropulsores.test.ts'
npm run typecheck
npm run build
```

Na tela `tests.html`, selecione BSS-006, ligue elétrica → hidráulica →
combustível → controle, deixe throttle em 65%, realize a ignição e inicie
o teste. Selecione Pouso quando a altitude GPS atingir 300 m e acompanhe até
o motor cortar após o contato e o veículo estabilizar nas sapatas.

As leituras dos três voos, do ciclo pela interface e da perda elétrica estão
em [bss06-voo-completo.json](bss06-voo-completo.json).
