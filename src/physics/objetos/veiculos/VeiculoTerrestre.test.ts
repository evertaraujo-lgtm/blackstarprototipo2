import { describe, expect, it } from 'vitest';
import { MundoFisico } from '../../MundoFisico';
import { Objeto } from '../base/Objeto';
import { ObjetoTriangularRetangulo } from '../base/ObjetoTriangularRetangulo';
import { SuperficiePlano } from '../../SuperficiePlano';
import { VeiculoTerrestre } from './VeiculoTerrestre';
import { Vetor3 } from '../../Vetor3';

const criarVeiculo = (id: string, x = 0, velocidadeX = 0): VeiculoTerrestre => new VeiculoTerrestre({
  id,
  massaBaseKg: 1_500,
  dimensoesM: new Vetor3(4, 1.5, 1.8),
  // Aproximação para um carro médio: colisões leves podem não causar dano
  // estrutural mensurável; impactos mais energéticos consomem integridade.
  resistenciaColisaoJ: 50_000,
  resistenciaCalorK: 1_000,
  quantidadeRodas: 4,
  forcaTracaoMaximaN: 4_500,
  forcaFrenagemMaximaN: 9_000,
  coeficienteAderenciaPneus: 0.9,
  coeficienteResistenciaRolamento: 0.01,
  raioRodaM: 0.35,
  estadoInicial: { posicaoM: new Vetor3(x, 0.75, 0), velocidadeMps: new Vetor3(velocidadeX, 0, 0) },
});

const prepararMundo = (veiculo: VeiculoTerrestre): MundoFisico => {
  const mundo = new MundoFisico(1 / 240);
  mundo.registrarSuperficie(new SuperficiePlano('pista', 'outro', 0, 1_000_000, 0.02, 0.9));
  mundo.registrarObjeto(veiculo);
  return mundo;
};

describe('VeiculoTerrestre', () => {
  it('posiciona as rodas para tocar o solo por tangência, não pelo centro de massa', () => {
    const veiculo = criarVeiculo('veiculo-tangencia');
    const alturaCentroRodaM = veiculo.getPosicoesRodasLocaisM()[0].y + veiculo.getEstadoFisico().posicaoM.y;

    expect(alturaCentroRodaM).toBeCloseTo(veiculo.raioRodaM, 10);
    expect(alturaCentroRodaM - veiculo.raioRodaM).toBeCloseTo(0, 10);
    expect(veiculo.getCentroChassiLocalM().y - (veiculo.alturaChassiM / 2)).toBeGreaterThan(veiculo.getPosicoesRodasLocaisM()[0].y);
    const menorAlturaContatoM = Math.min(...veiculo.getPontosDeContatoLocaisM().map((ponto) => ponto.y)) + veiculo.getEstadoFisico().posicaoM.y;
    expect(menorAlturaContatoM).toBeCloseTo(0, 10);
  });

  it('apoia o chassi no solo quando o veículo está de cabeça para baixo, sem atravessá-lo', () => {
    const veiculo = criarVeiculo('veiculo-invertido');
    veiculo.atualizarEstadoPeloCore({
      ...veiculo.getEstadoFisico(),
      posicaoM: new Vetor3(0, 4, 0),
      orientacaoRad: new Vetor3(0, 0, Math.PI),
    });
    const mundo = prepararMundo(veiculo);
    let apoiado = false;
    for (let passo = 0; passo < 10_000; passo += 1) {
      mundo.avancar(1 / 240);
      const estado = veiculo.getEstadoFisico();
      const menorAlturaContato = Math.min(...veiculo.getPontosDeContatoLocaisM().map((ponto) => {
        const cosseno = Math.cos(estado.orientacaoRad.z);
        const seno = Math.sin(estado.orientacaoRad.z);
        return estado.posicaoM.y + (ponto.x * seno) + (ponto.y * cosseno);
      }));
      apoiado = menorAlturaContato >= -1e-8 && Math.abs(estado.velocidadeMps.y) <= 0.05;
      if (apoiado) break;
    }

    expect(apoiado).toBe(true);
    // As rodas ficam acima do chassi quando invertido; elas não podem sustentar o veículo através do solo.
    expect(veiculo.getEstadoFisico().posicaoM.y).toBeGreaterThan(0.7);
  });

  it('não produz tração nem frenagem quando está invertido e apoiado somente pelo chassi', () => {
    const veiculo = criarVeiculo('veiculo-invertido-sem-tracao');
    veiculo.atualizarEstadoPeloCore({
      ...veiculo.getEstadoFisico(),
      posicaoM: new Vetor3(0, 0.75, 0), orientacaoRad: new Vetor3(0, 0, Math.PI),
    });
    const mundo = prepararMundo(veiculo);
    veiculo.definirComandoTracao(1);
    veiculo.definirComandoFreio(1);
    mundo.avancar(0.5);

    expect(Math.abs(veiculo.getEstadoFisico().velocidadeMps.x)).toBeLessThan(0.05);
  });

  it('acelera horizontalmente pela tração das rodas sem alterar estado cinemático diretamente', () => {
    const veiculo = criarVeiculo('veiculo-aceleracao');
    const mundo = prepararMundo(veiculo);
    veiculo.definirComandoTracao(1);
    mundo.avancar(1);

    expect(veiculo.massaKg).toBe(1_500);
    expect(veiculo.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(2.5);
    expect(veiculo.getEstadoFisico().posicaoM.x).toBeGreaterThan(1);
  });

  it('freia reduzindo a velocidade horizontal por força oposta ao movimento', () => {
    const veiculo = criarVeiculo('veiculo-frenagem', 0, 12);
    const mundo = prepararMundo(veiculo);
    veiculo.definirComandoFreio(1);
    mundo.avancar(1);

    const velocidadeFinal = veiculo.getEstadoFisico().velocidadeMps.x;
    expect(velocidadeFinal).toBeGreaterThanOrEqual(0);
    expect(velocidadeFinal).toBeLessThan(6);
  });

  it('colide com parede retangular de 4000 kg e transfere-lhe movimento', () => {
    const veiculo = criarVeiculo('veiculo-colisao', -8);
    const parede = new Objeto({
      id: 'parede-retangular-4000kg', massaBaseKg: 4_000, dimensoesM: new Vetor3(1, 3, 3),
      resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_000,
      estadoInicial: { posicaoM: new Vetor3(8, 1.5, 0) },
    });
    const mundo = prepararMundo(veiculo);
    mundo.registrarObjeto(parede);
    veiculo.definirComandoTracao(1);
    mundo.avancar(4);

    expect(veiculo.getEstadoFisico().velocidadeMps.x).toBeLessThan(3);
    expect(parede.getEstadoFisico().velocidadeMps.x).toBeGreaterThan(0);
    expect(parede.getEstadoFisico().posicaoM.x).toBeGreaterThan(8);
    expect(veiculo.integridadeEstrutural).toBe(1);
  });

  it.each([0, 5, 10, 20])('acelera contra uma rampa triangular reta inclinada a 30 graus partindo de %d m/s', (velocidadeInicialMps) => {
    const veiculo = criarVeiculo(`veiculo-rampa-30-${velocidadeInicialMps}`, 0, velocidadeInicialMps);
    const baseRampaM = 6;
    const alturaRampaM = baseRampaM * Math.tan(Math.PI / 6);
    const rampa = new ObjetoTriangularRetangulo({
      id: 'rampa-triangular-30-graus', massaBaseKg: 4_000, dimensoesM: new Vetor3(baseRampaM, alturaRampaM, 3),
      inclinacaoRad: Math.PI / 6, resistenciaColisaoJ: 500_000, resistenciaCalorK: 1_000,
      // O centroide está a h/3 acima da base, mantendo a face inferior no solo.
      estadoInicial: { posicaoM: new Vetor3(12, alturaRampaM / 3, 0) },
    });
    const mundo = prepararMundo(veiculo);
    mundo.registrarObjeto(rampa);
    veiculo.definirComandoTracao(1);
    let maiorVelocidadeDaRampaMps = 0;
    for (let passo = 0; passo < 960; passo += 1) {
      mundo.avancar(1 / 240);
      maiorVelocidadeDaRampaMps = Math.max(maiorVelocidadeDaRampaMps, Math.abs(rampa.getEstadoFisico().velocidadeMps.x));
    }

    expect(rampa.inclinacaoRad).toBeCloseTo(Math.PI / 6, 10);
    expect(maiorVelocidadeDaRampaMps).toBeGreaterThan(0.05);
    expect(Number.isFinite(veiculo.getEstadoFisico().velocidadeMps.x)).toBe(true);
    if (velocidadeInicialMps <= 5) expect(veiculo.integridadeEstrutural).toBe(1);
    else expect(veiculo.integridadeEstrutural).toBeLessThan(1);
    if (velocidadeInicialMps === 20) expect(veiculo.integridadeEstrutural).toBe(0);
  });
});
