/** Snapshot mínimo necessário para localizar um cruzamento Mach entre passos físicos. */
export interface EstadoCruzamentoMach {
  readonly tempoS: number;
  readonly passo: number;
  readonly mach: number;
  readonly altitudeM: number;
  readonly arcoM: number;
  readonly velocidadeMps: number;
  readonly velocidadeRadialMps: number;
  readonly velocidadeTangencialMps: number;
  readonly trajetoriaRad: number;
  readonly atitudeLocalRad: number;
  readonly alphaRad: number;
  readonly omegaRadps: number;
  readonly pressaoDinamicaPa: number;
  readonly fluxoTermicoWm2: number;
  readonly torqueAerodinamicoNm: number;
  readonly energiaMecanicaEspecificaJPorKg: number;
  readonly temperaturaCorpoC: number;
  readonly temperaturaFlapsC: readonly number[];
  readonly integridadeCorpo: number;
  readonly integridadeFlaps: readonly number[];
  readonly alimentacaoFlaps: readonly boolean[];
  readonly vinculosFlaps: readonly boolean[];
  readonly estadoControle: string;
  readonly autoridadeDisponivel: boolean;
}

export interface CruzamentoMach {
  readonly machAlvo: number;
  readonly sentido: 'decrescente';
  readonly fracaoPasso: number;
  readonly tempoS: number;
  readonly passoInicial: number;
  readonly passoFinal: number;
  readonly estado: Omit<EstadoCruzamentoMach, 'passo' | 'mach'>;
  readonly componentesEssenciaisIntegrais: boolean;
  readonly controleDisponivel: boolean;
}

/**
 * Interpola linearmente o instante e a telemetria dentro do passo físico que
 * cruza para baixo os marcos Mach. Registra estado de componentes e autoridade
 * naquele cruzamento; não interpola forças para alterar a simulação nem declara
 * sucesso. Os extremos/crossings são consultados entre snapshots de passos
 * consecutivos do mesmo ensaio.
 * @contract f-b3efd3b4f54bc248
 */
export function amostrarCruzamentosMach(
  anterior: EstadoCruzamentoMach,
  atual: EstadoCruzamentoMach,
  marcosMach: readonly number[],
): readonly CruzamentoMach[] {
  if (!(atual.tempoS > anterior.tempoS) || atual.passo !== anterior.passo + 1
      || ![anterior.mach, atual.mach].every(Number.isFinite)) return [];
  const queda = anterior.mach - atual.mach;
  if (queda <= 0) return [];
  const numericos: readonly (keyof Omit<EstadoCruzamentoMach, 'passo' | 'mach' | 'temperaturaFlapsC' | 'integridadeFlaps' | 'alimentacaoFlaps' | 'vinculosFlaps' | 'estadoControle' | 'autoridadeDisponivel'>)[] = [
    'tempoS', 'altitudeM', 'arcoM', 'velocidadeMps', 'velocidadeRadialMps', 'velocidadeTangencialMps',
    'trajetoriaRad', 'atitudeLocalRad', 'alphaRad', 'omegaRadps', 'pressaoDinamicaPa', 'fluxoTermicoWm2',
    'torqueAerodinamicoNm', 'energiaMecanicaEspecificaJPorKg', 'temperaturaCorpoC', 'integridadeCorpo',
  ];
  return marcosMach.filter(m => Number.isFinite(m) && m > 0 && anterior.mach > m && atual.mach <= m)
    .map(machAlvo => {
      const fracaoPasso = (anterior.mach - machAlvo) / queda;
      /** Interpola um canal escalar dentro do passo detectado. @contract f-58f7ca2a081795ff */
      const interpolar = (k: typeof numericos[number]): number =>
        anterior[k] + (atual[k] - anterior[k]) * fracaoPasso;
      const estado = {
        tempoS: interpolar('tempoS'), altitudeM: interpolar('altitudeM'), arcoM: interpolar('arcoM'),
        velocidadeMps: interpolar('velocidadeMps'), velocidadeRadialMps: interpolar('velocidadeRadialMps'),
        velocidadeTangencialMps: interpolar('velocidadeTangencialMps'), trajetoriaRad: interpolar('trajetoriaRad'),
        atitudeLocalRad: interpolar('atitudeLocalRad'), alphaRad: interpolar('alphaRad'),
        omegaRadps: interpolar('omegaRadps'), pressaoDinamicaPa: interpolar('pressaoDinamicaPa'),
        fluxoTermicoWm2: interpolar('fluxoTermicoWm2'), torqueAerodinamicoNm: interpolar('torqueAerodinamicoNm'),
        energiaMecanicaEspecificaJPorKg: interpolar('energiaMecanicaEspecificaJPorKg'),
        temperaturaCorpoC: interpolar('temperaturaCorpoC'), integridadeCorpo: interpolar('integridadeCorpo'),
        temperaturaFlapsC: anterior.temperaturaFlapsC.map((v, i) => v + (atual.temperaturaFlapsC[i] - v) * fracaoPasso),
        integridadeFlaps: anterior.integridadeFlaps.map((v, i) => v + (atual.integridadeFlaps[i] - v) * fracaoPasso),
        alimentacaoFlaps: anterior.alimentacaoFlaps.map((v, i) => v && atual.alimentacaoFlaps[i]),
        vinculosFlaps: anterior.vinculosFlaps.map((v, i) => v && atual.vinculosFlaps[i]),
        estadoControle: atual.estadoControle,
        autoridadeDisponivel: anterior.autoridadeDisponivel && atual.autoridadeDisponivel,
      } satisfies Omit<EstadoCruzamentoMach, 'passo' | 'mach'>;
      const flapIntegro = estado.integridadeFlaps.every(v => v > 0);
      const alimentados = anterior.alimentacaoFlaps.every((v, i) => v && atual.alimentacaoFlaps[i]);
      const vinculados = anterior.vinculosFlaps.every((v, i) => v && atual.vinculosFlaps[i]);
      return { machAlvo, sentido: 'decrescente' as const, fracaoPasso,
        tempoS: estado.tempoS, passoInicial: anterior.passo, passoFinal: atual.passo,
        estado,
        componentesEssenciaisIntegrais: estado.integridadeCorpo > 0 && flapIntegro && alimentados && vinculados,
        controleDisponivel: atual.estadoControle !== 'falha' && atual.estadoControle !== 'sem-autoridade'
          && anterior.autoridadeDisponivel && atual.autoridadeDisponivel,
      };
    });
}
