import { Vetor3 } from '../physics/Vetor3';
import { PARAMETROS_BSS006 } from '../veiculos/DefinicaoBss006';
import { montarVeiculoBss } from '../veiculos/MontagemBss';
import { registrarHidrodinamicaBss006 } from '../veiculos/HidrodinamicaBss006';
import { criarAmbienteAmerissagem } from './AmbienteAmerissagem';

/** Ensaio ADM de aproximação. Inicialização explícita, sem correções posteriores de posição/ângulo. */
export function criarEnsaioAmerissagem(inclinacaoRad = 0.005, velocidadeEntradaMps = 0.5, altitudeInicialM = 5) {
  const ambiente = criarAmbienteAmerissagem();
  const v = montarVeiculoBss(ambiente.mundo, ambiente.solo, { ...PARAMETROS_BSS006, id: 'bss-006',
    estadoInicialEnsaio: { centroCascoLocalM: new Vetor3(200, altitudeInicialM, 0),
      velocidadeLocalMps: new Vetor3(0, -velocidadeEntradaMps, 0), inclinacaoRad, velocidadeAngularRadps: 0 } });
  registrarHidrodinamicaBss006(ambiente.mundo, v);
  return { ...ambiente, veiculo: v };
}
