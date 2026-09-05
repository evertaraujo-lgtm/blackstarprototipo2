import { ConexaoEletrica } from '../conexoes/ConexaoEletrica';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Porta, BatenteDePorta } from '../objetos/mecanismos/Porta';
import { Bateria } from '../objetos/fontes-de-energia/Bateria';
import { SwitchFimDeCurso } from '../sensores/SwitchFimDeCurso';
import { ChumbadorAoSolo } from '../conexoes/ChumbadorAoSolo';
import { GuiaLinear } from '../conexoes/GuiaLinear';
import { SuperficiePlano } from '../SuperficiePlano';
import { Vetor3 } from '../Vetor3';

/** Valores de alumínio definidos pelo operador para este ensaio, não tabela de materiais. */
export const materialPortaAluminio = { limiteTermicoC: 150, temperaturaFusaoC: 700 } as const;

export interface ConfiguracaoEnsaioPorta {
  readonly energiaInicialJ?: number;
  readonly correnteMaximaA?: number;
  readonly resistenciaCaboOhm?: number;
  readonly comprimentoCaboM?: number;
  readonly tensaoBateriaV?: number;
  readonly resistenciaPortaJ?: number;
  readonly velocidadeInicialMps?: number;
  readonly alturaInicialM?: number;
  readonly resistenciaGuiaN?: number;
  readonly resistenciaChumbadoresN?: number;
}

/** Montagem compartilhada pela bancada e regressões, sem DOM ou relógio real. */
export function criarEnsaioPortaVertical(configuracao: ConfiguracaoEnsaioPorta = {}) {
  // Atmosfera terrestre padrão, 1,225 kg/m³. Subpassos máximos de 1/240 s.
  const mundo = new MundoFisico(1 / 240);
  const base = (id: string, massaBaseKg: number, dimensoesM: Vetor3, posicaoM: Vetor3) => ({
    id, massaBaseKg, dimensoesM, ...materialPortaAluminio,
    resistenciaColisaoJ: 20_000, dissipacaoImpacto: 0.8, estadoInicial: { posicaoM },
  });
  // Bateria de referência reutilizada do ensaio elétrico existente (limite de 1000 °C).
  const dimensoesBateriaM = new Vetor3(0.5, 0.5, 0.5);
  const bateria = new Bateria({ ...base('bateria-porta', 8, dimensoesBateriaM, new Vetor3(-2.5, dimensoesBateriaM.y / 2, 0)),
    limiteTermicoC: 1_000, temperaturaFusaoC: undefined, tensaoNominalV: configuracao.tensaoBateriaV ?? 24,
    capacidadeEnergiaJ: 1e6, energiaInicialJ: configuracao.energiaInicialJ ?? 1e6 });
  let porta!: Porta;
  const superior = new BatenteDePorta(base('batente-superior-porta', 100, new Vetor3(3, 0.2, 0.4), new Vetor3(0, 4.6, 0)), () => porta.obterReacaoNoBatente());
  const inferior = new Objeto(base('batente-inferior-porta', 100, new Vetor3(3, 0.2, 0.4), new Vetor3(0, 0.1, 0)));
  const laterais = [-1, 1].map((sinal) => new Objeto(base(`batente-lateral-${sinal}`, 100, new Vetor3(0.2, 4.3, 0.4), new Vetor3(sinal * 1.3, 2.35, 0))));
  const sensorAberto = new SwitchFimDeCurso({ id: 'sensor-porta-aberta', objetoHospedeiro: superior, face: 'yNegativa', larguraM: 0.1, alturaM: 0.2, cursoM: 0.05, histereseM: 0.01 });
  const sensorFechado = new SwitchFimDeCurso({ id: 'sensor-porta-fechada', objetoHospedeiro: inferior, face: 'yPositiva', larguraM: 0.1, alturaM: 0.2, cursoM: 0.05, histereseM: 0.01 });
  const conexaoEletrica = new ConexaoEletrica({ id: 'cabo-porta', fonte: bateria, destino: superior,
    comprimentoMaximoM: configuracao.comprimentoCaboM ?? 8, correnteMaximaA: configuracao.correnteMaximaA ?? 200,
    resistenciaCaboOhm: configuracao.resistenciaCaboOhm ?? 0 });
  porta = new Porta({ ...base('porta-aluminio', 40, new Vetor3(2, 2, 0.12), new Vetor3(0, 1.2, 0)),
    resistenciaColisaoJ: configuracao.resistenciaPortaJ ?? 2_000,
    estadoInicial: { posicaoM: new Vetor3(0, configuracao.alturaInicialM ?? 1.2, 0), velocidadeMps: new Vetor3(0, configuracao.velocidadeInicialMps ?? 0, 0) },
    areaFrontalM2: 0.24, coeficienteArrasto: 1.1, batente: superior, bateria, conexaoEletrica, sensorAberto, sensorFechado,
    velocidadeAvancoMps: 0.6, velocidadeRecuoMps: 0.4, forcaMaximaN: 4_000, tensaoNominalV: 24,
    rigidezRetencaoNPorM: 100_000, potenciaEmRepousoW: 12 });
  const objetos = [bateria, superior, inferior, ...laterais, porta];
  const solo = new SuperficiePlano('solo-porta', 'concreto', 0, 100_000, 0.8);
  objetos.forEach((objeto) => mundo.registrarObjeto(objeto));
  mundo.registrarSuperficie(solo);
  const chumbadores = [bateria, superior, inferior, ...laterais].map((objeto) => new ChumbadorAoSolo({
    id: `chumbador-${objeto.id}`, objeto, resistenciaN: configuracao.resistenciaChumbadoresN ?? 1e7,
  }));
  chumbadores.forEach((chumbador) => mundo.registrarChumbadorAoSolo(chumbador));
  const guia = new GuiaLinear('guia-porta-vertical', porta, configuracao.resistenciaGuiaN ?? 1e6, 'y');
  mundo.registrarGuiaLinear(guia);
  [sensorAberto, sensorFechado].forEach((sensor) => mundo.registrarSwitchFimDeCurso(sensor));
  return { mundo, porta, bateria, conexaoEletrica, superior, inferior, laterais, objetos, solo, guia, chumbadores, sensorAberto, sensorFechado };
}
