import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { criarMissaoBss006Registrada, reproduzirDiarioBss006 } from '../src/missoes/ReplayMissaoBss006';
import { executarMissaoAtePasso } from '../src/missoes/ExecutorMissao';

/** Adaptador CLI Node; as mesmas portas consumidas pelo Canvas e pelos testes. */
try {
  const { values } = parseArgs({ options: {
    segundos: { type: 'string', default: '90' }, alvo: { type: 'string', default: '0' },
    vento: { type: 'string', default: '0' }, saida: { type: 'string' }, replay: { type: 'string' },
    'sem-ignicao': { type: 'boolean', default: false },
    amerissagem: { type: 'boolean', default: false },
  } });
  const segundos = Number(values.segundos);
  if (!Number.isFinite(segundos) || segundos <= 0) throw new Error('Orçamento de observação deve ser positivo em segundos.');
  const m = values.replay ? reproduzirDiarioBss006(JSON.parse(readFileSync(values.replay, 'utf8'))) : criarMissaoBss006Registrada({ alvoPousoLocalM: Number(values.alvo), ventoTangencialMps: Number(values.vento),
    ...(values.amerissagem ? { ensaioAquatico: { inclinacaoInicialRad: 0.005, velocidadeInicialMps: 0.5, altitudeInicialM: 5 } } : {}) });
  const passos = Math.round(segundos / m.passoS);
  if (!Number.isSafeInteger(passos) || passos < 1) throw new Error('Orçamento deve conter ao menos um passo fixo.');
  if (!values.replay) {
    for (const sistema of values.amerissagem ? [] : ['elétrico', 'hidráulico', 'combustível', 'controle'] as const) {
      const r = m.receberComando({ tipo: 'sistema', sistema, ligar: true }); if (!r.aceito) throw new Error(r.motivo);
    }
    if (!values['sem-ignicao'] && !values.amerissagem) { const r = m.receberComando({ tipo: 'ignicao' }); if (!r.aceito) throw new Error(r.motivo); }
    m.iniciar(); executarMissaoAtePasso(m, passos);
  }
  const diario = JSON.stringify(m.exportar(), null, 2) + '\n';
  if (values.saida) writeFileSync(values.saida, diario); else process.stdout.write(diario);
  if (values.saida) console.log(`Diário gravado em ${values.saida}; ${m.observar().tempoS.toFixed(3)} s simulados. O orçamento encerra a coleta, não classifica o pouso.`);
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
