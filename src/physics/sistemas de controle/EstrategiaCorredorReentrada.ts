import type { CorredorReentrada, TelemetriaControleReentrada } from './ControladorReentrada';

/** Política experimental separada do PD: considera q/fluxo/carga e informa
 * energia/integridade monitoradas, sem inventar lei ótima ou escrever estado.
 * Não há atuador capaz de impor energia diretamente. Alvos rad; limites SI.
 * @contract f-c23886613e0b2192
   */
export function avaliarCorredorReentrada(t: TelemetriaControleReentrada, limites: CorredorReentrada,
  alphaSolicitadoRad: number, phiSolicitadoRad: number) {
  const violacoes = [t.pressaoDinamicaPa > limites.pressaoMaximaPa ? 'pressao' : '',
    t.fluxoTermicoWm2 > limites.fluxoMaximoWm2 ? 'fluxo-termico' : '', t.cargaG > limites.cargaMaximaG ? 'carga' : ''].filter(Boolean);
  return Object.freeze({ estrategia: 'heuristica-experimental-55-70-graus', excedeu: violacoes.length > 0,
    violacoes: Object.freeze(violacoes),
    alphaAlvoRad: violacoes.length ? Math.min(70 * Math.PI / 180, Math.max(alphaSolicitadoRad, 55 * Math.PI / 180)) : alphaSolicitadoRad,
    phiAlvoRad: violacoes.length ? 0 : phiSolicitadoRad,
    energiaMecanicaEspecificaJPorKg: t.energiaMecanicaEspecificaJPorKg ?? null,
    integridadeMinima: t.integridadeMinima ?? null, eficaciaQualificada: false });
}
