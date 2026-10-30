import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TERRA } from '../src/physics/ambiente/CampoGravitacional';
import { amostrarCruzamentosMach } from '../src/cenarios/CruzamentosMach';
import { EnsaioReentrada, type EntradaConfiguracaoReentrada, type ObservacaoReentrada } from '../src/cenarios/EnsaioReentrada';

const rad = Math.PI / 180;
const marcosMach = [10, 5, 2, 1, 0.8] as const;
interface PerfilDeceleracao {
  readonly id: string;
  readonly alvoInicialDeg: number;
  readonly duracaoS: number;
  readonly mudancas: readonly { readonly mach: number; readonly alvoDeg: number }[];
  readonly desligarNoMach?: number;
  readonly vacuo?: boolean;
}
const perfis: readonly PerfilDeceleracao[] = [
  { id: 'fixo-alpha30', alvoInicialDeg: 30, duracaoS: 838, mudancas: [] as { mach: number; alvoDeg: number }[] },
  { id: 'fixo-alpha40', alvoInicialDeg: 40, duracaoS: 838, mudancas: [] },
  { id: 'fixo-alpha55', alvoInicialDeg: 55, duracaoS: 838, mudancas: [] },
  { id: 'fixo-alpha70', alvoInicialDeg: 70, duracaoS: 838, mudancas: [] },
  { id: 'fixo-alpha80', alvoInicialDeg: 80, duracaoS: 838, mudancas: [] },
  { id: 'agenda-40-55-30', alvoInicialDeg: 40, duracaoS: 838, mudancas: [{ mach: 5, alvoDeg: 55 }, { mach: 1, alvoDeg: 30 }] },
  { id: 'agenda-40-30-55', alvoInicialDeg: 40, duracaoS: 838, mudancas: [{ mach: 5, alvoDeg: 30 }, { mach: 1, alvoDeg: 55 }] },
  { id: 'falha-alimentacao-mach2', alvoInicialDeg: 40, duracaoS: 838, mudancas: [] as { mach: number; alvoDeg: number }[], desligarNoMach: 2 },
  { id: 'vacio-conservacao-alpha40', alvoInicialDeg: 40, duracaoS: 600, mudancas: [] as { mach: number; alvoDeg: number }[], vacuo: true },
];

/**
 * Executa uma matriz finita no `EnsaioReentrada` real: condições orbitais de
 * referência idênticas, alvos de α constantes ou agendas acionadas por Mach,
 * falha elétrica e vácuo explícito. Cada cruzamento é interpolado entre passos
 * consecutivos; amostras são guardadas a cada 10 s e extremos vêm do redutor por
 * passo do core. O limite temporal é orçamento de coleta, nunca evento de
 * pouso/sucesso. Nenhum estado cinemático ou parâmetro aerodinâmico é corrigido.
 * @contract f-afa88301acb4dab3
 */
export async function executarCampanhaDesaceleracaoRe002(): Promise<void> {
  const pasta = resolve(process.env.REENTRADA_EVIDENCIAS_DIR ?? 'docs/validacoes/reentrada/RE002-B');
  mkdirSync(pasta, { recursive: true });
  const filtro = process.env.RE002_DESACELERACAO_CASOS?.split(',').map(s => s.trim()).filter(Boolean);
  const limiteRapidoS = Number(process.env.RE002_DURACAO_MAX_S);
  const resumo: object[] = [];
  for (const perfil of perfis.filter(p => !filtro || filtro.includes(p.id))) {
    const duracaoS = Number.isFinite(limiteRapidoS) && limiteRapidoS > 0
      ? Math.min(perfil.duracaoS, limiteRapidoS) : perfil.duracaoS;
    const altitudeInicialM = 120_000;
    const velocidadeInicialMps = perfil.vacuo
      ? Math.sqrt(TERRA.muM3S2 / (TERRA.raioM + altitudeInicialM)) : 7700;
    const trajetoriaInicialRad = perfil.vacuo ? 0 : -rad;
    const entrada: EntradaConfiguracaoReentrada = {
      altitudeM: altitudeInicialM, velocidadeMps: velocidadeInicialMps, trajetoriaRad: trajetoriaInicialRad,
      anguloAtaqueRad: 40 * rad, passoS: 1 / 240, automatico: !perfil.vacuo,
      vacuo: perfil.vacuo ?? false, intervaloColetaS: 1,
      aproximacao: { alvoArcoM: 2_000_000 },
    };
    const ensaio = new EnsaioReentrada(entrada);
    const comandoInicial = ensaio.receberComando({ tipo: 'alvos', alphaRad: perfil.alvoInicialDeg * rad, phiRad: 0 });
    if (!comandoInicial.aceito && !perfil.vacuo) throw new Error(`${perfil.id}: comando inicial rejeitado: ${comandoInicial.motivo}`);
    ensaio.iniciar();
    /** Extrai canais de campanha e extremos reduzidos pelo core sem integrar novamente. @contract f-40b8cf9dfdf0dc66 */
    const reduzir = (o: ObservacaoReentrada) => ({ tempoS: o.tempoS, passo: o.passo,
      altitudeM: o.altitudeM, arcoM: o.arcoM, velocidadeTotalMps: o.velocidadeMps,
      velocidadeRadialMps: o.velocidadeRadialMps, velocidadeTangencialMps: o.velocidadeTangencialMps,
      velocidadeRelativaArMps: o.aerodinamica.velocidadeRelativaMps, trajetoriaRad: o.trajetoriaRad,
      atitudeInercialRad: o.atitudeInercialRad, atitudeLocalRad: o.atitudeLocalRad,
      alphaRad: o.aerodinamica.anguloAtaqueRad, alphaAlvoRad: o.controle.alphaGerenciadoRad,
      omegaRadps: o.estado.velocidadeAngularRadps.z, mach: o.aerodinamica.mach,
      regime: o.aerodinamica.regime, knudsen: o.aerodinamica.knudsen,
      pressaoDinamicaPa: o.aerodinamica.pressaoDinamicaPa, cl: o.aerodinamica.cl,
      cd: o.aerodinamica.cd, sustentacaoN: o.aerodinamica.sustentacaoN, arrastoN: o.aerodinamica.arrastoN,
      razaoLD: o.aerodinamica.arrastoN > 0 ? o.aerodinamica.sustentacaoN / o.aerodinamica.arrastoN : null,
      desaceleracaoMps2: o.desaceleracaoMps2, torqueAerodinamicoNm: o.torqueAerodinamicoNm,
      energiaMecanicaEspecificaJPorKg: o.energiaMecanicaEspecificaJPorKg,
      energiaDissipadaJ: o.energiaDissipadaJ, energiaAbsorvidaJ: o.energiaAbsorvidaJ,
      fluxoTermicoIndicadorWm2: o.aerodinamica.fluxoTermicoIndicadorWm2,
      temperaturaCorpoC: o.temperaturaC, integridadeCorpo: o.integridade,
      bateriaJ: o.energiaBateriaJ, massaKg: o.massaKg, controle: o.controle,
      flaps: o.flaps.map(f => ({ deflexaoRad: f.deflexaoRad, comandoRad: f.comandoRad,
        integridade: f.integridade, temperaturaC: f.temperaturaC, energizado: f.energizado,
        conectado: f.conectado, atuacao: f.atuacao })), terminais: o.estadosTerminais,
      extremosPorPasso: o.extremos.globais });

    const inicial = ensaio.observar();
    let anterior = ensaio.observarCruzamentoMach();
    const amostras10s = [reduzir(inicial)], cruzamentos: ReturnType<typeof amostrarCruzamentosMach>[number][] = [];
    const comandos: { tempoS: number; gatilhoMach: number | null; comando: object; resultado: object }[] = [];
    let proximaMudanca = 0, falhaAplicada = false;
    const passosOrcamento = Math.round(duracaoS / ensaio.passoS);
    for (let passo = 1; passo <= passosOrcamento; passo++) {
      if (!ensaio.avancarPasso()) throw new Error(`${perfil.id}: ensaio parou antes do orçamento no passo ${passo}.`);
      const atual = ensaio.observarCruzamentoMach();
      const eventos = amostrarCruzamentosMach(anterior, atual, marcosMach);
      cruzamentos.push(...eventos);
      for (const evento of eventos) {
        const mudanca = perfil.mudancas[proximaMudanca];
        if (mudanca && evento.machAlvo === mudanca.mach) {
          const comando = { tipo: 'alvos' as const, alphaRad: mudanca.alvoDeg * rad, phiRad: 0 };
          const resultado = ensaio.receberComando(comando);
          comandos.push({ tempoS: evento.tempoS, gatilhoMach: evento.machAlvo, comando, resultado });
          if (!resultado.aceito) throw new Error(`${perfil.id}: agenda Mach ${evento.machAlvo} rejeitada: ${resultado.motivo}`);
          proximaMudanca++;
        }
        if (perfil.desligarNoMach === evento.machAlvo && !falhaAplicada) {
          const comando = { tipo: 'alimentacao' as const, ligada: false };
          const resultado = ensaio.receberComando(comando);
          comandos.push({ tempoS: evento.tempoS, gatilhoMach: evento.machAlvo, comando, resultado });
          falhaAplicada = true;
        }
      }
      if (passo % Math.round(10 / ensaio.passoS) === 0) amostras10s.push(reduzir(ensaio.observar()));
      if (passo % Math.round(60 / ensaio.passoS) === 0) {
        console.log(JSON.stringify({ caso: perfil.id, tempoS: atual.tempoS, mach: atual.mach,
          altitudeM: atual.altitudeM, progresso: passo / passosOrcamento }));
      }
      anterior = atual;
    }
    const final = ensaio.observar();
    const dados = { contrato: 'RE-002B / campanha orbital comparativa; não qualificação de voo',
      receita: { id: perfil.id, duracaoS, duracaoCompletaReferenciaS: perfil.duracaoS,
        budget: 'orçamento de coleta, não evento físico',
        condicoesIniciais: { altitudeM: altitudeInicialM, velocidadeMps: velocidadeInicialMps,
          anguloAtaqueInicialRad: 40 * rad, trajetoriaRad: trajetoriaInicialRad,
          passoS: 1 / 240, massaExperimentalKg: inicial.massaKg },
        parametrosAlvo: { alphaInicialDeg: perfil.alvoInicialDeg, agendaMach: perfil.mudancas,
          falhaEletricaNoMach: perfil.desligarNoMach ?? null, vacuoExplicito: !!perfil.vacuo } },
      identificacao: ensaio.obterIdentificacao(), comandoInicial: { alphaRad: perfil.alvoInicialDeg * rad, resultado: comandoInicial },
      comandos, marcosMach, cruzamentos, inicial: reduzir(inicial), final: reduzir(final),
      eventosFisicos: ensaio.obterEventos(), amostras10s,
      parecer: { cruzamentosComComponentesEssenciaisIntegrais: cruzamentos.filter(x => x.componentesEssenciaisIntegrais).map(x => x.machAlvo),
        cruzamentosComControleDisponivel: cruzamentos.filter(x => x.controleDisponivel).map(x => x.machAlvo),
        casoSobreviveuOrcamento: final.integridade > 0 && final.flaps.every(f => f.integridade > 0 && f.energizado && f.conectado),
        descidaFinalMps: final.velocidadeRadialMps, velocidadeTangencialResidualMps: final.velocidadeTangencialMps,
        variacaoEnergiaMecanicaEspecificaJPorKg: final.energiaMecanicaEspecificaJPorKg - inicial.energiaMecanicaEspecificaJPorKg,
        passouMachNaoDefineSucesso: true },
    };
    writeFileSync(resolve(pasta, `${perfil.id}.json`), JSON.stringify(dados, null, 2));
    resumo.push({ id: perfil.id, duracaoS, hFinalM: final.altitudeM,
      velocidadeFinalMps: final.velocidadeMps, velocidadeTangencialResidualMps: final.velocidadeTangencialMps,
      omegaFinalRadps: final.estado.velocidadeAngularRadps.z, integridadeCorpo: final.integridade,
      integridadeFlaps: final.flaps.map(f => f.integridade), cruzamentosMach: cruzamentos.map(x => ({ mach: x.machAlvo,
        tempoS: x.tempoS, hM: x.estado.altitudeM, velocidadeMps: x.estado.velocidadeMps,
        integridadeFlaps: x.estado.integridadeFlaps, controleDisponivel: x.controleDisponivel })),
      falhaAplicada, energiaDissipadaJ: final.energiaDissipadaJ });
    writeFileSync(resolve(pasta, 'resumo.json'), JSON.stringify({ matriz: resumo,
      nota: 'Massa, aerodinâmica e dt vêm da revisão identificada; cada voo continua após falhas durante o orçamento declarado.' }, null, 2));
    console.log(JSON.stringify(resumo[resumo.length - 1]));
  }
}

void executarCampanhaDesaceleracaoRe002();
