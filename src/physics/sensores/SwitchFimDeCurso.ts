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

  public constructor(private readonly definicao: DefinicaoSwitchFimDeCurso) {
    if (!definicao.id) throw new Error('Switch de fim de curso precisa de identidade.');
    if (!Number.isFinite(definicao.histereseM ?? 0) || (definicao.histereseM ?? 0) < 0) throw new Error('Histerese do switch deve ser finita e não negativa.');
    for (const valor of [definicao.larguraM ?? 0.02, definicao.alturaM ?? 0.02, definicao.cursoM ?? 0.005]) {
      if (!Number.isFinite(valor) || valor <= 0) throw new Error('Dimensões do switch devem ser finitas e positivas.');
    }
  }

  public get id(): string { return this.definicao.id; }
  public get objetoHospedeiro(): Objeto { return this.definicao.objetoHospedeiro; }
  public get face(): FaceDoObjeto { return this.definicao.face; }
  public get larguraM(): number { return this.definicao.larguraM ?? 0.02; }
  public get alturaM(): number { return this.definicao.alturaM ?? 0.02; }
  public get cursoM(): number { return this.definicao.cursoM ?? 0.005; }
  private get cursoSensivelM(): number { return this.cursoM + (this.acionado ? this.definicao.histereseM ?? 0 : 0); }
  public get sinal(): 0 | 1 { return this.acionado ? 1 : 0; }
  public estaAcionado(): boolean { return this.acionado; }
  public obterAlvoEmContato(): AlvoDoSwitchFimDeCurso | undefined { return this.alvoEmContato; }

  /** Volume global do atuador, orientado junto com o hospedeiro. */
  public obterVolumeSensivel(): CaixaOrientada {
    const estado = this.objetoHospedeiro.getEstadoFisico();
    const metade = this.objetoHospedeiro.dimensoesM.multiplicar(0.5);
    const direcaoLocal = this.obterDirecaoLocal();
    const deslocamentoLocal = new Vetor3(
      direcaoLocal.x * (metade.x + (this.cursoSensivelM / 2)),
      direcaoLocal.y * (metade.y + (this.cursoSensivelM / 2)),
      direcaoLocal.z * (metade.z + (this.cursoSensivelM / 2)),
    );
    const c = Math.cos(estado.orientacaoRad.z); const s = Math.sin(estado.orientacaoRad.z);
    const deslocamentoGlobal = new Vetor3(
      (deslocamentoLocal.x * c) - (deslocamentoLocal.y * s),
      (deslocamentoLocal.x * s) + (deslocamentoLocal.y * c),
      deslocamentoLocal.z,
    );
    const dimensoesM = this.obterDimensoesDoVolume();
    return { posicaoM: estado.posicaoM.adicionar(deslocamentoGlobal), dimensoesM, orientacaoZRad: estado.orientacaoRad.z };
  }

  /** Pontos da face externa do atuador, úteis para superfícies planas. */
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

  /** API exclusiva do MundoFisico após consultar geometrias no passo atual. */
  public atualizarContatoPeloCore(alvo?: AlvoDoSwitchFimDeCurso): void {
    this.alvoEmContato = alvo;
    this.acionado = alvo !== undefined;
  }

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

  private obterDirecaoGlobal(): Vetor3 {
    const direcao = this.obterDirecaoLocal();
    const angulo = this.objetoHospedeiro.getEstadoFisico().orientacaoRad.z;
    return new Vetor3((direcao.x * Math.cos(angulo)) - (direcao.y * Math.sin(angulo)), (direcao.x * Math.sin(angulo)) + (direcao.y * Math.cos(angulo)), direcao.z);
  }

  private obterDimensoesDoVolume(): Vetor3 {
    switch (this.face) {
      case 'xPositiva': case 'xNegativa': return new Vetor3(this.cursoSensivelM, this.larguraM, this.alturaM);
      case 'yPositiva': case 'yNegativa': return new Vetor3(this.larguraM, this.cursoSensivelM, this.alturaM);
      case 'zPositiva': case 'zNegativa': return new Vetor3(this.larguraM, this.alturaM, this.cursoSensivelM);
    }
  }
}
