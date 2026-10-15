import type { Analise } from './ast';
import { ancoraFuncao, descricaoDocumento } from './catalogo';

export interface Cobertura {
  readonly producao: number; readonly contratos: number; readonly callbacks: number; readonly testes: number;
  readonly comJSDoc: number; readonly comContrato: number; readonly revisadas: number;
  readonly revisaoNecessaria: number; readonly faltantes: readonly string[];
}

/**
 * Confere presença de descrição e referência de contrato; não aprova qualidade semântica.
 * @returns Cobertura de funções nomeadas implementadas e contratos declarativos separadamente.
 * @remarks Callback anônimo/teste é inventariado, mas não exige JSDoc de produção.
 * @remarks Mede presença de descrição e âncora correta do catálogo em funções nomeadas implementadas, separando revisão explícita e pendência semântica. Contratos declarativos, callbacks e testes são contados separadamente; não prova qualidade das descrições.
 * @contract f-c3f1e2f6feeaf3dc
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function verificarDocumentacao(analise: Analise): Cobertura {
  const producao = analise.funcoes.filter(f => f.categoria === 'producao');
  const comContrato = producao.filter(f => descricaoDocumento(f.documento).length >= 15 && [...f.documento.replaceAll('*/', ' ').matchAll(/@contract\s+(\S+)/g)].some(m => m[1] === ancoraFuncao(f.id)));
  return { producao: producao.length, contratos: analise.funcoes.filter(f => f.categoria === 'contrato').length,
    callbacks: analise.funcoes.filter(f => f.categoria === 'callback').length, testes: analise.funcoes.filter(f => f.categoria === 'teste').length,
    comJSDoc: producao.filter(f => f.documento).length, comContrato: comContrato.length,
    revisadas: producao.filter(f => /@reviewed\s+\S+/.test(f.documento)).length,
    revisaoNecessaria: producao.filter(f => /REVISÃO NECESSÁRIA/.test(f.documento) || !f.documento).length,
    faltantes: producao.filter(f => !comContrato.includes(f)).map(f => f.id) };
}
