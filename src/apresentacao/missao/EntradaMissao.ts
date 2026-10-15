import type { ComandoBss006, SistemaBss } from '../../missoes/TiposMissaoBss006';

export interface AcoesApresentacaoMissao {
  /** Porta para enviar comando tipado da entrada ao adaptador da missão; não recebe acesso à pose física. @contract f-aa10bea9c0ca5993 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  comando(c: ComandoBss006): void;
  /** Solicita alternância operacional do sistema indicado conforme observação atual; permissivos ficam no domínio. @contract f-04bcc159990d45e8 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  sistema(s: SistemaBss): void;
  /** Solicita execução da missão e reestabelecimento da referência temporal da apresentação. @contract f-84cffe895eb695ad @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  iniciar(): void;
  /** Solicita pausa da missão e suspensão da referência de relógio visual, sem apagar estado. @contract f-9c4550fa13ff8bca @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  pausar(): void;
  /** Solicita recriação da missão pela configuração da interface; não restaura estado por teletransporte. @contract f-a2b107ef6249b429 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  reiniciar(): void;
  /** Solicita exportação do diário pelo adaptador do navegador; não publica dados em rede. @contract f-1fd6e69ed2e10747 @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */
  exportar(): void;
}
/** Tradução de entrada para comandos sem conhecer composição física ou mundo.
 * @contract f-cdc6f2cd67e61409
 */
export function conectarEntradaMissao(raiz: HTMLElement, acoes: AcoesApresentacaoMissao): void {
  /** Associa botão identificado ao callback operacional recebido; instala listener DOM, sem conhecer mundo físico. @contract f-eb84b82e48a5991b @reviewed M12-DOC: implementação lida. */
  const clique = (id: string, agir: /** Ação de apresentação invocada pelo listener de clique; envia operação à missão sem acesso mutável à cinemática. @contract f-aa40c4cf168237cd @reviewed M12-DOC: papel da porta confrontado com consumidores/implementações. */ () => void) => raiz.querySelector<HTMLButtonElement>(`#${id}`)!.addEventListener('click', agir);
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
