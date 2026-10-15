import { createHash } from 'node:crypto';
import type { Analise, Funcao } from './ast';

export interface EntradaEstrutural {
  readonly id: string; readonly assinatura: string; readonly modificadores: readonly string[];
  readonly categoria: Funcao['categoria'];
}
export interface Divergencias {
  readonly adicionadas: readonly string[]; readonly removidas: readonly string[]; readonly alteradas: readonly string[];
}

/** Âncora estável por ID lexical; usada pelos contratos no código e pelo catálogo.
 * @remarks Deriva âncora f- mais 16 dígitos SHA-256 do ID lexical para vincular cabeçalho e catálogo independentemente da linha.
 * @contract f-1135e5d33909b4db
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function ancoraFuncao(id: string): string { return `f-${createHash('sha256').update(id).digest('hex').slice(0, 16)}`; }

/** Projeta o inventário estável; linhas e comentários não fazem parte do contrato estrutural.
 * @remarks Projeta ID, assinatura inferida, categoria e modificadores para referência estável; exclui linhas/comentários da comparação estrutural.
 * @contract f-c5de5aad77329503
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function estrutura(funcoes: readonly Funcao[]): readonly EntradaEstrutural[] {
  return funcoes.map(({ id, assinatura, modificadores, categoria }) => ({ id, assinatura, modificadores, categoria }));
}

/**
 * Compara identidade, assinatura inferida, visibilidade/estático e categoria.
 * @returns Listas de IDs; ordem de entradas e deslocamentos de linhas são irrelevantes.
 * @remarks Consulta somente; não atualiza a referência nem aprova diferenças.
 * @remarks Compara referências por ID e reporta adições, remoções e alterações de assinatura/categoria/modificadores; não grava nem aceita automaticamente diferenças.
 * @contract f-c884a823582fc4e6
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function compararInventarios(atual: readonly EntradaEstrutural[], anterior: readonly EntradaEstrutural[]): Divergencias {
  const a = new Map(atual.map(f => [f.id, f])), b = new Map(anterior.map(f => [f.id, f]));
  return { adicionadas: [...a.keys()].filter(id => !b.has(id)), removidas: [...b.keys()].filter(id => !a.has(id)),
    alteradas: [...a].filter(([id, f]) => { const antigo = b.get(id); return antigo &&
      (f.assinatura !== antigo.assinatura || f.categoria !== antigo.categoria || JSON.stringify(f.modificadores) !== JSON.stringify(antigo.modificadores)); }).map(([id]) => id) };
}

/** Escapa delimitadores Markdown/HTML para preservar expressões e assinaturas no catálogo.
 * @remarks Escapa delimitadores HTML/Markdown e quebras de linha apenas no texto de apresentação do catálogo.
 * @contract f-044a7b0855c5b0f2
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
function escapar(texto: string): string {
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;').replaceAll('\n', '<br>');
}

/** Renderiza evidências de implementação sem interpretar intenção a partir do nome.
 * @remarks Formata listas de evidências em code HTML e abrevia trechos longos com indicação explícita para consultar a fonte.
 * @contract f-3efdd1af6a4a7c82
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
function evidencias(lista: readonly string[], limite = 240): string {
  return lista.length ? lista.map(e => `<code>${escapar(e.length > limite ? `${e.slice(0, limite)}… [continua na fonte]` : e)}</code>`).join('; ') : '—';
}

/** Remove apenas marcação JSDoc para mostrar a descrição já documentada, preservando tags em seção própria.
 * @remarks Remove delimitadores/prefixos de JSDoc e separa descrição inicial das tags; não inventa intenção a partir de nomes.
 * @contract f-be488156fcce409c
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function descricaoDocumento(documento: string): string {
  return documento.replace(/^\/\*\*|\*\/$/g, '').split('\n').map(l => l.replace(/^\s*\* ?/, '').trim()).join(' ').split(/\s@\w+/)[0].trim();
}

/**
 * Descreve fatos diretamente extraídos do corpo. Não deduz semântica de nomes.
 * @returns Texto mecânico e indicação de revisão; ausência de documentação não vira falsa aprovação.
 * @remarks Preserva a descrição documentada ou expõe fatos mecânicos do corpo, marcando intenção não confirmada para revisão; ausência de comentário não é aprovação semântica.
 * @contract f-824dacdf237a023b
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function responsabilidadeExtraida(f: Funcao): string {
  if (f.documento) return descricaoDocumento(f.documento);
  if (!f.corpo) return 'Contrato declarativo; implementação fornecida pelo participante que atende à interface. REVISÃO NECESSÁRIA.';
  if (!f.chamadas.length && !f.escritas.length && f.retornos.length === 1 && f.retornos[0].length < 180)
    return `Retorna a expressão ${f.retornos[0]}. Descrição extraída do corpo; significado de domínio requer revisão.`;
  if (f.especie === 'Constructor' && f.escritas.length) return `Inicializa instância; propriedades/escritas: ${f.escritas.join(', ')}. REVISÃO NECESSÁRIA do contrato de construção.`;
  if (f.corpo.replace(/\s/g, '') === '{}') return 'Hook sem operação nesta implementação; especializações podem fornecer efeitos. REVISÃO NECESSÁRIA.';
  return `REVISÃO NECESSÁRIA. ${f.retornos.length ? 'Produz os retornos listados abaixo. ' : ''}${f.escritas.length ? 'Executa as escritas listadas abaixo. ' : ''}${f.chamadas.length ? 'Invoca as dependências listadas abaixo.' : 'Implementação local sem chamadas diretas.'}`;
}

/**
 * Gera catálogo por módulo com contratos completos e evidências de corpo/AST.
 * @param analise Inventário atual; unidades só vêm dos contratos documentados, não de inferência numérica.
 * @returns Markdown; testes/callbacks ficam em seções próprias. Não grava arquivos.
 * @remarks Renderiza ficha por função com assinatura, contrato, evidências, associações diretas de testes e estado; callbacks/testes têm seções próprias. Retorna Markdown sem gravar fontes.
 * @contract f-704974d6e97659cc
 * @reviewed M12-DOC: contrato confrontado com implementação.
 */
export function gerarCatalogo(analise: Analise): string {
  const linhas = ['# Catálogo integral de funções', '',
    'Gerado pelo compilador TypeScript a partir de fontes próprias. Use `npm run docs:gerar` para atualizar e `npm run docs:verificar` para conferir deriva.', '',
    'Identidade = caminho relativo + escopo lexical + espécie AST; overloads e callbacks usam ordinal por escopo. Linhas são apenas navegação. Visibilidade/estático, tipos inferidos e categoria são auditados no inventário JSON.', '',
    '**Extraída** indica fatos AST; **descrita** indica JSDoc; **verificada** exige revisão técnica explícita `@reviewed`. `REVISÃO NECESSÁRIA` é uma pendência semântica, mesmo com 100% de presença de comentários. Referências de testes por import direto são associação estática, não cobertura de execução por função.', '',
    'Expressões, escritas e chamadas são evidências diretas da implementação. Escritas incluem variáveis locais e propriedades; chamadas podem ter efeitos transitivos não inferidos. Condicionais são ramos observados, não todas pré-condições. Expressões longas são abreviadas com indicação e link para a fonte. Unidades SI/°C, hipóteses XY e autoridade física são detalhadas no mapa e contratos revisados.', '',
    '## Índice de módulos', ''];
  const arquivos = [...new Set(analise.funcoes.filter(f => f.categoria === 'producao' || f.categoria === 'contrato').map(f => f.arquivo))];
  /** Obtém âncora ordinal do módulo no índice local do documento; não é a âncora lexical estável da função. @contract f-9b3c079941304fcb @reviewed M12-DOC: implementação lida. */
  const ancora = (a: string) => `modulo-${arquivos.indexOf(a) + 1}`;
  for (const a of arquivos) linhas.push(`- [${a}](#${ancora(a)})`);
  const testes = analise.modulos.filter(m => /\.(test|spec)\./.test(m.arquivo));
  for (const arquivo of arquivos) {
    linhas.push('', `<a id="${ancora(arquivo)}"></a>`, `## ${arquivo}`, '');
    const associados = testes.filter(t => t.imports.some(i => {
      const partes = `${t.arquivo.slice(0, t.arquivo.lastIndexOf('/'))}/${i.destino}.ts`.split('/'), resolvido: string[] = [];
      for (const p of partes) { if (p === '..') resolvido.pop(); else if (p !== '.') resolvido.push(p); }
      return resolvido.join('/') === arquivo;
    })).map(t => t.arquivo);
    for (const f of analise.funcoes.filter(f => f.arquivo === arquivo && (f.categoria === 'producao' || f.categoria === 'contrato'))) {
      const estado = /@reviewed\b/.test(f.documento) ? 'Verificada (revisão explicitamente registrada)' : /REVISÃO NECESSÁRIA/.test(f.documento) || !f.documento ? 'Extraída — REVISÃO NECESSÁRIA' : 'Descrita — revisão semântica ainda não certificada';
      linhas.push(`<a id="${ancoraFuncao(f.id)}"></a>`, `<details><summary>${escapar(f.nome)} · ${f.especie}</summary>`, '', '| Campo | Contrato / evidência |', '|---|---|',
        `| Identificador | <code>${escapar(f.id)}</code> · [fonte L${f.linha}](../../${arquivo.replaceAll(' ', '%20')}#L${f.linha}) |`,
        `| Assinatura | ${evidencias([`${f.modificadores.join(' ')} ${f.assinatura}`], 10000)} |`,
        `| Responsabilidade | ${escapar(responsabilidadeExtraida(f))} |`,
        `| Entradas | ${evidencias(f.parametros, 1000)}; unidades/condições: contrato JSDoc abaixo. Ausência de unidade explícita exige revisão. |`,
        `| Saídas | Tipo ${evidencias([f.retorno], 10000)}; expressões retornadas: ${evidencias(f.retornos)} |`,
        `| Efeitos colaterais | Escritas/inicializações (incluem locais e campos de construtor): ${evidencias(f.escritas)}. Efeitos de chamadas: contratos das dependências; não inferidos automaticamente. |`,
        `| Dependências | Chamadas/construções diretas: ${evidencias(f.chamadas)} |`,
        `| Invariantes | Contrato documentado abaixo; ramos observados: ${evidencias(f.condicoes)}; exceções: ${evidencias(f.excecoes)} |`,
        `| Testes | ${associados.length ? associados.map(a => `[${a}](../../${a.replaceAll(' ', '%20')})`).join('; ') + ' (imports diretos do módulo)' : 'Nenhuma associação estática direta identificada; não significa ausência de testes indiretos.'} |`,
        `| Estado da documentação | ${estado} |`,
        `| JSDoc integral | ${f.documento ? escapar(f.documento) : 'Ausente; sem contrato semântico confirmado.'} |`, '', '</details>', '');
    }
  }
  for (const [titulo, categoria] of [['Callbacks anônimos (produção)', 'callback'], ['Funções em testes (inclui callbacks de describe/it)', 'teste']] as const) {
    linhas.push(`## ${titulo}`, '', '| Identificador / fonte | Assinatura | Chamadas / efeitos diretos |', '|---|---|---|');
    for (const f of analise.funcoes.filter(f => f.categoria === categoria)) linhas.push(`| <code>${escapar(f.id)}</code> · [L${f.linha}](../../${f.arquivo.replaceAll(' ', '%20')}#L${f.linha}) | ${evidencias([f.assinatura], 1500)} | ${evidencias(f.chamadas)} / ${evidencias(f.escritas)} |`);
    linhas.push('');
  }
  return linhas.join('\n') + '\n';
}
