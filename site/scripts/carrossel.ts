/** Carrossel visual da homepage. Não importa nem altera qualquer estado do simulador. */
const hero = document.querySelector<HTMLElement>('[data-carrossel]');

/**
 * Conecta imagens e controles declarados no hero, sem bibliotecas ou persistência.
 * @param {HTMLElement} raiz Seção institucional; deve conter ao menos dois slides.
 * @returns {void} Registra eventos/timer de apresentação. Validação: docs/arquitetura/site-institucional.md.
  @contract f-9538cdc37f1c3dd9 */
function iniciarCarrossel(raiz: HTMLElement): void {
  const slides = [...raiz.querySelectorAll<HTMLImageElement>('.hero-slide')];
  if (slides.length < 2) return;
  const controles = raiz.querySelector<HTMLElement>('.carrossel-controles')!;
  const botao = raiz.querySelector<HTMLButtonElement>('[data-reproducao]')!;
  const contador = raiz.querySelector<HTMLElement>('[data-slide-atual]')!;
  const legenda = raiz.querySelector<HTMLElement>('[data-slide-legenda]')!;
  const anuncio = raiz.querySelector<HTMLElement>('[data-slide-anuncio]')!;
  const movimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  let indice = 0, pedido = 0, pausado = movimento.matches;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let visivel = true, sobreposto = false, emFoco = false;

  /** Cancela a única troca agendada; não altera o slide nem a intenção do operador.  @contract f-963ac9cd371bd2ec */
  function suspenderTroca(): void {
    clearTimeout(timer);
    timer = undefined;
  }

  /** Atualiza controle acessível e agenda 7 s somente nas condições de reprodução.  @contract f-fdbb963ecb3ebefc */
  function atualizarReproducao(): void {
    suspenderTroca();
    const parado = pausado || movimento.matches;
    botao.disabled = movimento.matches;
    botao.setAttribute('aria-pressed', String(parado));
    botao.setAttribute('aria-label', movimento.matches ? 'Troca automática desativada pela preferência de movimento reduzido' : parado ? 'Retomar troca automática de imagens' : 'Pausar troca automática de imagens');
    botao.title = botao.getAttribute('aria-label')!;
    botao.textContent = parado ? '▶' : 'Ⅱ';
    const executar = !parado && !document.hidden && visivel && !sobreposto && !emFoco;
    raiz.dataset.estadoReproducao = executar ? 'ativa' : 'pausada';
    if (executar) timer = setTimeout(avancarAutomaticamente, 7000);
  }

  /**
   * Exibe imagem decodificada; falha mantém a anterior e pedidos antigos não vencem.
   * @param {number} novoIndice Índice circular solicitado, sem alterar layout ou foco.
   * @param {boolean} anunciar Anuncia posição/descrição somente por comando manual.
   * @returns {Promise<void>} Muda classes, aria-hidden, contador e legenda do hero.
    @contract f-cc5467ffe01aa9a3 */
  async function mostrarSlide(novoIndice: number, anunciar = false): Promise<void> {
    const requisicao = ++pedido;
    const destino = (novoIndice + slides.length) % slides.length;
    try { await slides[destino].decode(); }
    catch { if (requisicao === pedido) atualizarReproducao(); return; }
    if (requisicao !== pedido) return;
    indice = destino;
    slides.forEach((slide, i) => {
      slide.classList.toggle('ativa', i === indice);
      slide.setAttribute('aria-hidden', String(i !== indice));
    });
    contador.textContent = String(indice + 1).padStart(2, '0');
    legenda.textContent = slides[indice].dataset.legenda ?? '';
    if (anunciar) anuncio.textContent = `Imagem ${indice + 1} de ${slides.length}: ${slides[indice].alt}`;
    atualizarReproducao();
  }

  /** Avança pela apresentação, sem anúncio automático ou alteração de foco.  @contract f-8fe4019b6cef3434 */
  function avancarAutomaticamente(): void { void mostrarSlide(indice + 1); }

  /** Retrocede circularmente por comando e mantém autoplay pausado até retomada.  @contract f-defb9d267873e822 */
  function anterior(): void { pausado = true; suspenderTroca(); void mostrarSlide(indice - 1, true); }

  /** Avança circularmente por comando e mantém autoplay pausado até retomada.  @contract f-5d9d664d2aeb859e */
  function proximo(): void { pausado = true; suspenderTroca(); void mostrarSlide(indice + 1, true); }

  /** Alterna intenção de reprodução; movimento reduzido continua tendo prioridade.  @contract f-c929266d84219d37 */
  function alternarReproducao(): void { pausado = !pausado; emFoco = false; atualizarReproducao(); }

  controles.hidden = false;
  raiz.querySelector<HTMLButtonElement>('[data-anterior]')!.addEventListener('click', anterior);
  raiz.querySelector<HTMLButtonElement>('[data-proximo]')!.addEventListener('click', proximo);
  botao.addEventListener('click', alternarReproducao);
  raiz.addEventListener('pointerenter', evento => { sobreposto = evento.pointerType !== 'touch'; atualizarReproducao(); });
  raiz.addEventListener('pointerleave', () => { sobreposto = false; atualizarReproducao(); });
  raiz.addEventListener('focusin', () => { emFoco = true; atualizarReproducao(); });
  raiz.addEventListener('focusout', evento => { emFoco = raiz.contains(evento.relatedTarget as Node | null); atualizarReproducao(); });
  document.addEventListener('visibilitychange', atualizarReproducao);
  movimento.addEventListener('change', () => { if (movimento.matches) pausado = true; atualizarReproducao(); });
  const observador = new IntersectionObserver(entradas => {
    visivel = entradas[0].isIntersecting;
    atualizarReproducao();
  }, { threshold: 0 });
  observador.observe(raiz);
  atualizarReproducao();
}

if (hero) iniciarCarrossel(hero);

export {};
