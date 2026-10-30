import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { criarEnsaioReentrada } from '../src/cenarios/EnsaioReentrada';

/** Coleta 600 s do RE-001 nominal com o mesmo core/controle da tela. Verifica
 * finitude e balanço térmico de quadratura; não qualifica aerodinâmica/reentrada.
 * Escreve amostras/eventos e identificação em evidência JSON local, sem deploy.
 * @contract f-9e0ba414efcfb974
   */
function validarReentrada(): void {
  const ensaio = criarEnsaioReentrada(); ensaio.iniciar();
  const amostras = [ensaio.observar()];
  for (let i = 0; i < 600 * 240; i++) {
    ensaio.avancarPasso();
    if (ensaio.passosExecutados % 2400 === 0) {
      const o = ensaio.observar();
      assert([o.altitudeM, o.velocidadeMps, o.temperaturaC, o.cargaG, o.estado.orientacaoRad.z,
        o.estado.velocidadeAngularRadps.z, o.energiaAbsorvidaJ].every(Number.isFinite), 'Estado não finito.');
      assert(o.energiaAbsorvidaJ <= o.energiaDissipadaJ * (1 + 1e-10) + 1e-4, 'Calor acima da dissipação integrada.');
      amostras.push(o);
      if (ensaio.passosExecutados % 24_000 === 0) console.log(`RE-001: ${o.tempoS.toFixed(0)} s, h=${o.altitudeM.toFixed(0)} m, V=${o.velocidadeMps.toFixed(1)} m/s`);
    }
  }
  const final = ensaio.observar();
  const resultado = { resultado: 'OK — finitude e contabilidade, sem qualificação de voo',
    duracaoS: 600, passos: ensaio.passosExecutados, identificacao: ensaio.exportar().identificacao,
    maximosAmostrados: { pressaoPa: Math.max(...amostras.map(o => o.aerodinamica.pressaoDinamicaPa)),
      fluxoWm2: Math.max(...amostras.map(o => o.aerodinamica.fluxoTermicoIndicadorWm2)),
      temperaturaC: Math.max(...amostras.map(o => o.temperaturaC)), cargaG: Math.max(...amostras.map(o => o.cargaG)) },
    final, eventos: ensaio.obterEventos(), amostras };
  const pasta = resolve(process.env.REENTRADA_EVIDENCIAS_DIR ?? 'docs/validacoes/reentrada');
  mkdirSync(pasta, { recursive: true });
  writeFileSync(resolve(pasta, 'ensaio-600s.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify({ resultado: resultado.resultado, maximosAmostrados: resultado.maximosAmostrados,
    final: { altitudeM: final.altitudeM, velocidadeMps: final.velocidadeMps, integridade: final.integridade, fase: final.supervisor.fase } }, null, 2));
}
validarReentrada();
