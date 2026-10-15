// Instrumentação somente de validação; não faz parte do executor ou da missão.
import { Bateria } from '../physics/objetos/fontes-de-energia/Bateria';
import { createHash } from 'node:crypto';
import type { criarTesteBss006 } from '../cenarios/BancadaBss';
import type { ObservacaoBss006 } from '../missoes/TiposMissaoBss006';

/** Projeta estado da bancada para formato comparável: corpos, engenharia, contatos, motor, arbitragem, fixadores, sistemas, energia e sensores. Apenas consulta, sem avançar missão. @contract f-3b5aba79d123ca41 @reviewed M12-DOC: implementação lida. */
export function fisicaBancada(b: ReturnType<typeof criarTesteBss006>) {
  const v = b.seguirObjeto, m = b.propulsorControlavel;
  return { tempoS: b.mundo.tempoS,
    corpos: b.objetos.map(c => ({ id: c.id, estado: c.getEstadoFisico(), massaKg: c.massaKg,
      integridade: c.integridadeEstrutural, temperaturaC: c.temperaturaC,
      deflexaoRad: 'deflexaoAtualRad' in c ? c.deflexaoAtualRad : undefined })),
    engenharia: b.obterDadosMissao(), contatos: b.mundo.obterContatosComSuperficie(),
    empuxoN: m.empuxoAtualN, vazaoKgS: m.vazaoReagidaKgS, throttle: m.throttleAtual,
    ignitado: m.estaIgnitado, gimbalRad: m.obterEstadoDaVetorizacao().anguloAtualRad,
    arbitragem: v.obterSolicitacoesAplicadas(), fixadores: b.fixadores.map(f => ({ id: f.id, estado: f.estado })),
    sistemas: Object.fromEntries(['elétrico', 'hidráulico', 'combustível', 'controle'].map(s => [s, m.sistemaEstaOperacional(s as 'elétrico')])),
    energiaEletricaJ: b.objetos.find((c): c is Bateria => c instanceof Bateria)!.energiaArmazenadaJ,
    sensores: { validos: v.obterLeiturasDosSensores().sensoresValidos !== false, idadeS: v.obterLeiturasDosSensores().idadeLeituraS ?? 0 },
  };
}
/** Projeta snapshot da missão para o mesmo conjunto de campos da bancada, preservando valores físicos sem arredondamento. @contract f-b1e526c99539b31e @reviewed M12-DOC: implementação lida. */
export function fisicaMissao(o: ObservacaoBss006) {
  return { tempoS: o.tempoS,
    corpos: o.corpos.map(c => ({ id: c.id, estado: c.estado, massaKg: c.massaKg, integridade: c.integridade, temperaturaC: c.temperaturaC, deflexaoRad: c.deflexaoRad })),
    engenharia: o.engenharia, contatos: o.contatos, empuxoN: o.empuxoN, vazaoKgS: o.vazaoKgS,
    throttle: o.throttle, ignitado: o.ignitado, gimbalRad: o.gimbalRad, arbitragem: o.arbitragem,
    fixadores: o.fixadores, sistemas: o.sistemas, energiaEletricaJ: o.energiaEletricaJ, sensores: o.sensores };
}
/** Calcula SHA-256 da serialização do registro físico, rejeitando qualquer número não finito; igualdade exige mesma ordem/estrutura além dos mesmos valores. @contract f-dab75627890b3399 @reviewed M12-DOC: implementação lida. */
export function hashFisica(o: unknown): string { return createHash('sha256').update(JSON.stringify(o, (_chave, valor) => {
  if (typeof valor === 'number' && !Number.isFinite(valor)) throw new Error('Grandeza não finita na evidência física.');
  return valor;
})).digest('hex'); }
export const CASOS_M10 = [
  { id: 'alvo-zero', alvoM: 0, ventoMps: 0, falha: 'nenhuma' },
  { id: 'alvo-direita', alvoM: 34.7, ventoMps: 0, falha: 'nenhuma' },
  { id: 'alvo-esquerda', alvoM: -34.7, ventoMps: 0, falha: 'nenhuma' },
  { id: 'vento-direita', alvoM: 0, ventoMps: 5, falha: 'nenhuma' },
  { id: 'vento-esquerda', alvoM: 0, ventoMps: -5, falha: 'nenhuma' },
  { id: 'sem-ignicao', alvoM: 0, ventoMps: 0, falha: 'sem-ignicao' },
  { id: 'falha-eletrica', alvoM: 0, ventoMps: 0, falha: 'eletrica' },
  { id: 'falha-metano', alvoM: 0, ventoMps: 0, falha: 'metano' },
  { id: 'falha-oxidante', alvoM: 0, ventoMps: 0, falha: 'oxidante' },
] as const;
export interface ReferenciaCasoM10 {
  readonly id: string;
  readonly passos: number;
  readonly passoFalha?: number;
  readonly apogeuM: number;
  readonly repousoGeometricoS: number;
  readonly frames: readonly { passo: number; sha256: string }[];
  readonly final: ReturnType<typeof fisicaBancada>;
}
