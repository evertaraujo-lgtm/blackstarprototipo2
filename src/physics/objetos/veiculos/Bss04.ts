import type { EstadoFisico } from '../base/Objeto';
import { Vetor3 } from '../../Vetor3';
import { Objeto } from '../base/Objeto';

/** Cria duas pernas fixas e suas sapatas como corpos físicos do BSS-04. */
export function criarPernasFixasBss04(centroCascoM: Vetor3, prefixoId = 'bss04', transformarEstado: (p: Vetor3) => Partial<EstadoFisico> = (p) => ({ posicaoM: p })): readonly Objeto[] {
  return [-1, 1].flatMap((lado) => {
    const nomeLado = lado < 0 ? 'esquerda' : 'direita';
    const xPernaM = centroCascoM.x + lado * 1.8;
    const xSapataM = centroCascoM.x + lado * 2.15;
    const alturaCascoM = centroCascoM.y;
    return [
      new Objeto({
        id: `${prefixoId}-perna-${nomeLado}`,
        massaBaseKg: 45,
        dimensoesM: new Vetor3(0.4, 3.3, 0.5),
        resistenciaColisaoJ: 500_000,
        limiteTermicoC: 1_000,
        coeficienteAtrito: 0.9,
        estadoInicial: transformarEstado(new Vetor3(xPernaM, alturaCascoM - 3, centroCascoM.z)),
      }),
      new Objeto({
        id: `${prefixoId}-sapata-${nomeLado}`,
        massaBaseKg: 25,
        dimensoesM: new Vetor3(1.3, 0.3, 1.2),
        resistenciaColisaoJ: 500_000,
        limiteTermicoC: 1_000,
        coeficienteAtrito: 0.95,
        estadoInicial: transformarEstado(new Vetor3(xSapataM, alturaCascoM - 4.65, centroCascoM.z)),
      }),
    ];
  });
}
