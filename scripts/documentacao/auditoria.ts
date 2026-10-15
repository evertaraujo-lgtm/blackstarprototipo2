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
 */
export function verificarDocumentacao(analise: Analise): Cobertura {
  const producao = analise.funcoes.filter(f => f.categoria === 'producao');
  const comContrato = producao.filter(f => descricaoDocumento(f.documento).length >= 15 && f.documento.includes(`@contract ${ancoraFuncao(f.id)}`));
  return { producao: producao.length, contratos: analise.funcoes.filter(f => f.categoria === 'contrato').length,
    callbacks: analise.funcoes.filter(f => f.categoria === 'callback').length, testes: analise.funcoes.filter(f => f.categoria === 'teste').length,
    comJSDoc: producao.filter(f => f.documento).length, comContrato: comContrato.length,
    revisadas: producao.filter(f => /@reviewed\s+\S+/.test(f.documento)).length,
    revisaoNecessaria: producao.filter(f => /REVISÃO NECESSÁRIA/.test(f.documento) || !f.documento).length,
    faltantes: producao.filter(f => !comContrato.includes(f)).map(f => f.id) };
}
