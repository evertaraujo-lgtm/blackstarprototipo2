import { validarRedeTermica, type DefinicaoRedeTermica, type RegiaoTermica } from '../termica/RedeTermica';

export type PerfilTermicoReentrada = 'sem-tps' | 'tps-experimental';
export interface ConfiguracaoTermicaReentrada {
  readonly revisao: 'RE-004-r1';
  readonly perfil: PerfilTermicoReentrada;
  readonly hipotese: string;
  readonly corpo: DefinicaoRedeTermica;
  readonly flap: DefinicaoRedeTermica;
  readonly bateria: DefinicaoRedeTermica;
  readonly condutanciaBateriaWPorC: number;
}

/** Receita de estudo SI inteiramente hipotética, sem dados de certificação.
 * Três capacidades equivalentes por corpo/flap; revestimento/estrutura/interior
 * são separados mesmo sem TPS. Massa térmica não é acrescida à massa mecânica.
 * Limites antigos passam explicitamente à superfície; estrutura 800 °C e
 * mecanismo 120 °C são hipóteses ajustáveis, independentes da bateria (60 °C).
 * @contract f-1043d2497bfcabb6
   */
export function criarConfiguracaoTermicaReentrada(perfil: PerfilTermicoReentrada,
  limiteCorpoC = 1100, limiteFlapC = 900, limiteBateriaC = 60): ConfiguracaoTermicaReentrada {
  if (perfil !== 'sem-tps' && perfil !== 'tps-experimental') throw new Error('Perfil térmico desconhecido.');
  const tps = perfil === 'tps-experimental';
  const corpo: DefinicaoRedeTermica = { revisao: 'RE-004-r1', ambienteRadiativoC: -3.15,
    regiaoSuperficial: 'superficie', regiaoEstrutural: 'estrutura', regiaoInterna: 'interna',
    regioes: [
      regiao('superficie', tps ? 'Revestimento cerâmico equivalente hipotético' : 'Pele metálica exposta hipotética', 2000, tps ? 1000 : 800, 80, tps ? 0.85 : 0.7, limiteCorpoC),
      regiao('estrutura', 'Estrutura equivalente hipotética; limiar experimental 800 °C', 70000, 800, 0, 0, 800),
      regiao('interna', 'Compartimento e equipamentos equivalentes hipotéticos', 6900, 900, 0, 0, 80),
    ], ligacoes: [
      { a: 'superficie', b: 'estrutura', condutanciaWPorC: tps ? 80 : 200000, condutanciaSemProtecaoWPorC: tps ? 20000 : 200000 },
      { a: 'estrutura', b: 'interna', condutanciaWPorC: 200, condutanciaSemProtecaoWPorC: 200 },
    ] };
  const flap: DefinicaoRedeTermica = { ...corpo, regioes: [
    regiao('superficie', tps ? 'TPS cerâmico equivalente hipotético' : 'Pele metálica exposta hipotética', 30, tps ? 1000 : 500, 2, tps ? 0.85 : 0.7, limiteFlapC),
    regiao('estrutura', 'Estrutura de flap hipotética; não propriedade universal de flap', 420, 500, 0, 0, 800),
    regiao('interna', 'Articulação/atuador equivalente; limiar hipotético, não certificado', 50, 600, 0, 0, 120),
  ], ligacoes: [
    { a: 'superficie', b: 'estrutura', condutanciaWPorC: tps ? 0.8 : 2000, condutanciaSemProtecaoWPorC: tps ? 200 : 2000 },
    { a: 'estrutura', b: 'interna', condutanciaWPorC: 2, condutanciaSemProtecaoWPorC: 2 },
  ] };
  const bateria: DefinicaoRedeTermica = { ...corpo, regiaoSuperficial: 'estrutura', regiaoInterna: 'estrutura',
    regioes: [regiao('estrutura', 'Bateria interna equivalente; sem modelo de fuga térmica ou geração interna', 100, 1000, 0, 0, limiteBateriaC)], ligacoes: [] };
  return validarConfiguracaoTermicaReentrada({ revisao: 'RE-004-r1', perfil,
    hipotese: 'Capacidades, emissividades, limites e condutâncias hipotéticos ajustáveis. Ambiente radiativo equivalente 270 K; sem radiação solar/visada Terra separadas. Sem ablação/CFD. Dano do revestimento aumenta condutância equivalente, sem alterar massa.',
    corpo, flap, bateria, condutanciaBateriaWPorC: 20 });
}

/** Constrói dados regionais explícitos em kg, J/(kg·°C), m² e °C; não evolui calor.  @contract f-9b4a1f6cf6ccceae */
function regiao(id: string, material: string, massaTermicaKg: number, calorEspecificoJPorKgC: number,
  areaExpostaM2: number, emissividade: number, limiteTermicoC: number): RegiaoTermica {
  return { id, material, massaTermicaKg, calorEspecificoJPorKgC, areaExpostaM2, emissividade,
    temperaturaInicialC: 20, limiteTermicoC, taxaDanoPorSegundo: 0.02 };
}

/** Valida todas as redes e caminho interno→bateria, retornando cópias congeladas.
 * Não preenche uma receita regional incompleta, nem converte limites de Kelvin.
 * @contract f-9ed2ed08efdf2951
   */
export function validarConfiguracaoTermicaReentrada(e: ConfiguracaoTermicaReentrada): ConfiguracaoTermicaReentrada {
  if (!e || e.revisao !== 'RE-004-r1' || !['sem-tps', 'tps-experimental'].includes(e.perfil)
    || typeof e.hipotese !== 'string' || !e.hipotese.trim()
    || Object.keys(e).some(k => !['revisao', 'perfil', 'hipotese', 'corpo', 'flap', 'bateria', 'condutanciaBateriaWPorC'].includes(k))
    || !Number.isFinite(e.condutanciaBateriaWPorC) || e.condutanciaBateriaWPorC < 0 || e.condutanciaBateriaWPorC > 1e9) throw new Error('Configuração térmica regional inválida.');
  const corpo = validarRedeTermica(e.corpo), flap = validarRedeTermica(e.flap), bateria = validarRedeTermica(e.bateria);
  for (const rede of [corpo, flap]) {
    if (rede.regioes.length !== 3 || rede.regiaoSuperficial !== 'superficie' || rede.regiaoEstrutural !== 'estrutura'
      || rede.regiaoInterna !== 'interna') throw new Error('Corpo/flaps requerem superfície, estrutura e região interna.');
  }
  if (bateria.regioes.length !== 1 || bateria.regiaoEstrutural !== 'estrutura'
    || bateria.regioes[0].areaExpostaM2 !== 0) throw new Error('Bateria deve ser um nó interno não exposto.');
  return Object.freeze({ ...e, corpo, flap, bateria });
}
