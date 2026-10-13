import type { InstanciaMissao } from './ContratoMissao';

export interface ComandoAgendado<C> { readonly passo: number; readonly comando: C }
/** Executor genérico por passos; independente de veículo, navegador e relógio real. */
export function executarMissaoAtePasso<C, O>(missao: InstanciaMissao<C, O>, passoFinal: number,
  comandos: readonly ComandoAgendado<C>[] = []): O {
  const inicial = missao.passosExecutados;
  if (!Number.isSafeInteger(passoFinal) || passoFinal < inicial) throw new Error('Índice final inválido.');
  let anterior = inicial;
  for (const entrada of comandos) {
    if (!Number.isSafeInteger(entrada.passo) || entrada.passo < anterior || entrada.passo >= passoFinal)
      throw new Error('Comandos devem estar ordenados no intervalo executado.');
    anterior = entrada.passo;
  }
  let indice = 0;
  while (missao.passosExecutados < passoFinal) {
    while (comandos[indice]?.passo === missao.passosExecutados) missao.receberComando(comandos[indice++]!.comando);
    if (!missao.avancarPasso()) throw new Error('Executor interrompido: missão preparada ou pausada.');
  }
  return missao.observar();
}
