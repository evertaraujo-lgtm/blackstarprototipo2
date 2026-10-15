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

/** Decolagem integrada alimentada por painel solar e bateria física.
 * @contract f-3f9895645d11ab94
 */
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
  /** Formata densidade kg/m³, pressão dinâmica kPa, delta-v ideal/hipótese e diagnóstico real do motor; consulta dados sem avançar mundo. @contract f-0249aa454d59c855 @reviewed M12-DOC: implementação lida. */
  const descricaoMissao = () => {
    const dados = obterDadosMissao();
    return `Ambiente local: ρ ${dados.densidadeArKgM3.toFixed(4)} kg/m³ · q ${(dados.pressaoDinamicaPa / 1_000).toFixed(3)} kPa\nDelta-v ideal restante: ${dados.deltaVIdealMps?.toFixed(1) ?? 'não aplicável'} m/s\nHipótese: ${dados.hipoteseDeltaV}\nMotor — diagnóstico atual: ${dados.diagnosticoMotor.join(' · ') || 'operacional'}\n`;
  };
  return {
    nome: configuracao.nome,
    obterDadosMissao,
    /** Exporta parâmetros reproduzíveis, dt=1/240 s, atmosfera/vento explícitos e revisão física do mundo; substitui instância do ambiente por metadados, sem serializar serviços. @contract f-3fc2a973a85a23dc @reviewed M12-DOC: implementação lida. */
    obterConfiguracaoEnsaio: () => { const { ambienteFisico: _ambiente, ...parametros } = configuracao; return { ...parametros, dtS: 1 / 240, densidadeAtmosfericaKgM3: configuracao.densidadeAtmosfericaKgM3 ?? 1.225, velocidadeArMps: configuracao.velocidadeArMps ?? Vetor3.zero, modeloFisico: mundo.obterConfiguracaoFisica() }; },
    descricao: configuracao.descricao,
    mundo, objetos: montagem.objetos, superficies: [solo], velocidadeTempo: 3, limiteVerticalM: 70, limiteHorizontalM: 12,
    seguirObjeto: veiculo, /** Devolve `veiculo.getEstadoFisico().posicaoM.y`. Dependências diretas: `veiculo.getEstadoFisico`. Efeitos indiretos seguem as dependências chamadas. @contract f-571edd4d14a4d048 */
                           cameraY: () => veiculo.getEstadoFisico().posicaoM.y, conexoesEletricas: [...(configuracao.incluirPainelSolar ? [painel.conexaoCarga] : []), propulsor.conexaoEletrica!, ...(cilindroPainel ? [cilindroPainel.conexaoEletrica] : []), ...aletasAerodinamicas.map((aleta) => aleta.conexaoEletrica)],
    mangueira: { tanque: tanqueCombustivel, propulsor }, linhasComFalhaControlavel: { combustivel: linhaCombustivel, oxidante: linhaOxidante },
    fixadores: [...fixadores, ...(fixadorPainelHaste ? [fixadorPainelHaste] : [])], propulsorControlavel: propulsor, propulsorVetorizadoControlavel: propulsor, permiteAjustarThrottle: true,
    ...(configuracao.incluirPernasFixas ? {
      canaisTrace: [
        { nome: 'THROTTLE', cor: '#f97316', /** Devolve `propulsor.throttleAtual * 100`. Efeitos indiretos seguem as dependências chamadas. @contract f-b25f236ddf143e24 */
                                            obterSinal: () => propulsor.throttleAtual * 100, escala: { minimo: 0, maximo: 100, unidade: '%' } },
        { nome: 'EMPUXO', cor: '#facc15', /** Devolve `propulsor.empuxoAtualN / 1_000`. Efeitos indiretos seguem as dependências chamadas. @contract f-82c6c4bc837d1360 */
                                          obterSinal: () => propulsor.empuxoAtualN / 1_000, escala: { minimo: 0, maximo: propulsor.empuxoMaximoN / 1_000, unidade: 'kN' } },
        { nome: 'EFEITO TÉRMICO', cor: '#fb7185', /** Devolve `propulsor.potenciaTermicaAtualW / 1_000_000`. Efeitos indiretos seguem as dependências chamadas. @contract f-1202fe04e396687a */
                                                  obterSinal: () => propulsor.potenciaTermicaAtualW / 1_000_000, escala: { minimo: 0, maximo: propulsor.potenciaTermicaMaximaW / 1_000_000, unidade: 'MW' } },
        { nome: 'GIMBAL', cor: '#22d3ee', /** Devolve `propulsor.obterEstadoDaVetorizacao().anguloAtualRad * 180 / Math.PI`. Dependências diretas: `propulsor.obterEstadoDaVetorizacao`. Efeitos indiretos seguem as dependências chamadas. @contract f-e196c350c5471d50 */
                                          obterSinal: () => propulsor.obterEstadoDaVetorizacao().anguloAtualRad * 180 / Math.PI, escala: { minimo: -15, maximo: 15, unidade: '°' } },
        ...(aletasAerodinamicas.length > 0 ? [{ nome: 'GRID FINS', cor: '#38bdf8', /** Devolve `aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI`. Efeitos indiretos seguem as dependências chamadas. @contract f-335448038acc2943 */
                                                                                   obterSinal: () => aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI, escala: { minimo: -25, maximo: 25, unidade: '°' } }] : []),
        { nome: 'MASSA', cor: '#c084fc', /** Devolve `veiculo.massaInstantaneaDoConjuntoKg`. Efeitos indiretos seguem as dependências chamadas. @contract f-4552599974167519 */
                                         obterSinal: () => veiculo.massaInstantaneaDoConjuntoKg, escala: { minimo: 0, maximo: veiculo.massaInstantaneaDoConjuntoKg * 1.1, unidade: 'kg' } },
        { nome: 'ALTITUDE', cor: '#e2e8f0', /** Devolve `ref.altitudeGeometricaM(veiculo.getEstadoFisico().posicaoM)`. Dependências diretas: `ref.altitudeGeometricaM`, `veiculo.getEstadoFisico`. Efeitos indiretos seguem as dependências chamadas. @contract f-6dec3c75a92121d0 */
                                            obterSinal: () => ref.altitudeGeometricaM(veiculo.getEstadoFisico().posicaoM), escala: { minimo: 0, maximo: 20_000, unidade: 'm' } },
        { nome: mundo.ambiente.campo.modelo === 'central' ? 'VELOCIDADE RADIAL' : 'VELOCIDADE Y', cor: '#a3e635', /** Devolve `veiculo.obterLeiturasDosSensores().velocidadeVerticalMps`. Dependências diretas: `veiculo.obterLeiturasDosSensores`. Efeitos indiretos seguem as dependências chamadas. @contract f-1cb82fdd404f75bf */
                                                                                                                  obterSinal: () => veiculo.obterLeiturasDosSensores().velocidadeVerticalMps, escala: { minimo: -120, maximo: 450, unidade: 'm/s' } },
        { nome: 'PRESSÃO DINÂMICA', cor: '#fbbf24', /** Devolve `obterDadosMissao().pressaoDinamicaPa / 1_000`. Dependências diretas: `obterDadosMissao`. Efeitos indiretos seguem as dependências chamadas. @contract f-9b7aaa3bccac7620 */
                                                    obterSinal: () => obterDadosMissao().pressaoDinamicaPa / 1_000, escala: { minimo: 0, maximo: 100, unidade: 'kPa' } },
        ...(configuracao.impulsoEspecificoNominalS === undefined ? [] : [
          { nome: 'ISP EFETIVO', cor: '#93c5fd', /** Devolve `obterDadosMissao().impulsoEspecificoEfetivoS ?? 0`. Dependências diretas: `obterDadosMissao`. Efeitos indiretos seguem as dependências chamadas. @contract f-1ee7b21c1e3063ea */
                                                 obterSinal: () => obterDadosMissao().impulsoEspecificoEfetivoS ?? 0, escala: { minimo: 0, maximo: configuracao.impulsoEspecificoNominalS, unidade: 's (0 sem vazão)' } },
          { nome: 'DELTA-V IDEAL', cor: '#d8b4fe', /** Devolve `obterDadosMissao().deltaVIdealMps ?? 0`. Dependências diretas: `obterDadosMissao`. Efeitos indiretos seguem as dependências chamadas. @contract f-854e765fd67f7704 */
                                                   obterSinal: () => obterDadosMissao().deltaVIdealMps ?? 0, escala: { minimo: 0, maximo: 4_000, unidade: 'm/s' } },
        ]),
        { nome: mundo.ambiente.campo.modelo === 'central' ? 'VELOCIDADE TANGENCIAL' : 'VELOCIDADE X', cor: '#4ade80', /** Devolve `veiculo.obterLeiturasDosSensores().velocidadeHorizontalMps`. Dependências diretas: `veiculo.obterLeiturasDosSensores`. Efeitos indiretos seguem as dependências chamadas. @contract f-6bbedabdd1ff297c */
                                                                                                                      obterSinal: () => veiculo.obterLeiturasDosSensores().velocidadeHorizontalMps, escala: { minimo: -20, maximo: 20, unidade: 'm/s' } },
        ...(configuracao.incluirGuiaPousoPorAlvo ? [
          { nome: 'ALVO X', cor: '#22d3ee', /** Devolve `obterAlvo()`. Dependências diretas: `obterAlvo`. Efeitos indiretos seguem as dependências chamadas. @contract f-dcdc41769ad894fd */
                                            obterSinal: () => obterAlvo(), escala: { minimo: -50, maximo: 50, unidade: 'm' } },
          { nome: 'ERRO X', cor: '#f472b6', /** Devolve `ref.erroHorizontalM(obterAlvo(), veiculo.getEstadoFisico().posicaoM)`. Dependências diretas: `ref.erroHorizontalM`, `obterAlvo`, `veiculo.getEstadoFisico`. Efeitos indiretos seguem as dependências chamadas. @contract f-69ca97b4821fbc94 */
                                            obterSinal: () => ref.erroHorizontalM(obterAlvo(), veiculo.getEstadoFisico().posicaoM), escala: { minimo: -50, maximo: 50, unidade: 'm' } },
        ] : []),
        { nome: mundo.ambiente.campo.modelo === 'central' ? 'ATITUDE LOCAL' : 'ATITUDE', cor: '#e879f9', /** Devolve `veiculo.obterLeiturasDosSensores().inclinacaoRad * 180 / Math.PI`. Dependências diretas: `veiculo.obterLeiturasDosSensores`. Efeitos indiretos seguem as dependências chamadas. @contract f-3342417d69eb7de2 */
                                                                                                         obterSinal: () => veiculo.obterLeiturasDosSensores().inclinacaoRad * 180 / Math.PI, escala: { minimo: -180, maximo: 180, unidade: '°' } },
        { nome: 'VEL. ANGULAR', cor: '#fb7185', /** Devolve `veiculo.obterLeiturasDosSensores().velocidadeAngularRadps! * 180 / Math.PI`. Dependências diretas: `veiculo.obterLeiturasDosSensores`. Efeitos indiretos seguem as dependências chamadas. @contract f-53e6134e55fcba07 */
                                                obterSinal: () => veiculo.obterLeiturasDosSensores().velocidadeAngularRadps! * 180 / Math.PI, escala: { minimo: -90, maximo: 90, unidade: '°/s' } },
      ],
      ativarModoBss04: ativarModo,
      obterModoBss04: obterModo,
      /** Descreve modo decolagem, pouso aguardando ignição ou fase/comando calculado pelo Fuzzy-PID; não comanda transição. @contract f-698bde57b8711707 @reviewed M12-DOC: implementação lida. */
      obterStatusControleBss04: () => {
        if (obterModo() === 'decolagem') return 'Decolagem · controle de throttle manual · gimbal automático ativo';
        if (!propulsor.estaIgnitado) return 'Pouso automático selecionado · aguardando ignição do motor';
        const comando = veiculo.obterUltimoComandoDeDescidaFuzzyPid();
        return `Pouso · ${comando.fase} · alvo ${comando.velocidadeVerticalAlvoMps.toFixed(1)} m/s · throttle ${(comando.throttle * 100).toFixed(0)}%`;
      },
      ...(configuracao.incluirGuiaPousoPorAlvo ? {
        /** Devolve `obterAlvo()`. Dependências diretas: `obterAlvo`. Efeitos indiretos seguem as dependências chamadas. @contract f-4e7022b55c24e754 */
        obterPontoPousoX: () => obterAlvo(),
        /** Devolve `!obterJaDecolou() && ref.altitudeGeometricaM(veiculo.getEstadoFisico().posicaoM) <= alturaInicialM + 0.5`. Dependências diretas: `obterJaDecolou`, `ref.altitudeGeometricaM`, `veiculo.getEstadoFisico`. Efeitos indiretos seguem as dependências chamadas. @contract f-b33d9b9434299041 */
        pontoPousoSelecionavel: () => !obterJaDecolou() && ref.altitudeGeometricaM(veiculo.getEstadoFisico().posicaoM) <= alturaInicialM + 0.5,
        selecionarPontoPousoX: selecionarAlvo,
      } : {}),
    } : {}),
    ...(configuracao.painelMovel && cilindroPainel && hastePainel && guiaPainel ? {
      guiasLineares: [guiaPainel],
      exibirGuiasLineares: false,
      comandarCilindro: comandarPainel,
      /** Devolve `cilindroPainel!.configurarVelocidades(avancoMps, recuoMps)`. Dependências diretas: `cilindroPainel!.configurarVelocidades`. Efeitos indiretos seguem as dependências chamadas. @contract f-bc9dc17e17c5a70b */
      configurarVelocidadesDoCilindro: (avancoMps: number, recuoMps: number) => cilindroPainel!.configurarVelocidades(avancoMps, recuoMps),
      /** Devolve `({ avancoMps: cilindroPainel!.velocidadeAvancoMps, recuoMps: cilindroPainel!.velocidadeRecuoMps })`. Efeitos indiretos seguem as dependências chamadas. @contract f-8bd475999658d13a */
      velocidadesDoCilindro: () => ({ avancoMps: cilindroPainel!.velocidadeAvancoMps, recuoMps: cilindroPainel!.velocidadeRecuoMps }),
      /** Devolve `({ avancar: obterComandoPainel() === 'avancar', recuar: obterComandoPainel() === 'recuar' })`. Dependências diretas: `obterComandoPainel`. Efeitos indiretos seguem as dependências chamadas. @contract f-218fb449b470de80 */
      obterEntradasCilindro: () => ({ avancar: obterComandoPainel() === 'avancar', recuar: obterComandoPainel() === 'recuar' }),
      atualizarControle: atualizarControlePainel,
    } : {}),
    ...(controladorAletas ? { atualizarControle: atualizarControleAletas } : {}),
    exibirNaBancada: true, /** Devolve `false`. Efeitos indiretos seguem as dependências chamadas. @contract f-f094830ff734c425 */
                           deveEncerrar: () => false,
    ...(controladorGuiaPouso ? { /** Devolve `controladorGuiaPouso.obterDiagnostico()`. Dependências diretas: `controladorGuiaPouso.obterDiagnostico`. Efeitos indiretos seguem as dependências chamadas. @contract f-98847ed419460405 */
                                 obterDiagnosticoGuiaPouso: () => controladorGuiaPouso.obterDiagnostico() } : {}),
    /** Formata leituras atuais de bateria, altitude, empuxo/peso, alvo e deflexão real das grid fins; conversões para graus/percentual pertencem à apresentação. @contract f-323e6dfc4ea32b08 @reviewed M12-DOC: implementação lida. */
    telemetria: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `bateria ${(bateria.percentualDeCarga * 100).toFixed(1)}% · altitude GPS ${leituras.altitudeM.toFixed(1)} m · empuxo ${propulsor.empuxoAtualN.toFixed(0)} / peso ${pesoAtualN().toFixed(0)} N${configuracao.incluirGuiaPousoPorAlvo ? ` · alvo x ${obterAlvo().toFixed(1)} m` : ''}${aletasAerodinamicas.length ? ` · grid fins ${(aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI).toFixed(1)}°` : ''}`; },
    /** Compõe painel de engenharia de energia, sensores, atuadores, propelentes e calor com unidades de apresentação. Não integra estado nem deriva sucesso a partir de animação. @contract f-96e6f7431e8acdce @reviewed M12-DOC: implementação lida. */
    dados: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `${descricaoMissao()}${configuracao.incluirPainelSolar ? `Sol: irradiância vertical descendente · 1.000 W/m²\nPainel: ${painel.potenciaAtualW.toFixed(0)} W · energia gerada ${painel.energiaGeradaJ.toFixed(0)} J\n` : ''}${configuracao.incluirPernasFixas ? 'Trem de pouso: duas pernas fixas com sapatas laterais\n' : ''}${configuracao.incluirGuiaPousoPorAlvo ? `Ponto de pouso: X ${obterAlvo().toFixed(1)} m · ${obterJaDecolou() ? 'seleção bloqueada após decolagem' : 'clique no solo antes da decolagem para alterar'}\n` : ''}${aletasAerodinamicas.length ? `Controle aerodinâmico: ${aletasAerodinamicas.length} grid fins físicas · deflexão ${(aletasAerodinamicas[0]!.deflexaoAtualRad * 180 / Math.PI).toFixed(1)}° · torque disponível somente com fluxo atmosférico\n` : ''}${cilindroPainel ? `Painel móvel: comando ${obterComandoPainel()} · x ${painel.getEstadoFisico().posicaoM.x.toFixed(2)} m · velocidade ${painel.getEstadoFisico().velocidadeMps.x.toFixed(2)} m/s · força ${cilindroPainel.forcaNaHasteN.toFixed(0)} N\n` : ''}Bateria: ${bateria.energiaArmazenadaJ.toFixed(0)} / ${bateria.capacidadeEnergiaJ.toFixed(0)} J (${(bateria.percentualDeCarga * 100).toFixed(1)}%)\nFonte do propulsor: ${propulsor.fonteEletricaEstaConectada ? 'bateria conectada' : 'indisponível'} · cabo ${propulsor.conexaoEletrica?.interruptorPrincipalFechado ? 'fechado' : 'aberto'}\nPartida: comando manual pelos controles da bancada\nControle de inclinação: ${veiculo.controleDeInclinacaoEstaHabilitado ? 'PID automático' : 'manual'}\nGPS idealizado: X ${leituras.posicaoGpsM.x.toFixed(2)} m · Y ${leituras.posicaoGpsM.y.toFixed(2)} m\nAltitude derivada do GPS: ${leituras.altitudeM.toFixed(2)} m\nVelocidade derivada do GPS: vertical ${leituras.velocidadeVerticalMps.toFixed(2)} m/s · horizontal ${leituras.velocidadeHorizontalMps.toFixed(2)} m/s\nInclinação do sensor de nível: ${(leituras.inclinacaoRad * 180 / Math.PI).toFixed(2)}° · gimbal ${(propulsor.obterEstadoDaVetorizacao().anguloAtualRad * 180 / Math.PI).toFixed(2)}°\nAutoridade do gimbal: ${veiculo.obterSolicitacoesAplicadas().find((s) => s.recurso === 'gimbal')?.idControlador ?? 'sem comando alimentado'}\nMassa conectada: ${veiculo.massaInstantaneaDoConjuntoKg.toFixed(1)} kg · peso ${pesoAtualN().toFixed(0)} N\nTanques: CH4 ${tanqueCombustivel.massaPropelenteKg.toFixed(1)} kg · O2 ${tanqueOxidante.massaPropelenteKg.toFixed(1)} kg\nCadeia: ${linhaCombustivel.estaIndisponivel || linhaOxidante.estaIndisponivel ? 'INDISPONÍVEL' : 'íntegra'} · vazão ${propulsor.vazaoAtualKgS.toFixed(2)} kg/s\nEmpuxo: ${propulsor.empuxoAtualN.toFixed(0)} N · ignição ${propulsor.estaIgnitado ? 'ativa' : 'cortada'} · integridade ${Math.round(propulsor.integridadeEstrutural * 100)}%\n${propulsor.impulsoEspecificoNominalS === undefined ? 'Modelo propulsivo: ensaio paramétrico' : `Isp nominal: ${propulsor.impulsoEspecificoNominalS.toFixed(0)} s · efetivo: ${propulsor.impulsoEspecificoEfetivoS?.toFixed(1) ?? 'sem vazão'} s · referência ao nível do mar, constante com altitude`}\nFluxo reagido: ${propulsor.vazaoReagidaKgS.toFixed(2)} kg/s\nEfeito térmico simplificado: ${(propulsor.potenciaTermicaAtualW / 1e6).toFixed(2)} MW · carcaça ${(propulsor.potenciaTermicaNaCarcacaW / 1e6).toFixed(2)} MW · jato ${(propulsor.potenciaTermicaNoJatoW / 1e6).toFixed(2)} MW`; },
    /** Emite aprovação visual de decolagem se ignitado, empuxo maior que peso, inclinação abaixo de 5° e subida acima de 0,5 m; não homologa pouso nem encerra simulação. @contract f-c6d08f1b795a1d82 @reviewed M12-DOC: implementação lida. */
    validar: () => { const leituras = veiculo.obterLeiturasDosSensores(); return `${propulsor.estaIgnitado && propulsor.empuxoAtualN > pesoAtualN() && Math.abs(leituras.inclinacaoRad) < 5 * Math.PI / 180 && leituras.altitudeM > alturaInicialM + 0.5 ? 'APROVADO' : 'AGUARDANDO DECOLAGEM'} · empuxo ${propulsor.empuxoAtualN.toFixed(0)} N; peso ${pesoAtualN().toFixed(0)} N; inclinação ${(leituras.inclinacaoRad * 180 / Math.PI).toFixed(2)}°`; },
  };
};


/** BSS-004 com tanques ampliados e propulsão química idealizada coerente.
 * @contract f-b97335633b71971d
 */
export const criarTesteBss005 = (
  ambiente: Pick<ConfiguracaoBancadaDecolagem, 'velocidadeArMps' | 'rajadasVento' | 'densidadeAtmosfericaKgM3' | 'ambienteFisico' | 'arcoBaseM'> = {},
) => criarTesteDecolagemComPainelSolar({
  ...ambiente,
  id: 'bss-005',
  nome: 'BSS-005 — tanques ampliados · meta 15 km',
  descricao: 'Variante do BSS-004 com 600 kg de metano e 2.400 kg de oxigênio. Motor químico idealizado de 120 kN, Isp nominal de 350 s e vazão total nominal de 34,96 kg/s. Isp fixo na condição de referência ao nível do mar; sem correção por pressão ambiente. A meta de 15 km e a reserva para retorno devem ser verificadas com este modelo; os 6 MW são efeito térmico simplificado, não potência química total.',
  ...PARAMETROS_BSS005,
});

/** BSS-005 com controle aerodinâmico ativo durante a descida atmosférica.
 * @contract f-1485d6ff35c413a5
 */
export const criarTesteBss006 = (ambiente: Pick<ConfiguracaoBancadaDecolagem, 'velocidadeArMps' | 'densidadeAtmosfericaKgM3' | 'ambienteFisico' | 'arcoBaseM'> = {}) => criarTesteDecolagemComPainelSolar({
  ...ambiente,
  id: 'bss-006',
  nome: 'BSS-006 — pouso guiado por alvo',
  descricao: 'Variante do BSS-005 com duas grid fins físicas e gimbal coordenados para a descida. Antes da decolagem, clique no solo para escolher o ponto de pouso. No modo Pouso, a guia usa o gimbal com empuxo e as grid fins com fluxo atmosférico para reduzir o erro horizontal; o core continua calculando forças, torque e contato.',
  ...PARAMETROS_BSS006,
});

/** Devolve `criarTesteDecolagemComPainelSolar({ ...CONFIGURACAO_BSS001, ...ambiente })`. Dependências diretas: `criarTesteDecolagemComPainelSolar`. Efeitos indiretos seguem as dependências chamadas. @contract f-40c9cbc19da08545 */
export const criarTesteBss001 = (ambiente: AmbienteBancadaBss = {}) => criarTesteDecolagemComPainelSolar({ ...CONFIGURACAO_BSS001, ...ambiente });

/** Fábricas extraídas de src/testes.ts na M9-F; parâmetros históricos preservados.
 * @contract f-e2e25d1ef60aeeb0
 */
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

/** Variante do BSS-002 com pernas fixas estruturais, uma em cada lado.
 * @contract f-cd58adc72c4751b8
 */
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
