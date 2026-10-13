import { AmbientePlano, type AmbienteFisico } from '../physics/ambiente/AmbienteFisico';
import { SuperficieEsferica } from '../physics/SuperficieEsferica';
import { ReferencialEsferico } from '../physics/ambiente/ReferencialFisico';
import { MundoFisico, type RajadaVento } from '../physics/MundoFisico';
import { SuperficiePlano } from '../physics/SuperficiePlano';
import { Vetor3 } from '../physics/Vetor3';
import { montarVeiculoBss, type ParametrosMontagemBss } from '../veiculos/MontagemBss';
import { PARAMETROS_BSS005, PARAMETROS_BSS006, IMPULSO_ESPECIFICO_NOMINAL_BSS005_S } from '../veiculos/DefinicaoBss006';
export { IMPULSO_ESPECIFICO_NOMINAL_BSS005_S };

export interface ConfiguracaoBancadaDecolagem extends ParametrosMontagemBss {
  ambienteFisico?: AmbienteFisico;
  nome: string;
  descricao: string;
  velocidadeArMps?: Vetor3;
  rajadasVento?: readonly RajadaVento[];
  densidadeAtmosfericaKgM3?: number;
}

export type AmbienteBancadaBss = Pick<ConfiguracaoBancadaDecolagem, 'velocidadeArMps' | 'rajadasVento' | 'densidadeAtmosfericaKgM3' | 'ambienteFisico' | 'arcoBaseM'>;

const CONFIGURACAO_BSS001: ConfiguracaoBancadaDecolagem = {
  id: 'bss-001',
  nome: 'BSS-001 — primeiro lançamento de sucesso',
  descricao: 'BSS-001, primeiro foguete do protótipo a completar um lançamento de sucesso. Veículo composto físico com casco, tanques de metano e oxigênio, cadeia de alimentação bipropelente, bateria e painel solar. O Sol simulado incide verticalmente de cima para baixo por toda a atmosfera; a bateria acumula energia e o operador comanda manualmente os sistemas, o gimbal e a ignição.',
  controleDeInclinacaoPid: false,
  inclinacaoInicialRad: 0,
  // O cenário de lançamento deve aceitar a sequência elétrica imediatamente.
  energiaInicialDaBateriaJ: 10_000,
  deslocamentoLateralDoPainelM: 0,
  painelMovel: false,
  incluirPainelSolar: true,
};

/** Decolagem integrada alimentada por painel solar e bateria física. */
export const criarTesteDecolagemComPainelSolar = (configuracao: ConfiguracaoBancadaDecolagem = CONFIGURACAO_BSS001) => {
  const mundo = new MundoFisico(1 / 240, {
    ambiente: configuracao.ambienteFisico ?? new AmbientePlano(),
    densidadeAtmosfericaKgM3: configuracao.densidadeAtmosfericaKgM3 ?? 1.225,
    velocidadeArMps: configuracao.velocidadeArMps,
    rajadasVento: configuracao.rajadasVento,
  });
  const ref = mundo.ambiente.referencial;
  const solo = ref instanceof ReferencialEsferico
    ? new SuperficieEsferica('solo-decolagem-solar', ref.centroM, ref.raioM, 1_000_000, 0.04, 0.9)
    : new SuperficiePlano('solo-decolagem-solar', 'concreto', 0, 1_000_000, 0.04, 0.9);
  mundo.registrarSuperficie(solo);
  const montagem = montarVeiculoBss(mundo, solo, configuracao);
  const { veiculo, propulsor, tanqueCombustivel, tanqueOxidante, bateria, painel, aletasAerodinamicas,
    linhaCombustivel, linhaOxidante, fixadores, cilindroPainel, hastePainel, guiaPainel, fixadorPainelHaste,
    controladorAletas, controladorGuiaPouso, atualizarControleAletas, atualizarControlePainel,
    alturaInicialM, pesoAtualN, obterDadosMissao, ativarModo, selecionarAlvo,
    obterModo, obterAlvo, obterJaDecolou, obterComandoPainel, comandarPainel } = montagem;
  const descricaoMissao = () => {
    const dados = obterDadosMissao();
    return `Ambiente local: ρ ${dados.densidadeArKgM3.toFixed(4)} kg/m³ · q ${(dados.pressaoDinamicaPa / 1_000).toFixed(3)} kPa\nDelta-v ideal restante: ${dados.deltaVIdealMps?.toFixed(1) ?? 'não aplicável'} m/s\nHipótese: ${dados.hipoteseDeltaV}\nMotor — diagnóstico atual: ${dados.diagnosticoMotor.join(' · ') || 'operacional'}\n`;
  };
  return {
    nome: configuracao.nome,
    obterDadosMissao,
    obterConfiguracaoEnsaio: () => { const { ambienteFisico: _ambiente, ...parametros } = configuracao; return { ...parametros, dtS: 1 / 240, densidadeAtmosfericaKgM3: configuracao.densidadeAtmosfericaKgM3 ?? 1.225, velocidadeArMps: configuracao.velocidadeArMps ?? Vetor3.zero, modeloFisico: mundo.obterConfiguracaoFisica() }; },
    descricao: configuracao.descricao,
    mundo, objetos: montagem.objetos, superficies: [solo], velocidadeTempo: 3, limiteVerticalM: 70, limiteHorizontalM: 12,
    seguirObjeto: veiculo, cameraY: () => veiculo.getEstadoFisico().posicaoM.y, conexoesEletricas: [...(configuracao.incluirPainelSolar ? [painel.conexaoCarga] : []), propulsor.conexaoEletrica!, ...(cilindroPainel ? [cilindroPainel.conexaoEletrica] : []), ...aletasAerodinamicas.map((aleta) => aleta.conexaoEletrica)],
    mangueira: { tanque: tanqueCombustivel, propulsor }, linhasComFalhaControlavel: { combustivel: linhaCombustivel, oxidante: linhaOxidante },
    fixadores: [...fixadores, ...(fixadorPainelHaste ? [fixadorPainelHaste] : [])], propulsorControlavel: propulsor, propulsorVetorizadoControlavel: propulsor, permiteAjustarThrottle: true,
    ...(configuracao.incluirPernasFixas ? {
      canaisTrace: [
        { nome: 'THROTTLE', cor: '#f97316', obterSinal: () => propulsor.throttleAtual * 100, escala: { minimo: 0, maximo: 100, unidade: '%' } },
        { nome: 'EMPUXO', cor: '#facc15', obterSinal: () => propulsor.empuxoAtualN / 1_000, escala: { minimo: 0, maximo: propulsor.empuxoMaximoN / 1_000, unidade: 'kN' } },
        { nome: 'EFEITO TÉRMICO', cor: '#fb7185', obterSinal: () => propulsor.potenciaTermicaAtualW / 1_000_000, escala: { minimo: 0, maximo: propulsor.potenciaTermicaMaximaW / 1_000_000, unidade: 'MW' } },
        { nome: 'GIMBAL', cor: '#22d3ee', obterSinal: () => propulsor.obterEstadoDaVetorizacao().anguloAtualRad * 180 / Math.PI, escala: { minimo: -15, maximo: 15, unidade: '°' } },
        ...(aletasAerodinamicas.length > 0 ? [{ nome: 'GRID FINS', cor: '#38bdf8', obterSinal: () => aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI, escala: { minimo: -25, maximo: 25, unidade: '°' } }] : []),
        { nome: 'MASSA', cor: '#c084fc', obterSinal: () => veiculo.massaInstantaneaDoConjuntoKg, escala: { minimo: 0, maximo: veiculo.massaInstantaneaDoConjuntoKg * 1.1, unidade: 'kg' } },
        { nome: 'ALTITUDE', cor: '#e2e8f0', obterSinal: () => ref.altitudeGeometricaM(veiculo.getEstadoFisico().posicaoM), escala: { minimo: 0, maximo: 20_000, unidade: 'm' } },
        { nome: mundo.ambiente.campo.modelo === 'central' ? 'VELOCIDADE RADIAL' : 'VELOCIDADE Y', cor: '#a3e635', obterSinal: () => veiculo.obterLeiturasDosSensores().velocidadeVerticalMps, escala: { minimo: -120, maximo: 450, unidade: 'm/s' } },
        { nome: 'PRESSÃO DINÂMICA', cor: '#fbbf24', obterSinal: () => obterDadosMissao().pressaoDinamicaPa / 1_000, escala: { minimo: 0, maximo: 100, unidade: 'kPa' } },
        ...(configuracao.impulsoEspecificoNominalS === undefined ? [] : [
          { nome: 'ISP EFETIVO', cor: '#93c5fd', obterSinal: () => obterDadosMissao().impulsoEspecificoEfetivoS ?? 0, escala: { minimo: 0, maximo: configuracao.impulsoEspecificoNominalS, unidade: 's (0 sem vazão)' } },
          { nome: 'DELTA-V IDEAL', cor: '#d8b4fe', obterSinal: () => obterDadosMissao().deltaVIdealMps ?? 0, escala: { minimo: 0, maximo: 4_000, unidade: 'm/s' } },
        ]),
        { nome: mundo.ambiente.campo.modelo === 'central' ? 'VELOCIDADE TANGENCIAL' : 'VELOCIDADE X', cor: '#4ade80', obterSinal: () => veiculo.obterLeiturasDosSensores().velocidadeHorizontalMps, escala: { minimo: -20, maximo: 20, unidade: 'm/s' } },
        ...(configuracao.incluirGuiaPousoPorAlvo ? [
          { nome: 'ALVO X', cor: '#22d3ee', obterSinal: () => obterAlvo(), escala: { minimo: -50, maximo: 50, unidade: 'm' } },
          { nome: 'ERRO X', cor: '#f472b6', obterSinal: () => ref.erroHorizontalM(obterAlvo(), veiculo.getEstadoFisico().posicaoM), escala: { minimo: -50, maximo: 50, unidade: 'm' } },
        ] : []),
        { nome: mundo.ambiente.campo.modelo === 'central' ? 'ATITUDE LOCAL' : 'ATITUDE', cor: '#e879f9', obterSinal: () => veiculo.obterLeiturasDosSensores().inclinacaoRad * 180 / Math.PI, escala: { minimo: -180, maximo: 180, unidade: '°' } },
        { nome: 'VEL. ANGULAR', cor: '#fb7185', obterSinal: () => veiculo.obterLeiturasDosSensores().velocidadeAngularRadps! * 180 / Math.PI, escala: { minimo: -90, maximo: 90, unidade: '°/s' } },
      ],
      ativarModoBss04: ativarModo,
      obterModoBss04: obterModo,
      obterStatusControleBss04: () => {
        if (obterModo() === 'decolagem') return 'Decolagem · controle de throttle manual · gimbal automático ativo';
        if (!propulsor.estaIgnitado) return 'Pouso automático selecionado · aguardando ignição do motor';
        const comando = veiculo.obterUltimoComandoDeDescidaFuzzyPid();
        return `Pouso · ${comando.fase} · alvo ${comando.velocidadeVerticalAlvoMps.toFixed(1)} m/s · throttle ${(comando.throttle * 100).toFixed(0)}%`;
      },
      ...(configuracao.incluirGuiaPousoPorAlvo ? {
        obterPontoPousoX: () => obterAlvo(),
        pontoPousoSelecionavel: () => !obterJaDecolou() && ref.altitudeGeometricaM(veiculo.getEstadoFisico().posicaoM) <= alturaInicialM + 0.5,
        selecionarPontoPousoX: selecionarAlvo,
      } : {}),
    } : {}),
    ...(configuracao.painelMovel && cilindroPainel && hastePainel && guiaPainel ? {
      guiasLineares: [guiaPainel],
      exibirGuiasLineares: false,
      comandarCilindro: comandarPainel,
      configurarVelocidadesDoCilindro: (avancoMps: number, recuoMps: number) => cilindroPainel!.configurarVelocidades(avancoMps, recuoMps),
      velocidadesDoCilindro: () => ({ avancoMps: cilindroPainel!.velocidadeAvancoMps, recuoMps: cilindroPainel!.velocidadeRecuoMps }),
      obterEntradasCilindro: () => ({ avancar: obterComandoPainel() === 'avancar', recuar: obterComandoPainel() === 'recuar' }),
      atualizarControle: atualizarControlePainel,
    } : {}),
    ...(controladorAletas ? { atualizarControle: atualizarControleAletas } : {}),
    exibirNaBancada: true, deveEncerrar: () => false,
    ...(controladorGuiaPouso ? { obterDiagnosticoGuiaPouso: () => controladorGuiaPouso.obterDiagnostico() } : {}),
    telemetria: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `bateria ${(bateria.percentualDeCarga * 100).toFixed(1)}% · altitude GPS ${leituras.altitudeM.toFixed(1)} m · empuxo ${propulsor.empuxoAtualN.toFixed(0)} / peso ${pesoAtualN().toFixed(0)} N${configuracao.incluirGuiaPousoPorAlvo ? ` · alvo x ${obterAlvo().toFixed(1)} m` : ''}${aletasAerodinamicas.length ? ` · grid fins ${(aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI).toFixed(1)}°` : ''}`; },
    dados: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `${descricaoMissao()}${configuracao.incluirPainelSolar ? `Sol: irradiância vertical descendente · 1.000 W/m²\nPainel: ${painel.potenciaAtualW.toFixed(0)} W · energia gerada ${painel.energiaGeradaJ.toFixed(0)} J\n` : ''}${configuracao.incluirPernasFixas ? 'Trem de pouso: duas pernas fixas com sapatas laterais\n' : ''}${configuracao.incluirGuiaPousoPorAlvo ? `Ponto de pouso: X ${obterAlvo().toFixed(1)} m · ${obterJaDecolou() ? 'seleção bloqueada após decolagem' : 'clique no solo antes da decolagem para alterar'}\n` : ''}${aletasAerodinamicas.length ? `Controle aerodinâmico: ${aletasAerodinamicas.length} grid fins físicas · deflexão ${(aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI).toFixed(1)}° · torque disponível somente com fluxo atmosférico\n` : ''}${cilindroPainel ? `Painel móvel: comando ${obterComandoPainel()} · x ${painel.getEstadoFisico().posicaoM.x.toFixed(2)} m · velocidade ${painel.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s · força ${cilindroPainel.forcaNaHasteN.toFixed(0)} N\n` : ''}Bateria: ${bateria.energiaArmazenadaJ.toFixed(0)} / ${bateria.capacidadeEnergiaJ.toFixed(0)} J (${(bateria.percentualDeCarga * 100).toFixed(1)}%)\nFonte do propulsor: ${propulsor.fonteEletricaEstaConectada ? 'bateria conectada' : 'indisponível'} · cabo ${propulsor.conexaoEletrica?.interruptorPrincipalFechado ? 'fechado' : 'aberto'}\nPartida: comando manual pelos controles da bancada\nControle de inclinação: ${veiculo.controleDeInclinacaoEstaHabilitado ? 'PID automático' : 'manual'}\nGPS idealizado: X ${leituras.posicaoGpsM.x.toFixed(2)} m · Y ${leituras.posicaoGpsM.y.toFixed(2)} m\nAltitude derivada do GPS: ${leituras.altitudeM.toFixed(2)} m\nVelocidade derivada do GPS: vertical ${leituras.velocidadeVerticalMps.toFixed(2)} m/s · horizontal ${leituras.velocidadeHorizontalMps.toFixed(2)} m/s\nInclinação do sensor de nível: ${(leituras.inclinacaoRad * 180 / Math.PI).toFixed(2)}° · gimbal ${(propulsor.obterEstadoDaVetorizacao().anguloAtualRad * 180 / Math.PI).toFixed(2)}°\nAutoridade do gimbal: ${veiculo.obterSolicitacoesAplicadas().find((s) => s.recurso === 'gimbal')?.idControlador ?? 'sem comando alimentado'}\nMassa conectada: ${veiculo.massaInstantaneaDoConjuntoKg.toFixed(1)} kg · peso ${pesoAtualN().toFixed(0)} N\nTanques: CH4 ${tanqueCombustivel.massaPropelenteKg.toFixed(1)} kg · O2 ${tanqueOxidante.massaPropelenteKg.toFixed(1)} kg\nCadeia: ${linhaCombustivel.estaIndisponivel || linhaOxidante.estaIndisponivel ? 'INDISPONÍVEL' : 'íntegra'} · vazão ${propulsor.vazaoAtualKgS.toFixed(2)} kg/s\nEmpuxo: ${propulsor.empuxoAtualN.toFixed(0)} N · ignição ${propulsor.estaIgnitado ? 'ativa' : 'cortada'} · integridade ${Math.round(propulsor.integridadeEstrutural * 100)}%\n${propulsor.impulsoEspecificoNominalS === undefined ? 'Modelo propulsivo: ensaio paramétrico' : `Isp nominal: ${propulsor.impulsoEspecificoNominalS.toFixed(0)} s · efetivo: ${propulsor.impulsoEspecificoEfetivoS?.toFixed(1) ?? 'sem vazão'} s · referência ao nível do mar, constante com altitude`}\nFluxo reagido: ${propulsor.vazaoReagidaKgS.toFixed(2)} kg/s\nEfeito térmico simplificado: ${(propulsor.potenciaTermicaAtualW / 1e6).toFixed(2)} MW · carcaça ${(propulsor.potenciaTermicaNaCarcacaW / 1e6).toFixed(2)} MW · jato ${(propulsor.potenciaTermicaNoJatoW / 1e6).toFixed(2)} MW`; },
    validar: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `${propulsor.estaIgnitado && propulsor.empuxoAtualN > pesoAtualN() && Math.abs(leituras.inclinacaoRad) < 5 * Math.PI / 180 && leituras.altitudeM > alturaInicialM + 0.5 ? 'APROVADO' : 'AGUARDANDO DECOLAGEM'} · empuxo ${propulsor.empuxoAtualN.toFixed(0)} N; peso ${pesoAtualN().toFixed(0)} N; inclinação ${(leituras.inclinacaoRad * 180 / Math.PI).toFixed(2)}°`; },
  };
};


/** BSS-004 com tanques ampliados e propulsão química idealizada coerente. */
export const criarTesteBss005 = (
  ambiente: Pick<ConfiguracaoBancadaDecolagem, 'velocidadeArMps' | 'rajadasVento' | 'densidadeAtmosfericaKgM3' | 'ambienteFisico' | 'arcoBaseM'> = {},
) => criarTesteDecolagemComPainelSolar({
  ...ambiente,
  id: 'bss-005',
  nome: 'BSS-005 — tanques ampliados · meta 15 km',
  descricao: 'Variante do BSS-004 com 600 kg de metano e 2.400 kg de oxigênio. Motor químico idealizado de 120 kN, Isp nominal de 350 s e vazão total nominal de 34,96 kg/s. Isp fixo na condição de referência ao nível do mar; sem correção por pressão ambiente. A meta de 15 km e a reserva para retorno devem ser verificadas com este modelo; os 6 MW são efeito térmico simplificado, não potência química total.',
  ...PARAMETROS_BSS005,
});

/** BSS-005 com controle aerodinâmico ativo durante a descida atmosférica. */
export const criarTesteBss006 = (ambiente: Pick<ConfiguracaoBancadaDecolagem, 'velocidadeArMps' | 'densidadeAtmosfericaKgM3' | 'ambienteFisico' | 'arcoBaseM'> = {}) => criarTesteDecolagemComPainelSolar({
  ...ambiente,
  id: 'bss-006',
  nome: 'BSS-006 — pouso guiado por alvo',
  descricao: 'Variante do BSS-005 com duas grid fins físicas e gimbal coordenados para a descida. Antes da decolagem, clique no solo para escolher o ponto de pouso. No modo Pouso, a guia usa o gimbal com empuxo e as grid fins com fluxo atmosférico para reduzir o erro horizontal; o core continua calculando forças, torque e contato.',
  ...PARAMETROS_BSS006,
});

export const criarTesteBss001 = (ambiente: AmbienteBancadaBss = {}) => criarTesteDecolagemComPainelSolar({ ...CONFIGURACAO_BSS001, ...ambiente });

/** Fábricas extraídas de src/testes.ts na M9-F; parâmetros históricos preservados. */
export const criarTesteBss002 = (ambiente: AmbienteBancadaBss = {}) => criarTesteDecolagemComPainelSolar({
  ...ambiente,
  id: 'bss-002',
  nome: 'BSS-002 — controle de inclinação PID',
  descricao: 'BSS-002 valida o controle de inclinação do primeiro foguete em decolagem vertical. O sensor de nível do casco fornece a leitura ao computador de voo, que mantém o gimbal neutro quando a atitude está alinhada e corrige desvios físicos durante o voo. A ignição, o throttle e os demais sistemas continuam sob comando manual da bancada.',
  controleDeInclinacaoPid: true,
  inclinacaoInicialRad: 0,
  energiaInicialDaBateriaJ: 30_000,
  deslocamentoLateralDoPainelM: 0.8,
  painelMovel: false,
  incluirPainelSolar: true,
});

/** Variante do BSS-002 com pernas fixas estruturais, uma em cada lado. */
export const criarTesteBss004 = (ambiente: AmbienteBancadaBss = {}) => criarTesteDecolagemComPainelSolar({
  ...ambiente,
  id: 'bss-004',
  nome: 'BSS-004 — controle de inclinação e pernas fixas',
  descricao: 'Cópia do BSS-002 com duas pernas fixas, uma de cada lado do casco. Cada perna e sua sapata são objetos físicos ligados estruturalmente ao foguete. As sapatas apoiam o veículo no solo e mantêm o motor afastado da superfície; ignição, throttle e controle de inclinação continuam sob comando manual da bancada.',
  controleDeInclinacaoPid: true,
  inclinacaoInicialRad: 0,
  energiaInicialDaBateriaJ: 30_000,
  deslocamentoLateralDoPainelM: 0.8,
  painelMovel: false,
  incluirPainelSolar: true,
  incluirPernasFixas: true,
});
