import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { criarTesteBss005 } from './BancadaBss';
import { atendeLimitesDeToqueBss005, CRITERIOS_POUSO_BSS005, avancarEnsaioMissaoBss005, executarEnsaioMissaoBss005, lerMissaoBss005 } from './EnsaioMissaoBss005';

// O scheduler pertence ao teste Node; o domínio conserva somente o dt simulado.
const executarCooperativamente = async (config: Parameters<typeof executarEnsaioMissaoBss005>[0] = {}) => {
  const ensaio = avancarEnsaioMissaoBss005(config);
  let passo = ensaio.next();
  while (!passo.done) { await setImmediate(); passo = ensaio.next(); }
  return passo.value;
};

// Exportação opcional do próprio ensaio testado, sem executar um segundo coletor.
const exportarEvidencia = (nome: string, resultado: unknown) => {
  const pasta = process.env.BSS005_M2_EVIDENCIAS_DIR;
  if (!pasta) return;
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, `${nome}.json`), `${JSON.stringify(resultado, null, 2)}\n`);
};

const validarEncerramentoAposImpacto = (r: ReturnType<typeof executarEnsaioMissaoBss005>) => {
  expect(r.final.tempoS).toBeGreaterThan(r.toque!.depois.tempoS + 3);
  if (r.encerramento === 'repouso-fisico') {
    expect(r.repousoContinuoS).toBeGreaterThanOrEqual(3);
    expect(r.final.velocidadeMaximaComponentesMps).toBeLessThanOrEqual(CRITERIOS_POUSO_BSS005.velocidadeRepousoComponentesMaxMps);
  } else {
    expect(r.final.tempoS).toBeCloseTo(r.configuracao.limiteEnsaioS, 6);
    expect(r.motivos).toContain('sem-repouso-continuo');
  }
};

const evento = (resultado: ReturnType<typeof executarEnsaioMissaoBss005>, tipo: string) => resultado.eventos.find((item) => item.tipo === tipo)!.leitura;

describe('M2 — BSS-005, mesma montagem da interface, dt fixo de 1/240 s', () => {
  it.each([
    ['lateral', { velocidadeXMps: 0.6, velocidadeYMps: 0, orientacaoRad: 0, velocidadeAngularRadps: 0 }],
    ['inclinação', { velocidadeXMps: 0, velocidadeYMps: 0, orientacaoRad: 0.02, velocidadeAngularRadps: 0 }],
    ['rotação', { velocidadeXMps: 0, velocidadeYMps: 0, orientacaoRad: 0, velocidadeAngularRadps: 0.02 }],
  ])('reprova toque com %s fora do limite', (_nome, leitura) => {
    expect(atendeLimitesDeToqueBss005(leitura)).toBe(false);
  });

  it('observa o ambiente usado no core e a leitura não altera o estado físico', () => {
    const cenario = criarTesteBss005();
    const antes = cenario.objetos.map((objeto) => objeto.getEstadoFisico());
    const leitura = lerMissaoBss005(cenario, 'solo');
    const ambiente = cenario.mundo.obterCondicoesAtmosfericas(cenario.seguirObjeto);
    expect(leitura.densidadeArKgM3).toBe(ambiente.densidadeArKgM3);
    expect(leitura.densidadeArKgM3).toBeGreaterThan(1.22);
    expect(leitura.pressaoDinamicaPa).toBe(0);
    expect(leitura.arrastoN).toEqual({ x: 0, y: 0 });
    expect(leitura.sapatasApoiadas).toHaveLength(0);
    expect(leitura.massaConectadaKg).toBe(leitura.massaTotalObjetosKg);
    expect(cenario.objetos.map((objeto) => objeto.getEstadoFisico())).toEqual(antes);
    expect(cenario.mundo.tempoS).toBe(0);
    cenario.mundo.avancar(1 / 240);
    expect(lerMissaoBss005(cenario, 'solo').sapatasApoiadas).toHaveLength(2);
  });

  it('separa toque seguro de repouso quando o apoio bilateral não persiste', async () => {
    const r = await executarCooperativamente({ altitudeTrocaParaPousoM: 300, throttleDecolagem: 0.65 });
    exportarEvidencia('referencia-300m', r);
    expect(r.resultado, JSON.stringify(r.motivos)).toBe('falha');
    expect(r.pousoSeguro).toBe(true);
    expect(r.eventos.filter((item) => item.tipo === 'primeiro-contato')).toHaveLength(1);
    expect(r.eventos.filter((item) => item.tipo === 'toque-seguro')).toHaveLength(1);
    expect(r.eventos.filter((item) => item.tipo === 'pouso-falhou')).toHaveLength(1);
    expect(r.eventos.some((item) => item.tipo === 'repouso-estavel')).toBe(false);
    expect(r.encerramento).toBe('watchdog');
    expect(r.decolou).toBe(true);
    expect(r.apogeu.altitudeM).toBeGreaterThan(300);
    expect(r.toque!.depois.contatos.length).toBeGreaterThan(0);
    expect(Math.abs(r.toque!.antes.velocidadeYMps)).toBeLessThan(CRITERIOS_POUSO_BSS005.velocidadeVerticalToqueMaxMps);
    expect(Math.abs(r.toque!.antes.velocidadeXMps)).toBeLessThan(CRITERIOS_POUSO_BSS005.velocidadeHorizontalToqueMaxMps);
    expect(r.final.sapatasApoiadas).toHaveLength(2);
    expect(r.repousoContinuoS).toBeLessThan(3);
    expect(r.final.empuxoN).toBe(0);
    expect(r.final.integridadeMinima).toBe(1);
    expect(r.final.fixadoresRompidos).toEqual([]);
    expect(r.final.metanoKg + r.final.oxidanteKg).toBeGreaterThan(0);
    expect(r.erroBalancoMaxKg).toBeLessThan(1e-7);
    expect(r.motivos).toContain('instabilidade-apos-toque');
    expect(r.motivos).toContain('sem-repouso-continuo');
    expect(r.causasFalhaPouso).toContain('velocidade-angular');
    expect(r.maiorRepousoContinuoS).toBeLessThan(CRITERIOS_POUSO_BSS005.duracaoRepousoS);
    expect(evento(r, 'pouso-falhou').velocidadeAngularRadps)
      .toBeGreaterThanOrEqual(CRITERIOS_POUSO_BSS005.velocidadeAngularMaxRadps);
    const semHistorico = await executarCooperativamente({ altitudeTrocaParaPousoM: 300, throttleDecolagem: 0.65, registrarAmostras: false });
    expect(semHistorico.amostras).toEqual([]);
    expect(semHistorico.final).toEqual(r.final);
    expect(semHistorico.toque).toEqual(r.toque);
    expect(semHistorico.causasFalhaPouso).toEqual(r.causasFalhaPouso);
    expect(semHistorico.maiorRepousoContinuoS).toBe(r.maiorRepousoContinuoS);
    exportarEvidencia('observabilidade', { historicoNaoAlteraResultado: true });
  }, 360000);

  it('reprova e reproduz o retorno nominal de 15 km, sem esconder o esgotamento e o impacto', async () => {
    const r = await executarCooperativamente();
    const repetido = await executarCooperativamente();
    expect(repetido).toEqual(r);
    exportarEvidencia('nominal-15km', r);
    exportarEvidencia('determinismo', { repeticaoNominalIdentica: true });
    expect(r.resultado).toBe('falha');
    expect(r.decolou).toBe(true);
    expect(evento(r, 'troca-para-pouso').altitudeM).toBeGreaterThanOrEqual(15000);
    expect(r.apogeu.altitudeM).toBeGreaterThan(19000);
    expect(evento(r, 'inicio-da-frenagem').altitudeM).toBeGreaterThan(19000);
    expect(evento(r, 'esgotamento-propelente').altitudeM).toBeGreaterThan(18000);
    const contatoInicial = evento(r, 'primeiro-contato').contatosFisicos.find((contato) =>
      contato.objetoId === 'painel-decolagem-solar' && contato.energiaImpactoJ > 0);
    expect(contatoInicial).toBeDefined();
    // Mantém o limite histórico no instante físico do impacto, não na velocidade
    // do casco consultada um passo antes de registrar a colisão de um módulo.
    expect(contatoInicial!.velocidadeNormalAntesMps).toBeLessThan(-80);
    const toqueDoVeiculo = evento(r, 'toque-veiculo');
    expect(toqueDoVeiculo.contatosFisicos.some((contato) => contato.objetoId === 'bss-005'
      || contato.objetoId.startsWith('bss05-perna-') || contato.objetoId.startsWith('bss05-sapata-'))).toBe(true);
    expect(Number.isFinite(r.toque!.antes.velocidadeYMps)).toBe(true);
    expect(r.maiorPenetracaoContatoM).toBeGreaterThan(0);
    expect(r.objetoComMaiorPenetracaoId).toBeTruthy();
    expect(r.motivos).toContain('propelente-esgotado');
    expect(r.motivos).toContain('dano-estrutural');
    expect(r.motivos).toContain('toque-nao-seguro');
    expect(r.eventos.some((item) => item.tipo === 'pouso-falhou')).toBe(true);
    expect(r.eventos.filter((item) => item.tipo === 'pouso-falhou')).toHaveLength(1);
    expect(r.motivos).toContain('vinculos-rompidos');
    expect(r.final.integridadeMinima).toBeLessThan(1);
    expect(r.final.fixadoresRompidos.length).toBeGreaterThan(0);
    expect(r.final.empuxoN).toBe(0);
    expect(r.final.metanoKg + r.final.oxidanteKg).toBe(0);
    expect(r.erroBalancoMaxKg).toBeLessThan(1e-7);
    // A colisão não encerra o script. A montagem destruída não estabilizou no
    // intervalo observado: registrar a limitação, sem congelar os destroços.
    validarEncerramentoAposImpacto(r);
    expect(r.amostras.some((leitura) => leitura.tempoS > evento(r, 'esgotamento-propelente').tempoS
      && leitura.empuxoN === 0 && !leitura.ignitado)).toBe(true);
  }, 300000);

  it('falha por ausência deliberada de reserva no corte e mantém balanço de massa explícito', async () => {
    const r = await executarCooperativamente({ falha: 'sem-reserva-no-corte' });
    exportarEvidencia('sem-reserva', r);
    expect(r.resultado).toBe('falha');
    expect(r.massaRetiradaNaFalhaKg).toBeGreaterThan(400);
    expect(r.massaRetiradaNaFalhaKg).toBeLessThan(500);
    expect(evento(r, 'falha-sem-reserva').metanoKg + evento(r, 'falha-sem-reserva').oxidanteKg).toBe(0);
    expect(r.toque).toBeDefined();
    expect(r.toque!.antes.velocidadeYMps).toBeLessThan(-80);
    expect(r.final.integridadeMinima).toBeLessThan(1);
    expect(r.erroBalancoMaxKg).toBeLessThan(1e-7);
    validarEncerramentoAposImpacto(r);
  }, 180000);

  it('corta a propulsão na perda de controle e registra a queda e o estado após o impacto', async () => {
    const r = await executarCooperativamente({ falha: 'perda-controle-no-corte' });
    exportarEvidencia('perda-controle', r);
    const falha = evento(r, 'falha-perda-controle');
    expect(falha.sistemas['controle']).toBe(false);
    expect(r.motivos).toContain('controle-perdido');
    for (const leitura of r.amostras.filter((item) => item.tempoS > falha.tempoS)) {
      expect(leitura.sistemas['controle']).toBe(false);
      expect(leitura.empuxoN).toBe(0);
      expect(leitura.vazaoTotalKgS).toBe(0);
      expect(leitura.ignitado).toBe(false);
    }
    expect(r.toque).toBeDefined();
    expect(r.final.metanoKg + r.final.oxidanteKg).toBeCloseTo(falha.metanoKg + falha.oxidanteKg, 9);
    expect(r.final.integridadeMinima).toBeLessThan(1);
    expect(r.final.fixadoresRompidos.length).toBeGreaterThan(0);
    expect(r.erroBalancoMaxKg).toBeLessThan(1e-7);
    validarEncerramentoAposImpacto(r);
  }, 180000);

  it('nega a partida sem combustível e não inventa decolagem nem consumo', () => {
    const r = executarEnsaioMissaoBss005({ falha: 'sem-combustivel-inicial', limiteEnsaioS: 5 });
    exportarEvidencia('sem-combustivel', r);
    expect(r.comandos.find((comando) => comando.operacao === 'ignicao')!.aceito).toBe(false);
    expect(r.decolou).toBe(false);
    expect(r.toque).toBeUndefined();
    expect(r.resultado).toBe('falha');
    expect(r.motivos).toContain('ignicao-negada');
    expect(r.massaRetiradaNaFalhaKg).toBe(3000);
    expect(r.consumoMotorKg).toBe(0);
    expect(r.final.empuxoN).toBe(0);
    expect(r.final.integridadeMinima).toBe(1);
    expect(r.encerramento).toBe('repouso-fisico');
  });

  it('classifica um watchdog curto como inconclusivo, sem inventar falha física ou pouso', () => {
    const r = executarEnsaioMissaoBss005({ limiteEnsaioS: 1 });
    expect(r.encerramento).toBe('watchdog');
    expect(r.resultado).toBe('inconclusivo');
    expect(r.toque).toBeUndefined();
    expect(r.final.integridadeMinima).toBe(1);
    expect(r.final.empuxoN).toBeGreaterThan(0);
  });

  it.each([0, -1, NaN, Infinity, 1 / 60])('rejeita dt inválido ou acima do passo de bancada: %s', (dtS) => {
    expect(() => executarEnsaioMissaoBss005({ dtS })).toThrow('inválida');
  });
});
