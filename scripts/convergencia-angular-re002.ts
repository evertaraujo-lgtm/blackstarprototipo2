import { writeFileSync } from 'node:fs';
import { criarCenarioReentrada } from '../src/cenarios/EnsaioReentrada';
import { diagnosticarMomentoAngular, BalancoAngular } from '../src/physics/estruturas/DiagnosticoAngular';

/** Mede convergência/limite de arredondamento no gradiente central por 10 s,
 * em vácuo declarado, sem controlador e sem trocar integrador. As quatro
 * resoluções e o orçamento são os mesmos da regressão angular versionada.
 * Grava evidência local SI; não ajusta tolerâncias a posteriori.
 * @contract f-c01c0626f58071c1
   */
function validarConvergencia(): void {
  const resultados = [];
  for (const passoS of [1 / 120, 1 / 240, 1 / 480, 1 / 960]) {
    const c = criarCenarioReentrada({ vacuo: true, altitudeM: 200000, velocidadeMps: 9000, passoS });
    /** Consulta L/I/torque do mesmo conjunto, sem modificar corpos.  @contract f-002980b97f4edc92 */
    const medir = () => diagnosticarMomentoAngular(c.objetos, c.ambiente.campo.centroM, p => c.mundo.obterGravidadeMps2(p));
    /** Soma energia translacional cinética e potencial central em J dos membros; não inclui energia rotacional.  @contract f-50101903824a8ffc */
    const energia = () => c.objetos.reduce((s, o) => {
      const e = o.getEstadoFisico(); return s + o.massaKg * (e.velocidadeMps.magnitude ** 2 / 2 - c.ambiente.campo.muM3S2 / e.posicaoM.subtrair(c.ambiente.campo.centroM).magnitude);
    }, 0);
    const inicial = medir(), energiaInicialJ = energia(), b = new BalancoAngular(); let antes = inicial;
    for (let i = 0; i < Math.round(10 / passoS); i++) { c.mundo.avancar(passoS); const depois = medir(); b.registrar(antes, depois, passoS, 0, true); antes = depois; }
    resultados.push({ passoS, configuracao: c.configuracao, modeloFisico: c.mundo.obterConfiguracaoFisica(), inicial, final: antes,
      balancoTrapezoidal: b.observar(), energiaInicialJ, energiaFinalJ: energia(),
      erroRelativoEnergiaTranslacional: Math.abs((energia() - energiaInicialJ) / energiaInicialJ),
      erroRelativoMomentoOrbital: Math.abs((antes.momentoOrbitalKgM2ps - inicial.momentoOrbitalKgM2ps) / inicial.momentoOrbitalKgM2ps) });
  }
  writeFileSync('docs/validacoes/re002/convergencia-angular.json', JSON.stringify({ duracaoS: 10,
    criterioAngularRegressaoNmS: 0.01, criterioMomentoOrbitalRelativo: 1e-10,
    nota: 'Erro de quadratura e arredondamento; não extrapolar certificação para contatos ou missão completa.', resultados }, null, 2));
  console.log(JSON.stringify(resultados.map(r => ({ dt: r.passoS, omega: r.final.omegaInercialRadps,
    residuo: r.balancoTrapezoidal.residuoAcumuladoKgM2ps, erroEnergia: r.erroRelativoEnergiaTranslacional, erroLorb: r.erroRelativoMomentoOrbital }))));
}
validarConvergencia();
