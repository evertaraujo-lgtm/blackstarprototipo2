import type { EstadoFisico } from '../objetos/base/Objeto';
import { Objeto } from '../objetos/base/Objeto';
import type { ForcaAplicada } from '../tipos/ForcaAplicada';
import { Vetor3 } from '../Vetor3';

/** Integra força e torque de um corpo isolado por Euler semi-implícito. */
export class IntegradorFisico {
  /** Aplica um impulso instantâneo (N.s) sem convertê-lo em força dependente de dt. */
  public aplicarImpulsoNoPonto(objeto: Objeto, impulsoNs: Vetor3, pontoM: Vetor3): void {
    const estado = objeto.getEstadoFisico();
    const velocidade = estado.velocidadeMps.adicionar(impulsoNs.multiplicar(1 / objeto.massaKg));
    const impulsoAngular = pontoM.subtrair(estado.posicaoM).produtoVetorial(impulsoNs);
    const inercia = objeto.getMomentoInerciaKgM2();
    const velocidadeAngular = estado.velocidadeAngularRadps.adicionar(new Vetor3(
      impulsoAngular.x / inercia.x,
      impulsoAngular.y / inercia.y,
      impulsoAngular.z / inercia.z,
    ));
    objeto.atualizarEstadoPeloCore({ ...estado, velocidadeMps: velocidade, velocidadeAngularRadps: velocidadeAngular });
  }

  public integrarObjeto(objeto: Objeto, forcas: readonly ForcaAplicada[], gravidadeMps2: Vetor3, dtS: number): void {
    const estado = objeto.getEstadoFisico();
    const pesoN = gravidadeMps2.multiplicar(objeto.massaKg);
    const resultanteN = forcas.reduce((soma, atual) => soma.adicionar(atual.forcaN), pesoN);
    const aceleracao = resultanteN.multiplicar(1 / objeto.massaKg);
    const velocidade = estado.velocidadeMps.adicionar(aceleracao.multiplicar(dtS));
    const posicao = estado.posicaoM.adicionar(velocidade.multiplicar(dtS));
    const torqueNm = forcas.reduce((soma, atual) => {
      const bracoM = atual.pontoM.subtrair(estado.posicaoM);
      return soma.adicionar(bracoM.produtoVetorial(atual.forcaN));
    }, Vetor3.zero).adicionar(forcas.reduce((soma, atual) => soma.adicionar(atual.torqueNm ?? Vetor3.zero), Vetor3.zero));
    const inercia = objeto.getMomentoInerciaKgM2();
    const aceleracaoAngular = new Vetor3(torqueNm.x / inercia.x, torqueNm.y / inercia.y, torqueNm.z / inercia.z);
    const velocidadeAngular = estado.velocidadeAngularRadps.adicionar(aceleracaoAngular.multiplicar(dtS));
    const orientacao = estado.orientacaoRad.adicionar(velocidadeAngular.multiplicar(dtS));
    const proximo: EstadoFisico = {
      posicaoM: posicao, velocidadeMps: velocidade, orientacaoRad: orientacao, velocidadeAngularRadps: velocidadeAngular,
    };
    objeto.atualizarEstadoPeloCore(proximo);
  }
}
