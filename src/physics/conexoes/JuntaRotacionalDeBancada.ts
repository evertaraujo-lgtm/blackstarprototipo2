import type { ForcaAplicada } from '../tipos/ForcaAplicada';
import { Vetor3 } from '../Vetor3';
import type { Objeto } from '../objetos/base/Objeto';
import type { MotorEletricoRotacional } from '../objetos/atuadores/MotorEletricoRotacional';

export interface DefinicaoJuntaRotacionalDeBancada {
  readonly id: string;
  readonly objetoBase: Objeto;
  readonly braco: Objeto;
  readonly motor: MotorEletricoRotacional;
  readonly pontoNoObjetoBaseM: Vetor3;
  readonly pontoNoBracoM: Vetor3;
  readonly objetosAcoplados?: readonly Objeto[];
  readonly rigidezDoPivoNPorM?: number;
  readonly amortecimentoDoPivoNsPorM?: number;
  readonly travaMecanicaInicial?: boolean;
  readonly anguloDaTravaInicialRad?: number;
}

/** Vinculo planar do motor fixo ao solo com haste e carga rotativa. */
export class JuntaRotacionalDeBancada {
  private travaMecanicaAtiva: boolean;

  public constructor(private readonly definicao: DefinicaoJuntaRotacionalDeBancada) {
    if (!definicao.id || definicao.objetoBase === definicao.braco) throw new Error('Junta de bancada invalida.');
    this.travaMecanicaAtiva = definicao.travaMecanicaInicial === true;
  }

  public get id(): string { return this.definicao.id; }
  public get objetoBase(): Objeto { return this.definicao.objetoBase; }
  public get braco(): Objeto { return this.definicao.braco; }
  public get estaTravada(): boolean { return this.travaMecanicaAtiva; }
  public ignoraColisaoEntre(objetoA: Objeto, objetoB: Objeto): boolean {
    return (objetoA === this.definicao.objetoBase && objetoB === this.definicao.braco)
      || (objetoA === this.definicao.braco && objetoB === this.definicao.objetoBase);
  }

  public obterForcasPara(objeto: Objeto): ForcaAplicada[] {
    if (objeto !== this.definicao.objetoBase && objeto !== this.definicao.braco) return [];
    const base = this.obterPontoMundo(this.definicao.objetoBase, this.definicao.pontoNoObjetoBaseM);
    const ponta = this.obterPontoMundo(this.definicao.braco, this.definicao.pontoNoBracoM);
    const velocidadeBase = this.obterVelocidadeDoPonto(this.definicao.objetoBase, this.definicao.pontoNoObjetoBaseM);
    const velocidadeBraco = this.obterVelocidadeDoPonto(this.definicao.braco, this.definicao.pontoNoBracoM);
    const erro = base.subtrair(ponta);
    const rigidez = this.definicao.rigidezDoPivoNPorM ?? 10_000;
    const amortecimento = this.definicao.amortecimentoDoPivoNsPorM ?? 1_000;
    const forcaPivo = erro.multiplicar(rigidez).adicionar(velocidadeBase.subtrair(velocidadeBraco).multiplicar(amortecimento));
    const limitada = forcaPivo.multiplicar(Math.min(1, 20_000 / Math.max(20_000, forcaPivo.magnitude)));
    const massaCargaKg = (this.definicao.objetosAcoplados ?? [this.definicao.braco]).reduce((soma, membro) => soma + membro.massaKg, 0);
    const reacaoPeso = new Vetor3(0, 9.80665 * massaCargaKg, 0);
    const sinal = objeto === this.definicao.braco ? 1 : -1;
    const forcaDaJunta = limitada.adicionar(reacaoPeso).multiplicar(sinal);
    const centroDoObjeto = objeto.getEstadoFisico().posicaoM;
    const pontoDoObjeto = objeto === this.definicao.braco ? ponta : base;
    const torqueDaForcaDaJuntaNm = pontoDoObjeto.subtrair(centroDoObjeto).produtoVetorial(forcaDaJunta).z;
    const anguloDaTravaRad = this.definicao.anguloDaTravaInicialRad ?? 0;
    if (this.travaMecanicaAtiva && Math.abs(this.definicao.motor.anguloAlvoRelativoRad - anguloDaTravaRad) > 1e-6) {
      this.travaMecanicaAtiva = false;
    }
    const torqueDaTravaNoBracoNm = this.travaMecanicaAtiva
      ? (anguloDaTravaRad - this.definicao.braco.getEstadoFisico().orientacaoRad.z) * 5_000
        - this.definicao.braco.getEstadoFisico().velocidadeAngularRadps.z * 500
      : 0;
    return [{
      forcaN: forcaDaJunta,
      pontoM: pontoDoObjeto,
      torqueNm: new Vetor3(0, 0, this.definicao.motor.torqueAtualNm * sinal - torqueDaForcaDaJuntaNm + torqueDaTravaNoBracoNm * sinal),
    }];
  }

  private obterPontoMundo(objeto: Objeto, pontoLocal: Vetor3): Vetor3 {
    const estado = objeto.getEstadoFisico(); const c = Math.cos(estado.orientacaoRad.z); const s = Math.sin(estado.orientacaoRad.z);
    return estado.posicaoM.adicionar(new Vetor3(pontoLocal.x * c - pontoLocal.y * s, pontoLocal.x * s + pontoLocal.y * c, pontoLocal.z));
  }

  private obterVelocidadeDoPonto(objeto: Objeto, pontoLocal: Vetor3): Vetor3 {
    const estado = objeto.getEstadoFisico(); const ponto = this.obterPontoMundo(objeto, pontoLocal); const rel = ponto.subtrair(estado.posicaoM);
    return estado.velocidadeMps.adicionar(new Vetor3(-estado.velocidadeAngularRadps.z * rel.y, estado.velocidadeAngularRadps.z * rel.x, 0));
  }
}
