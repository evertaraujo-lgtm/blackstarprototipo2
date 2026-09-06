import { describe, expect, it } from 'vitest';
import { Vetor3 } from '../Vetor3';
import { Bateria } from '../objetos/fontes-de-energia/Bateria';
import { Objeto } from '../objetos/base/Objeto';
import { ConexaoEletrica } from '../conexoes/ConexaoEletrica';
import { Porta } from '../objetos/mecanismos/Porta';
import { Cilindro } from '../objetos/atuadores/Cilindro';
import { SwitchFimDeCurso } from './SwitchFimDeCurso';

describe('ajuste de montagem do SwitchFimDeCurso', () => {
  it('desloca o volume sensível sem mover o objeto hospedeiro', () => {
    const hospedeiro = new Objeto({
      id: 'porta',
      massaBaseKg: 1,
      dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000,
      limiteTermicoC: 1_000,
      estadoInicial: { posicaoM: Vetor3.zero },
    });
    const sensor = new SwitchFimDeCurso({
      id: 'sensor-aberto',
      objetoHospedeiro: hospedeiro,
      face: 'yPositiva',
    });

    const posicaoInicial = sensor.obterVolumeSensivel().posicaoM;
    sensor.definirDeslocamentoLocal(new Vetor3(0, 2, 0));
    const posicaoDeslocada = sensor.obterVolumeSensivel().posicaoM;

    expect(posicaoDeslocada.y - posicaoInicial.y).toBe(2);
    expect(hospedeiro.getEstadoFisico().posicaoM).toEqual(Vetor3.zero);
  });

  it('considera qualquer contato como fim de curso, sem filtrar a identidade do alvo', () => {
    const bateria = new Bateria({
      id: 'bateria-controle', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, tensaoNominalV: 24,
      capacidadeEnergiaJ: 1_000, energiaInicialJ: 1_000, estadoInicial: { posicaoM: Vetor3.zero },
    });
    const batente = new Objeto({
      id: 'batente', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1),
      resistenciaColisaoJ: 10_000, limiteTermicoC: 1_000, estadoInicial: { posicaoM: Vetor3.zero },
    });
    const sensorAberto = new SwitchFimDeCurso({ id: 'aberto', objetoHospedeiro: batente, face: 'yNegativa' });
    const sensorFechado = new SwitchFimDeCurso({ id: 'fechado', objetoHospedeiro: batente, face: 'yPositiva' });
    const porta = new Porta({
      id: 'porta', massaBaseKg: 1, dimensoesM: new Vetor3(1, 1, 1), resistenciaColisaoJ: 10_000,
      limiteTermicoC: 1_000, estadoInicial: { posicaoM: new Vetor3(0, 2, 0) }, batente, bateria,
      conexaoEletrica: new ConexaoEletrica({ id: 'cabo-porta', fonte: bateria, destino: batente, comprimentoMaximoM: 10, correnteMaximaA: 10 }),
      sensorAberto, sensorFechado, velocidadeAvancoMps: 1, velocidadeRecuoMps: 1, forcaMaximaN: 100,
      tensaoNominalV: 24, rigidezRetencaoNPorM: 0, potenciaEmRepousoW: 0,
    });
    const alvoExterno = new Objeto({
      id: 'chave-de-fenda', massaBaseKg: 0.1, dimensoesM: new Vetor3(0.1, 0.1, 0.1),
      resistenciaColisaoJ: 100, limiteTermicoC: 1_000, estadoInicial: { posicaoM: Vetor3.zero },
    });

    sensorAberto.atualizarContatoPeloCore(alvoExterno);

    expect(sensorAberto.estaAcionado()).toBe(true);
    expect(porta.sensorAbertoAcionado).toBe(true);
  });

  it('expõe as entradas atuais do cilindro no trace', () => {
    const cilindro = new Cilindro({ velocidadeAvancoMps: 1, velocidadeRecuoMps: 1 });
    cilindro.definirEntradas({ avancar: true, recuar: false, avancado: false, recuado: false });
    expect(cilindro.entradasAtuais).toEqual({ avancar: true, recuar: false, avancado: false, recuado: false });

    cilindro.definirEntradas({ avancar: false, recuar: false, avancado: true, recuado: false });
    expect(cilindro.entradasAtuais.avancar).toBe(true);
    expect(cilindro.velocidadeSolicitadaMps).toBe(0);

    cilindro.definirEntradas({ avancar: false, recuar: true, avancado: true, recuado: false });
    expect(cilindro.entradasAtuais).toEqual({ avancar: false, recuar: true, avancado: true, recuado: false });
    cilindro.limparSelo();
    expect(cilindro.entradasAtuais.avancar).toBe(false);
    expect(cilindro.entradasAtuais.recuar).toBe(false);
  });
});
