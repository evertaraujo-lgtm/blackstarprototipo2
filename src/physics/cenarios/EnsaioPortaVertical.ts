import { GeradorCA } from '../objetos/fontes-de-energia/GeradorCA';
import { Contator } from '../conexoes/eletrica/Contator';
import { ConexaoEletrica } from '../conexoes/ConexaoEletrica';
import { MundoFisico } from '../MundoFisico';
import { Objeto } from '../objetos/base/Objeto';
import { Porta, BatenteDePorta } from '../objetos/mecanismos/Porta';
import { TravaPorta } from '../objetos/mecanismos/TravaPorta';
import { ConjuntoPortaBatente } from '../objetos/mecanismos/ConjuntoPortaBatente';
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
  /** Regressão da montagem anterior; a bancada usa circuitos separados. */
  readonly separarPotencia?: boolean;
  /** Permite isolar regressões históricas anteriores à trava fail-safe. */
  readonly instalarTrava?: boolean;
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
  const separado = configuracao.separarPotencia !== false;
  const gerador = new GeradorCA({ ...base('gerador-ca-porta', 80, new Vetor3(1, 0.8, 0.8), new Vetor3(-4.2, 0.4, 0)),
    limiteTermicoC: 125, temperaturaFusaoC: undefined, temperaturaFalhaTotalC: 180,
    tensaoNominalV: 220, frequenciaHz: 60, potenciaNominalW: 4_000, energiaMecanicaInicialJ: 10_000_000, eficiencia: 0.9 });
  const contator = new Contator();
  let porta!: Porta;
  let trava: TravaPorta | undefined;
  let conjunto!: ConjuntoPortaBatente;
  const superior = new BatenteDePorta(base('batente-superior-porta', 100, new Vetor3(3, 0.2, 0.4), new Vetor3(0, 4.6, 0)), () => porta.obterReacaoNoBatente());
  const inferior = new Objeto(base('batente-inferior-porta', 100, new Vetor3(3, 0.2, 0.4), new Vetor3(0, 0.1, 0)));
  const laterais = [-1, 1].map((sinal) => sinal < 0
    ? new BatenteDePorta(base(`batente-lateral-${sinal}`, 100, new Vetor3(0.2, 4.3, 0.4), new Vetor3(sinal * 1.3, 2.35, 0)), () => trava?.obterReacaoNoBatente() ?? [])
    : new Objeto(base(`batente-lateral-${sinal}`, 100, new Vetor3(0.2, 4.3, 0.4), new Vetor3(sinal * 1.3, 2.35, 0))));
  const sensorAberto = new SwitchFimDeCurso({ id: 'sensor-porta-aberta', objetoHospedeiro: superior, face: 'yNegativa', larguraM: 0.1, alturaM: 0.2, cursoM: 0.05, histereseM: 0.01 });
  const sensorFechado = new SwitchFimDeCurso({ id: 'sensor-porta-fechada', objetoHospedeiro: inferior, face: 'yPositiva', larguraM: 0.1, alturaM: 0.2, cursoM: 0.05, histereseM: 0.01 });
  const conexaoEletrica = new ConexaoEletrica({ id: separado ? 'comando-cc-24v' : 'cabo-porta', fonte: bateria, destino: superior,
    comprimentoMaximoM: configuracao.comprimentoCaboM ?? 8, correnteMaximaA: configuracao.correnteMaximaA ?? (separado ? 2 : 200),
    resistenciaCaboOhm: configuracao.resistenciaCaboOhm ?? 0 });
  const conexaoPotencia = new ConexaoEletrica({ id: 'potencia-ca-220v', fonte: gerador, destino: superior,
    comprimentoMaximoM: 10, correnteMaximaA: 20, interruptores: [contator], inicialmenteLigada: true });
  porta = new Porta({ ...base('porta-aluminio', 40, new Vetor3(2, 2, 0.12), new Vetor3(0, 1.2, 0)),
    resistenciaColisaoJ: configuracao.resistenciaPortaJ ?? 2_000,
    estadoInicial: { posicaoM: new Vetor3(0, configuracao.alturaInicialM ?? 1.2, 0), velocidadeMps: new Vetor3(0, configuracao.velocidadeInicialMps ?? 0, 0) },
    areaFrontalM2: 0.24, coeficienteArrasto: 1.1, batente: superior, bateria, conexaoEletrica, sensorAberto, sensorFechado,
    potenciaSeparada: separado ? { conexao: conexaoPotencia, contator } : undefined,
    obterTravaRecuada: () => trava?.estaRecuada ?? true,
    obterForcasDaTrava: () => trava?.obterForcasNaPorta() ?? [],
    apoioEstruturalDisponivel: () => conjunto.apoioEstruturalDisponivel,
    velocidadeAvancoMps: 0.6, velocidadeRecuoMps: 0.4, forcaMaximaN: 4_000, tensaoNominalV: 24,
    rigidezRetencaoNPorM: 100_000, potenciaEmRepousoW: 12 });
  if (configuracao.instalarTrava !== false) {
    trava = new TravaPorta({ ...base('trava-porta', 2, new Vetor3(0.2, 0.2, 0.2), new Vetor3(-0.9, 2.32, 0)),
      limiteTermicoC: 150, temperaturaFusaoC: undefined, temperaturaFalhaTotalC: 700,
      batente: laterais[0], porta: () => porta, conexaoComando: conexaoEletrica,
      apoioEstruturalDisponivel: () => conjunto.apoioEstruturalDisponivel,
      sensorPortaAberta: () => porta.sensorAbertoAcionado, obterUltimoComandoOperacional: () => porta.obterUltimoComandoOperacional(),
      cursoM: 0.2, velocidadeMps: 0.5, forcaMaximaN: 1_000, potenciaRecuoW: 18 });
  }
  const objetos = [...(separado ? [gerador] : []), bateria, superior, inferior, ...laterais, porta, ...(trava ? [trava] : [])];
  const solo = new SuperficiePlano('solo-porta', 'concreto', 0, 100_000, 0.8);
  objetos.forEach((objeto) => mundo.registrarObjeto(objeto));
  mundo.registrarSuperficie(solo);
  const pecasDoBatente = [superior, inferior, ...laterais];
  // Cada peça do batente possui apoio físico; a composição invalida o caminho
  // de reação inteiro quando qualquer desses vínculos se rompe.
  const fixadoresBatente: readonly [] = [];
  const chumbadores = [...(separado ? [gerador] : []), bateria, superior, inferior, ...laterais].map((objeto) => new ChumbadorAoSolo({
    id: `chumbador-${objeto.id}`, objeto, resistenciaN: configuracao.resistenciaChumbadoresN ?? 1e7,
  }));
  chumbadores.forEach((chumbador) => mundo.registrarChumbadorAoSolo(chumbador));
  const guia = new GuiaLinear('guia-porta-vertical', porta, configuracao.resistenciaGuiaN ?? 1e6, 'y');
  mundo.registrarGuiaLinear(guia);
  const guiaTrava = trava ? new GuiaLinear('guia-trava-porta', trava, 1_000_000, 'x') : undefined;
  if (guiaTrava) mundo.registrarGuiaLinear(guiaTrava);
  conjunto = new ConjuntoPortaBatente({
    porta, pecasDoBatente, guiaDaPorta: guia, trava, guiaDaTrava: guiaTrava,
    fixadoresDoBatente: fixadoresBatente,
    chumbadoresDoBatente: chumbadores.filter(chumbador => pecasDoBatente.includes(chumbador.objeto)),
  });
  [sensorAberto, sensorFechado].forEach((sensor) => mundo.registrarSwitchFimDeCurso(sensor));
  return { mundo, conjunto, porta, trava, bateria, gerador, contator, conexaoPotencia, conexaoEletrica, superior, inferior, laterais, objetos, solo, guia, guiaTrava, fixadoresBatente, chumbadores, sensorAberto, sensorFechado };
}
