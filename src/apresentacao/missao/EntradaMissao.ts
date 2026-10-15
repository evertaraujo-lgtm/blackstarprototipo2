import type { ComandoBss006, SistemaBss } from '../../missoes/TiposMissaoBss006';

export interface AcoesApresentacaoMissao {
  comando(c: ComandoBss006): void;
  sistema(s: SistemaBss): void;
  iniciar(): void;
  pausar(): void;
  reiniciar(): void;
  exportar(): void;
}
/** Tradução de entrada para comandos sem conhecer composição física ou mundo.
 * @contract f-cdc6f2cd67e61409
 */
export function conectarEntradaMissao(raiz: HTMLElement, acoes: AcoesApresentacaoMissao): void {
  /** Associa botão identificado ao callback operacional recebido; instala listener DOM, sem conhecer mundo físico. @contract f-eb84b82e48a5991b @reviewed M12-DOC: implementação lida. */
  const clique = (id: string, agir: () => void) => raiz.querySelector<HTMLButtonElement>(`#${id}`)!.addEventListener('click', agir);
  clique('iniciar', acoes.iniciar); clique('pausar', acoes.pausar); clique('reiniciar', acoes.reiniciar); clique('exportar', acoes.exportar);
  for (const b of raiz.querySelectorAll<HTMLButtonElement>('[data-sistema]')) b.addEventListener('click', () => acoes.sistema(b.dataset.sistema as SistemaBss));
  clique('preparar', () => {
    for (const sistema of ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) acoes.comando({ tipo: 'sistema', sistema, ligar: true });
  });
  clique('ignicao', () => acoes.comando({ tipo: 'ignicao' }));
  clique('cortar', () => acoes.comando({ tipo: 'desligar-motor' }));
  clique('modo-decolagem', () => acoes.comando({ tipo: 'modo', modo: 'decolagem' }));
  clique('modo-pouso', () => acoes.comando({ tipo: 'modo', modo: 'pouso' }));
  clique('aplicar-alvo', () => acoes.comando({ tipo: 'alvo-pouso', deslocamentoM: Number(raiz.querySelector<HTMLInputElement>('#alvo-pouso')!.value) }));
  raiz.querySelector<HTMLInputElement>('#throttle')!.addEventListener('input', e => acoes.comando({ tipo: 'throttle', valor: Number((e.target as HTMLInputElement).value) / 100 }));
}
