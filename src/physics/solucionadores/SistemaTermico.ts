import { Objeto } from '../objetos/base/Objeto';
import { SistemaAtmosferico } from './SistemaAtmosferico';

/** Evolui energia térmica sem alterar estado cinemático. */
export class SistemaTermico {
  /** Configura consulta atmosférica, exposição ao ar e reservatório ambiente em °C finitos; não converte limites materiais para Kelvin. @contract f-4a293a694405dea2 @reviewed M12-DOC: implementação lida. */
  public constructor(
    private readonly atmosfera: SistemaAtmosferico,
    private readonly temperaturaAmbienteC: number,
    private readonly exposicaoAoAr: (o: Objeto) => number = /** Porta padrão de exposição: retorna fração 1 (totalmente no ar) quando mundo não fornece adaptação para imersão; não consulta nem aplica força. @contract f-d8491cc35a8ea84c @reviewed M12-DOC: implementação lida. */
                                                            () => 1,
  ) {
    if (!Number.isFinite(temperaturaAmbienteC)) throw new Error('Temperatura ambiente deve ser finita em °C.');
  }

  /** Geração interna, convecção ambiente e jatos térmicos em ordem determinística.
   * @contract f-52ff1b5ad0ab53a2
   */
  public atualizar(objetos: readonly Objeto[], dtS: number): void {
    for (const objeto of objetos) {
      const potenciaGeradaW = objeto.obterPotenciaTermicaGeradaW();
      if (potenciaGeradaW > 0) objeto.aplicarEnergiaTermicaPeloCore(potenciaGeradaW * dtS, dtS);
      // Modelo concentrado: h é a calibração a 1,225 kg/m³; a rarefação
      // reduz a troca. Sem gás ambiente não há convecção ambiente.
      // Não modela convecção forçada/Reynolds; o fluxo entra no aquecimento por arrasto.
      const densidadeLocal = this.atmosfera.obterDensidadeNaPosicaoKgM3(objeto.getEstadoFisico().posicaoM) * this.exposicaoAoAr(objeto);
      const potenciaConveccaoW = objeto.coeficienteConveccaoWPorM2C * (densidadeLocal / 1.225) * objeto.areaTermicaM2
        * (objeto.temperaturaC - this.temperaturaAmbienteC);
      // Um subpasso nunca transfere mais energia que a necessária ao equilíbrio.
      const energiaEquilibrioJ = objeto.capacidadeTermicaJPorC * Math.abs(objeto.temperaturaC - this.temperaturaAmbienteC);
      const energiaConveccaoJ = Math.sign(potenciaConveccaoW) * Math.min(Math.abs(potenciaConveccaoW * dtS), energiaEquilibrioJ);
      if (energiaConveccaoJ !== 0) objeto.aplicarEnergiaTermicaPeloCore(-energiaConveccaoJ, dtS);
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

  /** Sem dados de efusividade, reparte a dissipação entre os materiais.
   * @contract f-b469dac88a38cf3f
   */
  public distribuirCalorDeAtritoEntreObjetos(objetoA: Objeto, objetoB: Objeto, energiaJ: number, dtS: number): void {
    if (energiaJ <= 0) return;
    objetoA.aplicarCalorDeAtritoPeloCore(energiaJ / 2, dtS);
    objetoB.aplicarCalorDeAtritoPeloCore(energiaJ / 2, dtS);
  }
}
