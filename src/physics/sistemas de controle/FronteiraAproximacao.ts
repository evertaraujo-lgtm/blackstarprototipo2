import { normalizarAngulo } from '../ambiente/ReferencialFisico';

export interface ConfiguracaoFronteiraAproximacao {
  readonly alvoArcoM: number | null;
  readonly aceleracoesLiquidasHipoteticasMps2: readonly number[];
  readonly erroAlphaMaxRad: number;
  readonly omegaMaxRadps: number;
}
export const FRONTEIRA_APROXIMACAO: ConfiguracaoFronteiraAproximacao = Object.freeze({
  alvoArcoM: null, aceleracoesLiquidasHipoteticasMps2: Object.freeze([1, 2, 5]),
  erroAlphaMaxRad: Math.PI / 18, omegaMaxRadps: 0.02,
});
export interface EstadoFronteiraAproximacao {
  readonly altitudeM: number; readonly arcoM: number; readonly velocidadeMps: number;
  readonly velocidadeRadialMps: number; readonly velocidadeTangencialMps: number;
  readonly alphaRad: number; readonly alphaAlvoRad: number; readonly omegaRadps: number;
  readonly energiaMecanicaEspecificaJPorKg: number;
  readonly sensoresValidos: boolean; readonly integridade: number; readonly integridadeFlaps: number;
  readonly termicaCompativel: boolean; readonly alimentacaoDisponivel: boolean;
  readonly autoridadeAerodinamicaDisponivel: boolean; readonly corredorCompativel: boolean;
  readonly propulsaoDisponivel: boolean; readonly integracaoCompativel: boolean;
}
export interface RequisitoAproximacao {
  readonly descricao: string; readonly atendido: boolean; readonly atual: number | boolean | null; readonly esperado: string;
}

/** Copia e congela hipóteses exploratórias SI; alvo null bloqueia candidatura.
 * Aceleração é líquida útil hipotética, sem inferir empuxo/combustível/ignição.
 * @contract f-3f8022ec198f2a6a
   */
export function configurarFronteiraAproximacao(entrada: Partial<ConfiguracaoFronteiraAproximacao> = {}): ConfiguracaoFronteiraAproximacao {
  const c = { ...FRONTEIRA_APROXIMACAO, ...entrada };
  if ((c.alvoArcoM !== null && (!Number.isFinite(c.alvoArcoM) || Math.abs(c.alvoArcoM) > 20_000_000))
    || !Number.isFinite(c.erroAlphaMaxRad) || c.erroAlphaMaxRad <= 0 || c.erroAlphaMaxRad > Math.PI / 2
    || !Number.isFinite(c.omegaMaxRadps) || c.omegaMaxRadps <= 0 || c.omegaMaxRadps > 1
    || !Array.isArray(c.aceleracoesLiquidasHipoteticasMps2) || c.aceleracoesLiquidasHipoteticasMps2.length === 0
    || c.aceleracoesLiquidasHipoteticasMps2.length > 20
    || !c.aceleracoesLiquidasHipoteticasMps2.every(a => Number.isFinite(a) && a > 0 && a <= 100)) throw new Error('Fronteira de aproximação inválida.');
  return Object.freeze({ ...c, aceleracoesLiquidasHipoteticasMps2: Object.freeze([...c.aceleracoesLiquidasHipoteticasMps2]) });
}

/** Avalia limites NECESSÁRIOS de frenagem ideal V²/(2a), sem certificar trajetória.
 * Distância é arco assinado ao alvo à frente. Não resolve alinhamento, combustível,
 * reignição ou dinâmica 3D. Aceleração líquida evita contabilizar gravidade duas vezes.
 * A candidatura A nunca implica autorização operacional B. Nenhum efeito físico.
 * @contract f-bb2582e8bd866e0f
   */
export function avaliarFronteiraAproximacao(e: EstadoFronteiraAproximacao, c: ConfiguracaoFronteiraAproximacao) {
  const finitos = Object.values(e).filter(v => typeof v === 'number').every(Number.isFinite);
  const distanciaRestanteM = c.alvoArcoM === null ? null : c.alvoArcoM - e.arcoM;
  const hipoteses = c.aceleracoesLiquidasHipoteticasMps2.map(aceleracaoLiquidaMps2 => {
    const distanciaFrenagemM = e.velocidadeMps ** 2 / (2 * aceleracaoLiquidaMps2);
    const quedaFrenagemRadialM = Math.min(0, e.velocidadeRadialMps) ** 2 / (2 * aceleracaoLiquidaMps2);
    const velocidadeLimiteNecessariaMps = distanciaRestanteM === null ? null : Math.sqrt(2 * aceleracaoLiquidaMps2 * Math.max(0, distanciaRestanteM));
    return { aceleracaoLiquidaMps2, distanciaFrenagemM, quedaFrenagemRadialM,
      tempoFrenagemS: e.velocidadeMps / aceleracaoLiquidaMps2, velocidadeLimiteNecessariaMps,
      desvioVelocidadeMps: velocidadeLimiteNecessariaMps === null ? null : e.velocidadeMps - velocidadeLimiteNecessariaMps,
      limitesNecessariosAtendidos: finitos && distanciaRestanteM !== null && distanciaRestanteM > 0
        && distanciaFrenagemM <= distanciaRestanteM && quedaFrenagemRadialM < e.altitudeM };
  });
  const requisitos: RequisitoAproximacao[] = [
    { descricao: 'Sensores e finitude', atendido: e.sensoresValidos && finitos, atual: e.sensoresValidos && finitos, esperado: 'leituras válidas SI' },
    { descricao: 'Alvo definido à frente', atendido: distanciaRestanteM !== null && distanciaRestanteM > 0, atual: distanciaRestanteM, esperado: 'arco restante > 0 m' },
    { descricao: 'Altitude e descida', atendido: e.altitudeM > 0 && e.velocidadeRadialMps < 0 && e.velocidadeTangencialMps > 0 && e.velocidadeMps >= 0, atual: e.altitudeM, esperado: 'acima da superfície, descendente e progredindo ao alvo' },
    { descricao: 'Integridade do corpo', atendido: e.integridade > 0, atual: e.integridade, esperado: '> 0; não é margem qualificada' },
    { descricao: 'Flaps conectados e íntegros', atendido: e.integridadeFlaps > 0, atual: e.integridadeFlaps, esperado: '> 0' },
    { descricao: 'Condição térmica', atendido: e.termicaCompativel, atual: e.termicaCompativel, esperado: 'abaixo dos limiares provisórios' },
    { descricao: 'Alimentação', atendido: e.alimentacaoDisponivel, atual: e.alimentacaoDisponivel, esperado: 'disponível aos flaps' },
    { descricao: 'Autoridade aerodinâmica', atendido: e.autoridadeAerodinamicaDisponivel, atual: e.autoridadeAerodinamicaDisponivel, esperado: 'autoridade remanescente acima do limiar experimental' },
    { descricao: 'Corredor', atendido: e.corredorCompativel, atual: e.corredorCompativel, esperado: 'q, indicador térmico e carga nos limites configurados' },
    { descricao: 'Erro de alpha', atendido: Math.abs(normalizarAngulo(e.alphaRad - e.alphaAlvoRad)) <= c.erroAlphaMaxRad, atual: normalizarAngulo(e.alphaRad - e.alphaAlvoRad), esperado: `|erro| ≤ ${c.erroAlphaMaxRad} rad (provisório)` },
    { descricao: 'Rotação', atendido: Math.abs(e.omegaRadps) <= c.omegaMaxRadps, atual: e.omegaRadps, esperado: `|ω| ≤ ${c.omegaMaxRadps} rad/s (provisório)` },
    { descricao: 'Frenagem hipotética', atendido: hipoteses.some(h => h.limitesNecessariosAtendidos), atual: hipoteses.some(h => h.limitesNecessariosAtendidos), esperado: 'ao menos uma hipótese satisfaz limites necessários; trajetória ainda não demonstrada' },
  ];
  const candidatoCinematico = requisitos.every(r => r.atendido);
  requisitos.push(
    { descricao: 'Propulsão operacional', atendido: e.propulsaoDisponivel, atual: e.propulsaoDisponivel, esperado: 'motores reais, reserva, permissivos e capacidade de partida verificados' },
    { descricao: 'Integração com aproximação', atendido: e.integracaoCompativel, atual: e.integracaoCompativel, esperado: 'controle/planejamento físico compatível, além deste protótipo sem atuação' });
  return Object.freeze({ candidatoCinematico, autorizado: requisitos.every(r => r.atendido), distanciaRestanteM,
    energiaMecanicaEspecificaJPorKg: e.energiaMecanicaEspecificaJPorKg, natureza: 'limites-necessarios-ideais-nao-trajetoria-certificada',
    hipoteses: Object.freeze(hipoteses.map(h => Object.freeze(h))), requisitos: Object.freeze(requisitos.map(r => Object.freeze(r))) });
}
