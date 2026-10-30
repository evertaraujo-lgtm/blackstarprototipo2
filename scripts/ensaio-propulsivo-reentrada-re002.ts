import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { criarEnsaioPropulsivoOrbitadorRe002 } from '../src/cenarios/EnsaioPropulsivoOrbitadorRe002';

const rad = Math.PI / 180;
const dtS = 1 / 240;
const duracaoMaximaS = 60;

/** Roda a tentativa propulsiva RE-002E até repouso após contato ou até falha,
 * respeitando o orçamento de coleta. Registra comandos, consumo, integridade e
 * estado final sem impor força, velocidade ou pose ao mundo físico.
 * @contract f-caf894459ba6ea56
 * @reviewed RE-002E: fluxo e condição de parada confrontados com o core físico.
 */
export function executarEnsaioPropulsivoReentradaRe002(): void {
  const pasta = resolve(process.env.REENTRADA_EVIDENCIAS_DIR ?? 'docs/validacoes/reentrada/RE002-E');
  mkdirSync(pasta, { recursive: true });
  const e = criarEnsaioPropulsivoOrbitadorRe002();
  const ignicao = e.veiculo.solicitarIgnicaoDosPropulsores();
  if (ignicao.length !== 1 || ignicao.some(r => !r.aceito)) throw new Error(`Permissivos/ignição recusados: ${JSON.stringify(ignicao)}`);
  e.veiculo.definirThrottleDoPropulsor(e.propulsor.id, 0.8);
  e.veiculo.habilitarControleDeVerticalizacao([e.propulsor.id]);
  let fase: 'flip-propulsivo' | 'aproximacao' | 'corte-terminal' | 'falha' = 'flip-propulsivo';
  let tempoCorteS: number | null = null;
  let motivoCorte: string | null = null;
  let toqueInicialS: number | null = null;
  const amostras: object[] = [];
  const idsEstruturais = new Set([e.veiculo.id, e.propulsor.id, e.tanqueMetano.id, e.tanqueOxidante.id, e.bateria.id]);
  const passosMaximos = Math.round(duracaoMaximaS / dtS);
  let motivoEncerramento = 'orçamento de coleta atingido';

  for (let passo = 0; passo < passosMaximos; passo++) {
    const leituras = e.veiculo.obterLeiturasDoComputadorDeVoo();
    const velocidadeTotalMps = Math.hypot(leituras.velocidadeVerticalMps, leituras.velocidadeHorizontalMps);
    const erroAtitudeRad = Math.atan2(Math.sin(leituras.inclinacaoRad), Math.cos(leituras.inclinacaoRad));
    if (fase === 'flip-propulsivo' && Math.abs(erroAtitudeRad) <= 5 * rad
      && Math.abs(leituras.velocidadeAngularRadps ?? Infinity) <= 0.05) {
      e.veiculo.desabilitarControleDeInclinacao();
      e.controladorAproximacao.habilitar(); fase = 'aproximacao';
    }
    if (fase === 'aproximacao' && leituras.altitudeM <= 15
      && Math.abs(leituras.velocidadeVerticalMps) <= 5
      && Math.abs(erroAtitudeRad) <= 5 * rad
      && Math.abs(leituras.velocidadeAngularRadps ?? Infinity) <= 0.05) {
      e.controladorAproximacao.desabilitar();
      e.veiculo.definirThrottleDoPropulsor(e.propulsor.id, 0);
      e.veiculo.desligarPropulsor(e.propulsor.id);
      fase = 'corte-terminal'; tempoCorteS = e.mundo.tempoS; motivoCorte = 'janela de toque com atitude/velocidade limitadas';
    }
    e.mundo.avancar(dtS);
    const leituraDepois = e.veiculo.obterLeiturasDoComputadorDeVoo();
    const estado = e.veiculo.getEstadoFisico();
    const contatos = e.mundo.obterContatosComSuperficie().filter(c => idsEstruturais.has(c.objetoId));
    if (contatos.length > 0 && toqueInicialS === null) toqueInicialS = e.mundo.tempoS;
    if (passo % 240 === 0 || contatos.length > 0 || fase === 'corte-terminal') {
      amostras.push({ tempoS: e.mundo.tempoS, altitudeM: leituraDepois.altitudeM,
        velocidadeHorizontalMps: leituraDepois.velocidadeHorizontalMps,
        velocidadeVerticalMps: leituraDepois.velocidadeVerticalMps,
        velocidadeTotalMps: Math.hypot(leituraDepois.velocidadeVerticalMps, leituraDepois.velocidadeHorizontalMps),
        atitudeLocalRad: leituraDepois.inclinacaoRad, velocidadeAngularRadps: leituraDepois.velocidadeAngularRadps,
        massaInstantaneaKg: e.veiculo.massaInstantaneaDoConjuntoKg,
        propulsor: { ignitado: e.propulsor.estaIgnitado, throttle: e.propulsor.throttleAtual,
          empuxoN: e.propulsor.empuxoAtualN, vazaoKgS: e.propulsor.vazaoAtualKgS,
          integridade: e.propulsor.integridadeEstrutural, gimbalRad: e.propulsor.obterEstadoDaVetorizacao().anguloAtualRad },
        propelente: { metanoKg: e.tanqueMetano.massaPropelenteKg, oxidanteKg: e.tanqueOxidante.massaPropelenteKg,
          bateriaJ: e.bateria.energiaArmazenadaJ }, fase, integridadeCasco: e.veiculo.integridadeEstrutural,
        contatos: contatos.length });
    }
    if (passo % 240 === 0) console.log(JSON.stringify({ tempoS: e.mundo.tempoS,
      altitudeM: leituraDepois.altitudeM, velocidadeMps: Math.hypot(leituraDepois.velocidadeVerticalMps, leituraDepois.velocidadeHorizontalMps),
      atitudeRad: leituraDepois.inclinacaoRad, fase, throttle: e.propulsor.throttleAtual }));
    if (e.veiculo.integridadeEstrutural === 0 || e.propulsor.integridadeEstrutural === 0) {
      motivoEncerramento = 'falha estrutural do casco/propulsor'; fase = 'falha'; break;
    }
    if (fase === 'corte-terminal' && contatos.length > 0 && velocidadeTotalMps < 0.05
      && Math.abs(estado.velocidadeAngularRadps.z) < 0.01) {
      motivoEncerramento = 'repouso físico após corte terminal'; break;
    }
  }
  const final = e.veiculo.obterLeiturasDoComputadorDeVoo();
  const contatoFinal = e.mundo.obterContatosComSuperficie().filter(c => idsEstruturais.has(c.objetoId));
  const dados = { contrato: 'RE-002E / ensaio físico experimental isolado; sem qualificação de veículo',
    identificacao: { revisao: 'RE-002-r4 + propulsao-BSS-005-parametrica', ambiente: e.mundo.obterConfiguracaoFisica(),
      dtS, duracaoMaximaS, condicaoInicialRE002B: { altitudeM: 6_755.82917311425,
        velocidadeVerticalMps: -250.5257888502, velocidadeHorizontalMps: 7.3797283675,
        atitudeInicialRad: Math.PI, significadoAtitude: 'configuração invertida no referencial VeiculoComposto' },
      parametrosPropulsivos: e.parametrosPropulsivos,
      estimativas: { aceleracaoNecessariaLiquidaMps2: 8,
        distanciaParadaIdealM: 250.5257888502 ** 2 / (2 * 8),
        empuxoVerticalNecessarioInicialN: e.massaInicialKg * (9.80665 + 8),
        fracaoEmpuxoNominalRequerida: e.massaInicialKg * (9.80665 + 8) / e.parametrosPropulsivos.empuxoMaximoN } },
    permissivosIgnicao: ignicao, controladores: ['ControladorInclinacaoDePropulsores (flip; gimbal real)',
      'ControladorAproximacao (frenagem/energia; throttle e gimbal reais)'],
    eventos: { trocaParaAproximacao: amostras.find(a => (a as { fase?: string }).fase === 'aproximacao') ?? null,
      corteTerminal: tempoCorteS === null ? null : { tempoS: tempoCorteS, motivo: motivoCorte },
      primeiroContatoS: toqueInicialS, encerramento: motivoEncerramento },
    final: { tempoS: e.mundo.tempoS, altitudeM: final.altitudeM,
      velocidadeHorizontalMps: final.velocidadeHorizontalMps, velocidadeVerticalMps: final.velocidadeVerticalMps,
      atitudeLocalRad: final.inclinacaoRad, omegaLocalRadps: final.velocidadeAngularRadps,
      massaInstantaneaKg: e.veiculo.massaInstantaneaDoConjuntoKg, integridadeCasco: e.veiculo.integridadeEstrutural,
      integridadePropulsor: e.propulsor.integridadeEstrutural, empuxoN: e.propulsor.empuxoAtualN,
      fixadores: e.veiculo.fixadoresEstruturais.map(f => ({ id: f.id, estado: f.estado })),
      metanoRestanteKg: e.tanqueMetano.massaPropelenteKg, oxidanteRestanteKg: e.tanqueOxidante.massaPropelenteKg,
      bateriaRestanteJ: e.bateria.energiaArmazenadaJ, contatos: contatoFinal.length }, amostras };
  writeFileSync(resolve(pasta, 'ensaio-verticalizacao-propulsiva.json'), JSON.stringify(dados, null, 2));
  console.log(JSON.stringify({ encerramento: motivoEncerramento, final: dados.final }));
}

void executarEnsaioPropulsivoReentradaRe002();
