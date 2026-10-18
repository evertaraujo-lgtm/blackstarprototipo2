import { mkdirSync, writeFileSync } from 'node:fs';
import { EnsaioReentrada, type EntradaConfiguracaoReentrada, type ObservacaoReentrada } from '../src/cenarios/EnsaioReentrada';

/** Seleciona métricas efetivamente observadas, sem guardar uma trajetória paralela.
 * Os extremos vêm da redução em cada passo; amostras abaixo são espaçadas 10 s.
 * @contract f-a4e257495658a353
   */
function resumir(o: ObservacaoReentrada) {
  return { tempoS: o.tempoS, passo: o.passo, altitudeM: o.altitudeM, arcoM: o.arcoM,
    velocidadeMps: o.velocidadeMps, velocidadeRadialMps: o.velocidadeRadialMps, velocidadeTangencialMps: o.velocidadeTangencialMps,
    trajetoriaRad: o.trajetoriaRad, atitudeInercialRad: o.atitudeInercialRad, atitudeLocalRad: o.atitudeLocalRad,
    alphaRad: o.aerodinamica.anguloAtaqueRad, alphaAlvoRad: o.controle.alphaGerenciadoRad,
    omegaRadps: o.estado.velocidadeAngularRadps.z, energiaMecanicaEspecificaJPorKg: o.energiaMecanicaEspecificaJPorKg,
    inerciaKgM2: o.inerciaKgM2, rotacao: o.rotacao, torqueAerodinamicoNm: o.torqueAerodinamicoNm,
    pressaoDinamicaPa: o.aerodinamica.pressaoDinamicaPa, cargaG: o.cargaG,
    fluxoTermicoIndicadorWm2: o.aerodinamica.fluxoTermicoIndicadorWm2, energiaDissipadaJ: o.energiaDissipadaJ,
    temperaturaC: o.temperaturaC, integridade: o.integridade, respostaTermica: o.respostaTermica,
    energiaBateriaJ: o.energiaBateriaJ, temperaturaBateriaC: o.temperaturaBateriaC,
    controle: o.controle, supervisor: o.supervisor, terminais: o.estadosTerminais,
    flaps: o.flaps.map(f => ({ comandoRad: f.comandoRad, deflexaoRad: f.deflexaoRad, integridade: f.integridade,
      temperaturaC: f.temperaturaC, energiaAbsorvidaJ: f.energiaAbsorvidaJ, conectado: f.conectado, energizado: f.energizado, atuacao: f.atuacao })),
    vinculos: o.vinculos, extremos: o.extremos.globais };
}

/** Campanha determinística no Ensaio real; termina orçamento de coleta, não missão.
 * Referências anteriores não são sobrescritas. Alvos são sintéticos e explícitos.
 * Nenhum motor/TPS é instalado. Saída incremental permite auditar falhas também.
 * @contract f-e85b85490afedc61
   */
async function executarCampanha(): Promise<void> {
  const pasta = 'docs/validacoes/re002'; mkdirSync(pasta, { recursive: true });
  const filtro = process.env.RE002_CASOS?.split(',');
  const casos: { id: string; duracaoS: number; entrada: EntradaConfiguracaoReentrada }[] = [
    { id: 'ref-120-7700', duracaoS: 1000, entrada: {} },
    { id: 'ref-120-7700-838', duracaoS: 838, entrada: {} },
    { id: 'ref-120-9000', duracaoS: 838, entrada: { velocidadeMps: 9000 } },
    { id: 'ref-200-9000', duracaoS: 838, entrada: { altitudeM: 200000, velocidadeMps: 9000 } },
    { id: 'ref-200-9000-vacuo', duracaoS: 838, entrada: { altitudeM: 200000, velocidadeMps: 9000, vacuo: true } },
    ...[30, 40, 55].map(alpha => ({ id: `adm-65-2500-alpha${alpha}`, duracaoS: 500, entrada: {
      altitudeM: 65000, velocidadeMps: 2500, trajetoriaRad: -5 * Math.PI / 180, anguloAtaqueRad: alpha * Math.PI / 180 } })),
    { id: 'adm-65-2500-bank60', duracaoS: 500, entrada: { altitudeM: 65000, velocidadeMps: 2500, trajetoriaRad: -5 * Math.PI / 180, rolagemRad: Math.PI / 3 } },
    { id: 'adm-65-2500-perturbacao', duracaoS: 500, entrada: { altitudeM: 65000, velocidadeMps: 2500, trajetoriaRad: -5 * Math.PI / 180, taxaAtitudeLocalInicialRadps: 0.02 } },
    { id: 'adm-65-2500-ganhos-metade', duracaoS: 500, entrada: { altitudeM: 65000, velocidadeMps: 2500, trajetoriaRad: -5 * Math.PI / 180, parametros: { ganhoAlpha: 0.004, ganhoTaxa: 0.09 } } },
    { id: 'adm-65-2500-sem-automacao', duracaoS: 500, entrada: { altitudeM: 65000, velocidadeMps: 2500, trajetoriaRad: -5 * Math.PI / 180, automatico: false } },
  ];
  for (const receita of casos.filter(c => !filtro || filtro.includes(c.id))) {
    const e = new EnsaioReentrada({ ...receita.entrada, aproximacao: { alvoArcoM: 2e6 } });
    const inicial = e.observar(); const amostras = [resumir(inicial)];
    let candidatoPrimeiro: ReturnType<typeof resumir> | null = null;
    let erroAlphaQuadratico = 0, observacoes = 0, saturadas = 0, semAutoridade = 0;
    let minErro = Infinity, maxErro = -Infinity, cruzamentosErro = 0, erroAnterior = 0;
    e.iniciar();
    for (let passo = 1; passo <= Math.round(receita.duracaoS / e.passoS); passo++) {
      e.avancarPasso();
      if (passo % Math.round(1 / e.passoS) === 0) {
        const o = e.observar(); const erro = Math.atan2(Math.sin(o.aerodinamica.anguloAtaqueRad - o.controle.alphaGerenciadoRad), Math.cos(o.aerodinamica.anguloAtaqueRad - o.controle.alphaGerenciadoRad));
        erroAlphaQuadratico += erro ** 2; observacoes++; minErro = Math.min(minErro, erro); maxErro = Math.max(maxErro, erro);
        if (erro * erroAnterior < 0) cruzamentosErro++; erroAnterior = erro;
        if (o.controle.estado === 'saturado') saturadas++; if (o.controle.estado === 'sem-autoridade') semAutoridade++;
        if (o.supervisor.candidatoCinematico && !candidatoPrimeiro) candidatoPrimeiro = resumir(o);
        if (passo % Math.round(10 / e.passoS) === 0) amostras.push(resumir(o));
      }
    }
    const final = e.observar();
    const saida = { receita, configuracao: e.configuracao, identificacao: e.obterIdentificacao(),
      natureza: 'orçamento de coleta; alvo sintético +2000 km; candidato necessário sob hipóteses; sem propulsão/TPS',
      inicial: resumir(inicial), final: resumir(final), primeiroCandidatoAmostrado1Hz: candidatoPrimeiro,
      estatisticasControleAmostradas1Hz: { erroAlphaRmsRad: Math.sqrt(erroAlphaQuadratico / observacoes), minErroRad: minErro, maxErroRad: maxErro,
        cruzamentosErro, fracaoSaturado: saturadas / observacoes, fracaoSemAutoridade: semAutoridade / observacoes },
      eventos: e.obterEventos(), amostras10s: amostras };
    writeFileSync(`${pasta}/campanha-${receita.id}.json`, JSON.stringify(saida, null, 2));
    console.log(JSON.stringify({ id: receita.id, tempoS: final.tempoS, h: final.altitudeM, v: final.velocidadeMps,
      omega: final.estado.velocidadeAngularRadps.z, integridade: final.integridade,
      flaps: final.flaps.map(f => f.integridade), candidato: !!candidatoPrimeiro,
      residuoAngular: final.rotacao.residuoAcumuladoKgM2ps, passosIncompletos: final.rotacao.passosIncompletos }));
  }
}
await executarCampanha();
