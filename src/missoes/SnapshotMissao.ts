import { Vetor3 } from '../physics/Vetor3';

/** Copia dados de observação sem ceder referências mutáveis do core à apresentação.
 * @remarks Copia recursivamente DTOs, arrays e Vetor3 e congela cada cópia; valores escalares são preservados. Destinado a dados de observação acíclicos, não a instâncias arbitrárias com protótipos/ciclos.
 * @contract f-738b80ed4008a5b6
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function copiarSnapshot<T>(dado: T): T {
  if (dado instanceof Vetor3) return Object.freeze(new Vetor3(dado.x, dado.y, dado.z)) as T;
  if (Array.isArray(dado)) return Object.freeze(dado.map(item => copiarSnapshot(item))) as T;
  if (dado !== null && typeof dado === 'object') return Object.freeze(Object.fromEntries(
    Object.entries(dado).map(([chave, valor]) => [chave, copiarSnapshot(valor)]))) as T;
  return dado;
}
