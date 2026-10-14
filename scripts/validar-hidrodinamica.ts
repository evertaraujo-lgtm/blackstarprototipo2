import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { MundoFisico } from '../src/physics/MundoFisico';
import { Objeto } from '../src/physics/objetos/base/Objeto';
import { Vetor3 } from '../src/physics/Vetor3';
import { AmbienteTerrestre } from '../src/physics/ambiente/AmbienteFisico';
import { GeografiaCosteira } from '../src/physics/ambiente/GeografiaCosteira';
import { RegiaoAquatica } from '../src/physics/agua/RegiaoAquatica';
import { SistemaHidrodinamico } from '../src/physics/agua/SistemaHidrodinamico';

/** Coletor de evidências: corpos inertes no mesmo mundo, sem motor ou navegador. */
function criar(massaKg: number, d: Vetor3, h: number, v = Vetor3.zero, theta = 0, omega = 0, dt = 1 / 240) {
  const ambiente = new AmbienteTerrestre(), ref = ambiente.referencial;
  const costa = new GeografiaCosteira(ref, { inicioArcoM: -100, profundidadeM: 50, larguraRampaM: 50, larguraFundoM: 1000, nivelMarM: 0 });
  const agua = new RegiaoAquatica('agua-de-prova', costa, 1000);
  const o = new Objeto({ id: 'inerte', massaBaseKg: massaKg, dimensoesM: d, resistenciaColisaoJ: 25_000,
    limiteTermicoC: 1000, estadoInicial: { posicaoM: ref.posicaoPorArcoM(0, h), velocidadeMps: v,
      orientacaoRad: new Vetor3(0, 0, theta), velocidadeAngularRadps: new Vetor3(0, 0, omega) } });
  const m = new MundoFisico(dt, { ambiente, regioesAquaticas: [agua], densidadeAtmosfericaKgM3: 1.225 });
  m.registrarObjeto(o); m.registrarGeometriaAquatica(o, { dimensoesM: d, coeficienteArrasto: 1 });
  return { m, o, agua, ambiente };
}
function avancar(p: ReturnType<typeof criar>, segundos: number) {
  for (let n = 0; n < Math.round(segundos * 240); n++) p.m.avancar(1 / 240);
  return { estado: p.o.getEstadoFisico(), imersao: p.m.obterImersao(p.o)[0], integridade: p.o.integridadeEstrutural, massaKg: p.o.massaKg };
}
const estatico = [2, 0, -2].map((h, i) => {
  const p = criar(1000, new Vetor3(2, 2, 1), h), s = p.m.obterImersao(p.o)[0], volumeAnaliticoM3 = [0, 2, 4][i];
  const forcaAnaliticaN = volumeAnaliticoM3 * 1000 * p.ambiente.campo.aceleracaoEm(s.centroEmpuxoM ?? p.o.getEstadoFisico().posicaoM).magnitude;
  return { h, volumeAnaliticoM3, volumeMedidoM3: s.volumeSubmersoM3, forcaAnaliticaN, forcaMedidaN: s.forcaEmpuxoN.magnitude };
});
const equilibrio = avancar(criar(1000, new Vetor3(4, 1, 1), 0.4), 120);
const densoProva = criar(6000, new Vetor3(2, 2, 1), -3), denso = avancar(densoProva, 5);
const terminalAnaliticaMps = Math.sqrt(2 * (6000 - 1000 * 4) * densoProva.ambiente.campo.aceleracaoEm(denso.estado.posicaoM).magnitude / (1000 * 2));
const angular = [{ d: new Vetor3(4, 2, 1), GM: 0.5 + 16 / 12 - 1 }, { d: new Vetor3(1, 8, 1), GM: 2 + 1 / 48 - 4 }].map(({ d, GM }) => {
  const p = criar(4000, d, 0, Vetor3.zero, 0.001), s = p.m.obterImersao(p.o)[0];
  const previstoNm = -4000 * p.ambiente.campo.aceleracaoEm(Vetor3.zero).magnitude * GM * 0.001;
  return { dimensoesM: d, GM, torqueAnaliticoNm: previstoNm, torqueMedidoNm: s.torqueHidrodinamicoNm.z, erroRelativo: Math.abs(s.torqueHidrodinamicoNm.z / previstoNm - 1) };
});
const refinamento = [1 / 240, 1 / 480, 1 / 960].map(dtS => {
  const p = criar(6000, new Vetor3(2, 2, 1), -3, new Vetor3(0, -50, 0), 0, 0, dtS);
  return { dtS, ...avancar(p, 1) };
});
const impactos = [1 / 240, 1 / 480].map(dtS => ({ dtS, ...avancar(criar(2000, new Vetor3(1, 1, 1), 0.8, new Vetor3(0, -60, 0), 0, 0, dtS), 0.5) }));
const giro = criar(4000, new Vetor3(2, 2, 1), -5, Vetor3.zero, 0, 1);
const energia = () => { const e = giro.o.getEstadoFisico(); return 0.5 * giro.o.massaKg * e.velocidadeMps.magnitude ** 2 + 0.5 * giro.o.getMomentoInerciaKgM2().z * e.velocidadeAngularRadps.z ** 2; };
const energiaInicialJ = energia(), historiaGiro = [{ tempoS: 0, energiaJ: energiaInicialJ }];
const neutro = avancar(criar(4000, new Vetor3(2, 2, 1), -5), 10);
for (let n = 1; n <= 240; n++) { giro.m.avancar(1 / 240); if (n % 24 === 0) historiaGiro.push({ tempoS: giro.m.tempoS, energiaJ: energia() }); }
// Lei de resistência translacional exata na geometria totalmente imersa.
const arrasto = [2, 4].map(v => {
  const p = criar(4000, new Vetor3(2, 2, 1), -3, new Vetor3(v, 0, 0));
  const sistema = new SistemaHidrodinamico([p.agua], q => p.ambiente.campo.aceleracaoEm(q));
  sistema.registrar(p.o, { dimensoesM: p.o.dimensoesM, coeficienteArrasto: 1 });
  return { vMps: v, analiticoN: -0.5 * 1000 * 2 * v ** 2, medidoN: sistema.calcular(p.o).estados[0].forcaArrastoN.x };
});
const relatorio = { marco: 'M11-H', revisao: 'agua-incompressivel-prismas-m11-2', modelo: 'Corpos inertes, água uniforme 1000 kg/m³, atmosfera 1,225 kg/m³; sem propulsão.',
  estatico, equilibrio: { altitudeAnaliticaM: 0.25, ...equilibrio, erroCaladoM: Math.abs(equilibrio.estado.posicaoM.y - 0.25), erroMassaDeslocadaRelativo: Math.abs(1000 * equilibrio.imersao.volumeSubmersoM3 / 1000 - 1) },
  afundamento: { ...denso, terminalAnaliticaMps, erroTerminalRelativo: Math.abs(-denso.estado.velocidadeMps.y / terminalAnaliticaMps - 1) },
  angular, arrasto, refinamento, erroPosicao240vs480M: refinamento[0].estado.posicaoM.subtrair(refinamento[1].estado.posicaoM).magnitude,
  impactos, erroEnergiaEntradaRelativo: Math.abs(impactos[0].imersao.energiaEntradaJ / impactos[1].imersao.energiaEntradaJ - 1),
  energiaRotacional: historiaGiro, equilibrioNeutro: { ...neutro, desvioPosicaoM: neutro.estado.posicaoM.subtrair(new Vetor3(0, -5, 0)).magnitude } };
const { values } = parseArgs({ options: { saida: { type: 'string', default: '/tmp/blackstar-hidrodinamica.json' } } });
writeFileSync(values.saida!, JSON.stringify(relatorio, null, 2) + '\n');
console.log(JSON.stringify({ erroCaladoM: relatorio.equilibrio.erroCaladoM, erroTerminalRelativo: relatorio.afundamento.erroTerminalRelativo,
  erroEnergiaEntradaRelativo: relatorio.erroEnergiaEntradaRelativo, erroPosicaoM: relatorio.erroPosicao240vs480M, angular }));
