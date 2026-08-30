import { Objeto } from '../objetos/base/Objeto';
import { SistemaAtmosferico } from './SistemaAtmosferico';

/** Evolui energia térmica sem alterar estado cinemático. */
export class SistemaTermico {
  public constructor(
    private readonly atmosfera: SistemaAtmosferico,
    private readonly temperaturaAmbienteC: number,
  ) {}

  /** Geração interna, convecção ambiente e jatos térmicos em ordem determinística. */
  public atualizar(objetos: readonly Objeto[], dtS: number): void {
    for (const objeto of objetos) {
      const potenciaGeradaW = objeto.obterPotenciaTermicaGeradaW();
      if (potenciaGeradaW > 0) objeto.aplicarEnergiaTermicaPeloCore(potenciaGeradaW * dtS, dtS);
      const potenciaConveccaoW = objeto.coeficienteConveccaoWPorM2C * objeto.areaTermicaM2
        * (objeto.temperaturaC - this.temperaturaAmbienteC);
      if (potenciaConveccaoW !== 0) objeto.aplicarEnergiaTermicaPeloCore(-potenciaConveccaoW * dtS, dtS);
      const velocidadeRelativa = objeto.getEstadoFisico().velocidadeMps.subtrair(this.atmosfera.velocidadeArMps);
      const forcaArrastoN = this.atmosfera.calcularArrasto(objeto, objeto.getEstadoFisico().velocidadeMps);
      const potenciaDissipadaNoArW = Math.max(0, -forcaArrastoN.produtoEscalar(velocidadeRelativa));
      const energiaNoObjetoJ = potenciaDissipadaNoArW * objeto.fracaoAquecimentoAerodinamico * dtS;
      if (energiaNoObjetoJ > 0) objeto.aplicarAquecimentoAerodinamicoPeloCore(energiaNoObjetoJ, dtS);
    }
    for (const fonte of objetos) {
      const jato = fonte.obterJatoTermico();
      if (!jato) continue;
      const origem = fonte.getEstadoFisico().posicaoM;
      for (const alvo of objetos) {
        if (alvo === fonte) continue;
        const vetor = alvo.getEstadoFisico().posicaoM.subtrair(origem);
        const distancia = vetor.magnitude;
        if (distancia === 0 || distancia > jato.alcanceM) continue;
        const alinhamento = vetor.produtoEscalar(jato.direcaoM) / distancia;
        if (alinhamento < Math.cos(jato.aberturaRad)) continue;
        const fracao = alinhamento * (1 - distancia / jato.alcanceM) ** 2;
        alvo.aplicarEnergiaTermicaPeloCore(jato.potenciaW * fracao * dtS, dtS);
      }
    }
  }

  /** Sem dados de efusividade, reparte a dissipação entre os materiais. */
  public distribuirCalorDeAtritoEntreObjetos(objetoA: Objeto, objetoB: Objeto, energiaJ: number, dtS: number): void {
    if (energiaJ <= 0) return;
    objetoA.aplicarCalorDeAtritoPeloCore(energiaJ / 2, dtS);
    objetoB.aplicarCalorDeAtritoPeloCore(energiaJ / 2, dtS);
  }
}
