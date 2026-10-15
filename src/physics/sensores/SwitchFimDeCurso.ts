import { Vetor3 } from '../Vetor3';
import type { CaixaOrientada } from '../geometria/ContatoCaixasOrientadas';
import { Objeto } from '../objetos/base/Objeto';

export type FaceDoObjeto = 'xPositiva' | 'xNegativa' | 'yPositiva' | 'yNegativa' | 'zPositiva' | 'zNegativa';

export interface DefinicaoSwitchFimDeCurso {
  readonly id: string;
  readonly objetoHospedeiro: Objeto;
  /** Face local do hospedeiro onde a face sensível fica voltada para fora. */
  readonly face: FaceDoObjeto;
  /** Dimensão transversal do atuador, em metros. Padrão: 2 cm. */
  readonly larguraM?: number;
  /** Dimensão transversal secundária, em metros. Padrão: 2 cm. */
  readonly alturaM?: number;
  /** Curso sensível perpendicular à face, em metros. Padrão: 5 mm. */
  readonly cursoM?: number;
  /** Diferencial mecânico de liberação após acionamento, em m; padrão zero. */
  readonly histereseM?: number;
}

export type AlvoDoSwitchFimDeCurso = Objeto | { readonly id: string; readonly tipo: 'superficie' };

/**
 * Sensor binário sem massa e sem autoridade sobre a física. Seu pequeno volume
 * sensível avança a partir de uma face do hospedeiro e é consultado pelo core
 * após a resolução de contatos do passo.
 */
export class SwitchFimDeCurso {
  private acionado = false;
  private alvoEmContato?: AlvoDoSwitchFimDeCurso;
  private deslocamentoLocalM = Vetor3.zero;

  /** Armazena definição/hospedeiro e valida identidade, histerese não negativa e dimensões/curso positivos finitos em m; não integra movimento nem aplica força. @contract f-958eb2b7694765e1 @reviewed M12-DOC: implementação lida. */
  public constructor(private readonly definicao: DefinicaoSwitchFimDeCurso) {
    if (!definicao.id) throw new Error('Switch de fim de curso precisa de identidade.');
    if (!Number.isFinite(definicao.histereseM ?? 0) || (definicao.histereseM ?? 0) < 0) throw new Error('Histerese do switch deve ser finita e não negativa.');
    for (const valor of [definicao.larguraM ?? 0.02, definicao.alturaM ?? 0.02, definicao.cursoM ?? 0.005]) {
      if (!Number.isFinite(valor) || valor <= 0) throw new Error('Dimensões do switch devem ser finitas e positivas.');
    }
  }

  /** Devolve `this.definicao.id`. Efeitos indiretos seguem as dependências chamadas. @contract f-4f57425a94bbe84c */
  public get id(): string { return this.definicao.id; }
  /** Devolve `this.definicao.objetoHospedeiro`. Efeitos indiretos seguem as dependências chamadas. @contract f-5d131fdb8cab246f */
  public get objetoHospedeiro(): Objeto { return this.definicao.objetoHospedeiro; }
  /** Devolve `this.definicao.face`. Efeitos indiretos seguem as dependências chamadas. @contract f-7986fb87185ed161 */
  public get face(): FaceDoObjeto { return this.definicao.face; }
  /** Devolve `this.definicao.larguraM ?? 0.02`. Efeitos indiretos seguem as dependências chamadas. @contract f-7eea4876c2a02a28 */
  public get larguraM(): number { return this.definicao.larguraM ?? 0.02; }
  /** Devolve `this.definicao.alturaM ?? 0.02`. Efeitos indiretos seguem as dependências chamadas. @contract f-bea4ca4309e3f44a */
  public get alturaM(): number { return this.definicao.alturaM ?? 0.02; }
  /** Devolve `this.definicao.cursoM ?? 0.005`. Efeitos indiretos seguem as dependências chamadas. @contract f-7e523af8560edc30 */
  public get cursoM(): number { return this.definicao.cursoM ?? 0.005; }
  /** Devolve `this.cursoM + (this.acionado ? this.definicao.histereseM ?? 0 : 0)`. Efeitos indiretos seguem as dependências chamadas. @contract f-b032f1415fe72f16 */
  private get cursoSensivelM(): number { return this.cursoM + (this.acionado ? this.definicao.histereseM ?? 0 : 0); }
  /** Devolve `this.acionado ? 1 : 0`. Efeitos indiretos seguem as dependências chamadas. @contract f-d2c5daf1a289f2c2 */
  public get sinal(): 0 | 1 { return this.acionado ? 1 : 0; }
  /** Devolve `this.acionado`. Efeitos indiretos seguem as dependências chamadas. @contract f-29e63e83f941a1a0 */
  public estaAcionado(): boolean { return this.acionado; }
  /** Devolve `this.alvoEmContato`. Efeitos indiretos seguem as dependências chamadas. @contract f-7e60afc0030efd29 */
  public obterAlvoEmContato(): AlvoDoSwitchFimDeCurso | undefined { return this.alvoEmContato; }
  /** Devolve `this.deslocamentoLocalM`. Efeitos indiretos seguem as dependências chamadas. @contract f-93f94a9256121014 */
  public get deslocamentoLocal(): Vetor3 { return this.deslocamentoLocalM; }
  /** Ajuste de montagem do sensor; não altera o corpo hospedeiro.
   * @contract f-9e6ce2ceb2e0dbad
   */
  public definirDeslocamentoLocal(deslocamentoM: Vetor3): void {
    if (![deslocamentoM.x, deslocamentoM.y, deslocamentoM.z].every(Number.isFinite)) throw new Error('Deslocamento do sensor deve ser finito.');
    this.deslocamentoLocalM = deslocamentoM;
  }

  /** Volume global do atuador, orientado junto com o hospedeiro.
   * @contract f-6cca72df3d5ce274
   */
  public obterVolumeSensivel(): CaixaOrientada {
    const estado = this.objetoHospedeiro.getEstadoFisico();
    const metade = this.objetoHospedeiro.dimensoesM.multiplicar(0.5);
    const direcaoLocal = this.obterDirecaoLocal();
    const deslocamentoLocal = new Vetor3(
      direcaoLocal.x * (metade.x + (this.cursoSensivelM / 2)),
      direcaoLocal.y * (metade.y + (this.cursoSensivelM / 2)),
      direcaoLocal.z * (metade.z + (this.cursoSensivelM / 2)),
    ).adicionar(this.deslocamentoLocalM);
    const c = Math.cos(estado.orientacaoRad.z); const s = Math.sin(estado.orientacaoRad.z);
    const deslocamentoGlobal = new Vetor3(
      (deslocamentoLocal.x * c) - (deslocamentoLocal.y * s),
      (deslocamentoLocal.x * s) + (deslocamentoLocal.y * c),
      deslocamentoLocal.z,
    );
    const dimensoesM = this.obterDimensoesDoVolume();
    return { posicaoM: estado.posicaoM.adicionar(deslocamentoGlobal), dimensoesM, orientacaoZRad: estado.orientacaoRad.z };
  }

  /** Pontos da face externa do atuador, úteis para superfícies planas.
   * @contract f-95fd2558a267713a
   */
  public obterPontosDaFaceSensivelM(): readonly Vetor3[] {
    const volume = this.obterVolumeSensivel();
    const direcao = this.obterDirecaoGlobal();
    const metade = volume.dimensoesM.multiplicar(0.5);
    const centroFace = volume.posicaoM.adicionar(new Vetor3(direcao.x * metade.x, direcao.y * metade.y, direcao.z * metade.z));
    if (this.face === 'xPositiva' || this.face === 'xNegativa') {
      const eixoY = new Vetor3(-Math.sin(volume.orientacaoZRad), Math.cos(volume.orientacaoZRad), 0);
      return [-1, 1].flatMap((sinalY) => [-1, 1].map((sinalZ) => centroFace.adicionar(eixoY.multiplicar(sinalY * metade.y)).adicionar(new Vetor3(0, 0, sinalZ * metade.z))));
    }
    if (this.face === 'yPositiva' || this.face === 'yNegativa') {
      const eixoX = new Vetor3(Math.cos(volume.orientacaoZRad), Math.sin(volume.orientacaoZRad), 0);
      return [-1, 1].flatMap((sinalX) => [-1, 1].map((sinalZ) => centroFace.adicionar(eixoX.multiplicar(sinalX * metade.x)).adicionar(new Vetor3(0, 0, sinalZ * metade.z))));
    }
    const eixoX = new Vetor3(Math.cos(volume.orientacaoZRad), Math.sin(volume.orientacaoZRad), 0);
    const eixoY = new Vetor3(-Math.sin(volume.orientacaoZRad), Math.cos(volume.orientacaoZRad), 0);
    return [-1, 1].flatMap((sinalX) => [-1, 1].map((sinalY) => centroFace.adicionar(eixoX.multiplicar(sinalX * metade.x)).adicionar(eixoY.multiplicar(sinalY * metade.y))));
  }

  /** API exclusiva do MundoFisico após consultar geometrias no passo atual.
   * @contract f-67552310bde6de7d
   */
  public atualizarContatoPeloCore(alvo?: AlvoDoSwitchFimDeCurso): void {
    this.alvoEmContato = alvo;
    this.acionado = alvo !== undefined;
  }

  /** Traduz a face declarada para um dos seis eixos cartesianos unitários locais; exige face válida pelo tipo. @contract f-1bdcafeb1e8b7ad7 @reviewed M12-DOC: implementação lida. */
  private obterDirecaoLocal(): Vetor3 {
    switch (this.face) {
      case 'xPositiva': return new Vetor3(1, 0, 0);
      case 'xNegativa': return new Vetor3(-1, 0, 0);
      case 'yPositiva': return new Vetor3(0, 1, 0);
      case 'yNegativa': return new Vetor3(0, -1, 0);
      case 'zPositiva': return new Vetor3(0, 0, 1);
      case 'zNegativa': return new Vetor3(0, 0, -1);
    }
  }

  /** Gira direção sensível local pela orientação Z atual do hospedeiro e preserva componente Z; consulta o core sem mover sensor. @contract f-1aedd06fc2fa4643 @reviewed M12-DOC: implementação lida. */
  private obterDirecaoGlobal(): Vetor3 {
    const direcao = this.obterDirecaoLocal();
    const angulo = this.objetoHospedeiro.getEstadoFisico().orientacaoRad.z;
    return new Vetor3((direcao.x * Math.cos(angulo)) - (direcao.y * Math.sin(angulo)), (direcao.x * Math.sin(angulo)) + (direcao.y * Math.cos(angulo)), direcao.z);
  }

  /** Distribui curso sensível, largura e altura em m conforme eixo da face para construir volume de detecção; não é geometria de colisão rígida. @contract f-c591823d5b4ad4b7 @reviewed M12-DOC: implementação lida. */
  private obterDimensoesDoVolume(): Vetor3 {
    switch (this.face) {
      case 'xPositiva': case 'xNegativa': return new Vetor3(this.cursoSensivelM, this.larguraM, this.alturaM);
      case 'yPositiva': case 'yNegativa': return new Vetor3(this.larguraM, this.cursoSensivelM, this.alturaM);
      case 'zPositiva': case 'zNegativa': return new Vetor3(this.larguraM, this.alturaM, this.cursoSensivelM);
    }
  }
}
