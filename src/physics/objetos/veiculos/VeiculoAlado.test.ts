import { describe, expect, it } from 'vitest';
import { VeiculoAlado } from './VeiculoAlado';
import { Vetor3 } from '../../Vetor3';
import { MundoFisico } from '../../MundoFisico';
import { SuperficiePlano } from '../../SuperficiePlano';

const criarVeiculoAlado = () => new VeiculoAlado({
  id: 'veiculo-alado', massaBaseKg: 1_500, dimensoesM: new Vetor3(4, 1.5, 1.8),
  resistenciaColisaoJ: 50_000, resistenciaCalorK: 1_000,
  quantidadeRodas: 4, forcaTracaoMaximaN: 4_500, forcaFrenagemMaximaN: 9_000,
  coeficienteAderenciaPneus: 0.9, coeficienteResistenciaRolamento: 0.01, raioRodaM: 0.35,
  areaAsaM2: 24, anguloIncidenciaRad: 0.12, coeficienteSustentacaoPorRad: 5.7,
  coeficienteArrastoAsa: 0.04, anguloEstolRad: 0.35,
  estadoInicial: { posicaoM: new Vetor3(0, 0.75, 0), velocidadeMps: new Vetor3(40, 0, 0) },
});

describe('VeiculoAlado', () => {
  it('gera sustentação positiva a partir de velocidade horizontal relativa ao ar', () => {
    const veiculo = criarVeiculoAlado();
    const [forca] = veiculo.obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero });
    expect(forca.forcaN.y).toBeGreaterThan(0);
    expect(forca.forcaN.x).toBeLessThan(0);
  });

  it('não gera sustentação após estol por ângulo de ataque excessivo', () => {
    const veiculo = criarVeiculoAlado();
    veiculo.atualizarEstadoPeloCore({ ...veiculo.getEstadoFisico(), orientacaoRad: new Vetor3(0, 0, 0.5) });
    const [forca] = veiculo.obterForcasAerodinamicas({ densidadeArKgM3: 1.225, velocidadeArMps: Vetor3.zero });
    expect(forca.forcaN.y).toBeCloseTo(0, 8);
    expect(forca.forcaN.x).toBeLessThan(0);
  });

  it('corta a tração ao ultrapassar 1 m, retorna ao solo e freia pelas rodas', () => {
    const veiculo = criarVeiculoAlado();
    veiculo.atualizarEstadoPeloCore({ ...veiculo.getEstadoFisico(), posicaoM: new Vetor3(0, 0.75, 0), velocidadeMps: Vetor3.zero });
    const mundo = new MundoFisico(1 / 240, { densidadeAtmosfericaKgM3: 1.225 });
    mundo.registrarSuperficie(new SuperficiePlano('pista-alada', 'outro', 0, 1_000_000, 0.02, 0.9));
    mundo.registrarObjeto(veiculo);
    veiculo.definirComandoTracao(1);
    let decolou = false;
    let pousou = false;
    let parou = false;
    for (let passo = 0; passo < 30_000; passo += 1) {
      mundo.avancar(1 / 240);
      const estado = veiculo.getEstadoFisico();
      if (!decolou && estado.posicaoM.y >= 1) {
        decolou = true;
        veiculo.definirComandoTracao(0);
      }
      if (decolou && estado.posicaoM.y <= 0.77 && estado.velocidadeMps.y <= 0) {
        pousou = true;
        veiculo.definirComandoFreio(1);
      }
      if (pousou && estado.velocidadeMps.magnitude <= 0.05 && estado.velocidadeAngularRadps.magnitude <= 0.05) {
        parou = true;
        break;
      }
    }
    expect(decolou).toBe(true);
    expect(pousou).toBe(true);
    expect(parou).toBe(true);
  });
});
