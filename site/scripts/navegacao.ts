/**
 * Navegação institucional isolada. Consulta apenas DOM/rolagem e não importa
 * nenhum estado do laboratório. Os links continuam operantes sem JavaScript.
 */
const cabecalho = document.querySelector<HTMLElement>('.cabecalho')!;
const botao = document.querySelector<HTMLButtonElement>('.menu-botao')!;
const menu = document.querySelector<HTMLElement>('#menu-principal')!;
const desktop = window.matchMedia('(min-width: 960px)');

/** Define a expansão móvel e seu estado acessível, sem alterar o foco ou o domínio.  @contract f-6b6f4dc45ad56a89 */
function definirMenu(aberto: boolean): void {
  botao.setAttribute('aria-expanded', String(aberto));
  menu.classList.toggle('aberto', aberto);
  botao.setAttribute('aria-label', aberto ? 'Fechar navegação' : 'Abrir navegação');
}

/** Alterna a apresentação do cabeçalho após 24 px de rolagem; não desloca a página.  @contract f-8d92001118a9a067 */
function atualizarCabecalho(): void {
  cabecalho.classList.toggle('solido', window.scrollY > 24);
}

/** Inverte a expansão solicitada pelo botão de navegação.  @contract f-51386e4d1ec3385a */
function alternarMenu(): void {
  definirMenu(botao.getAttribute('aria-expanded') !== 'true');
}

/** Fecha com Escape e devolve foco ao botão somente quando o menu estava aberto.  @contract f-13c622d80e9db4ae */
function fecharComEscape(evento: KeyboardEvent): void {
  if (evento.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') {
    definirMenu(false);
    botao.focus();
  }
}

/** Seguir um link recolhe o menu, preservando a navegação padrão e suas âncoras.  @contract f-4911937e4430a06a */
function fecharPorLink(evento: MouseEvent): void {
  if (evento.target instanceof Element && evento.target.closest('a')) definirMenu(false);
}

/** Evita manter uma expansão móvel residual quando a janela passa a desktop.  @contract f-ce59224d57a81597 */
function adequarMenu(): void {
  if (desktop.matches) definirMenu(false);
}

document.documentElement.classList.add('js');
botao.addEventListener('click', alternarMenu);
menu.addEventListener('click', fecharPorLink);
document.addEventListener('keydown', fecharComEscape);
window.addEventListener('scroll', atualizarCabecalho, { passive: true });
desktop.addEventListener('change', adequarMenu);
atualizarCabecalho();

export {};
