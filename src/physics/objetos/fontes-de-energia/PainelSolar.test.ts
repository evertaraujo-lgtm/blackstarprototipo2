import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../../Vetor3';
import { Bateria } from './Bateria';
import { PainelSolar } from './PainelSolar';

const base = (id: string) => ({ id, massaBaseKg: 5, dimensoesM: new Vetor3(1, 1, 0.1), resistenciaColisaoJ: 10_000, limiteTermicoC: 200 });

describe('PainelSolar', () => {
  it('carrega uma bateria vazia com o circuito fechado e para com sombra ou switch aberto', () => {
    let fator = 1;
    const bateria = new Bateria({ ...base('bateria-solar'), tensaoNominalV: 24, capacidadeEnergiaJ: 1_000, energiaInicialJ: 0 });
    const painel = new PainelSolar({ ...base('painel-solar'), areaAtivaM2: 2, irradianciaWPorM2: 1_000, eficiencia: 0.2, destino: bateria, obterFatorIluminacao: () => fator });
    painel.conexaoCarga.fecharInterruptor();
    painel.prepararPassoEnergetico(1);
    painel.prepararPassoOperacional(1);
    expect(bateria.energiaArmazenadaJ).toBeGreaterThan(0);
    const carregada = bateria.energiaArmazenadaJ;
    fator = 0;
    painel.prepararPassoEnergetico(1);
    painel.prepararPassoOperacional(1);
    expect(bateria.energiaArmazenadaJ).toBe(carregada);
  });
});
