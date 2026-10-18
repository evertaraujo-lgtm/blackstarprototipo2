/** Rede de capacidades concentradas: não representa massa mecânica adicional. */
export interface RegiaoTermica {
  readonly id: string;
  readonly material: string;
  readonly massaTermicaKg: number;
  readonly calorEspecificoJPorKgC: number;
  readonly areaExpostaM2: number;
  readonly emissividade: number;
  readonly temperaturaInicialC: number;
  readonly limiteTermicoC: number;
  readonly taxaDanoPorSegundo: number;
}
export interface LigacaoTermica {
  readonly a: string;
  readonly b: string;
  readonly condutanciaWPorC: number;
  /** Caminho equivalente após perda completa da proteção superficial. */
  readonly condutanciaSemProtecaoWPorC: number;
}
export interface DefinicaoRedeTermica {
  readonly revisao: 'RE-004-r1';
  readonly ambienteRadiativoC: number;
  readonly regiaoSuperficial: string;
  readonly regiaoEstrutural: string;
  readonly regiaoInterna: string;
  readonly regioes: readonly RegiaoTermica[];
  readonly ligacoes: readonly LigacaoTermica[];
}
export type OrigemCalor = 'incidente' | 'geracao' | 'externa' | 'contato';
export const SIGMA_STEFAN_BOLTZMANN = 5.670374419e-8;

/** Valida topologia acíclica de dados, SI finitos e temperaturas ≥ 0 K. Campos
 * desconhecidos são rejeitados. Hipóteses de material são obrigatórias; retorna
 * cópia congelada. Não aceita limites materiais em Kelvin nem converte massas.
 * @contract f-e1b7ca33c8d712ad
   */
export function validarRedeTermica(entrada: DefinicaoRedeTermica): DefinicaoRedeTermica {
  if (!entrada || entrada.revisao !== 'RE-004-r1' || !Array.isArray(entrada.regioes) || !Array.isArray(entrada.ligacoes)
    || entrada.regioes.length < 1 || entrada.regioes.length > 8) throw new Error('Rede térmica RE-004 inválida.');
  const permitidos = ['revisao', 'ambienteRadiativoC', 'regiaoSuperficial', 'regiaoEstrutural', 'regiaoInterna', 'regioes', 'ligacoes'];
  if (Object.keys(entrada).some(k => !permitidos.includes(k))) throw new Error('Campo térmico desconhecido.');
  validarTemperatura(entrada.ambienteRadiativoC);
  const ids = new Set<string>();
  const regioes = entrada.regioes.map(r => {
    if (!r || typeof r.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(r.id) || ids.has(r.id)
      || typeof r.material !== 'string' || !r.material.trim()) throw new Error('Identidade/material térmico inválido.');
    ids.add(r.id);
    const numericos = ['massaTermicaKg', 'calorEspecificoJPorKgC', 'areaExpostaM2', 'emissividade', 'temperaturaInicialC', 'limiteTermicoC', 'taxaDanoPorSegundo'];
    if (Object.keys(r).some(k => !['id', 'material', ...numericos].includes(k))
      || numericos.some(k => typeof r[k as keyof RegiaoTermica] !== 'number' || !Number.isFinite(r[k as keyof RegiaoTermica]))) throw new Error(`Propriedade térmica inválida: ${r.id}.`);
    validarTemperatura(r.temperaturaInicialC); validarTemperatura(r.limiteTermicoC);
    if (r.massaTermicaKg <= 0 || r.calorEspecificoJPorKgC <= 0 || !Number.isFinite(r.massaTermicaKg * r.calorEspecificoJPorKgC)
      || r.areaExpostaM2 < 0 || r.areaExpostaM2 > 1e8 || r.emissividade < 0 || r.emissividade > 1
      || r.taxaDanoPorSegundo < 0 || r.taxaDanoPorSegundo > 1) throw new Error(`Capacidade/área/emissividade/dano inválido: ${r.id}.`);
    return Object.freeze({ ...r });
  });
  for (const id of [entrada.regiaoSuperficial, entrada.regiaoEstrutural, entrada.regiaoInterna]) {
    if (!ids.has(id)) throw new Error('Porta térmica não pertence à rede.');
  }
  const pares = new Set<string>();
  const ligacoes = entrada.ligacoes.map(l => {
    const par = [l.a, l.b].sort().join('/');
    if (!ids.has(l.a) || !ids.has(l.b) || l.a === l.b || pares.has(par)
      || Object.keys(l).some(k => !['a', 'b', 'condutanciaWPorC', 'condutanciaSemProtecaoWPorC'].includes(k))
      || ![l.condutanciaWPorC, l.condutanciaSemProtecaoWPorC].every(v => Number.isFinite(v) && v >= 0 && v <= 1e9)) throw new Error('Ligação térmica inválida.');
    pares.add(par); return Object.freeze({ ...l });
  });
  return Object.freeze({ ...entrada, regioes: Object.freeze(regioes), ligacoes: Object.freeze(ligacoes) });
}

/** Domínio numérico: °C finitos entre zero absoluto e 10⁷ °C. O extremo superior
 * apenas rejeita estados fora do domínio computacional; não limita temperaturas
 * calculadas à faixa de sobrevivência de materiais nem satura aquecimento.
 * @contract f-6915fd8c4cec89d9
   */
function validarTemperatura(c: number): void {
  if (!Number.isFinite(c) || c < -273.15 || c > 1e7) throw new Error('Temperatura fora do domínio térmico em °C (≥ -273,15).');
}

/** Troca pareada analítica de capacidades constantes. Retorna J de A para B,
 * preservando soma de energia sem atravessar equilíbrio mesmo com G·dt elevado.
 * @contract f-c33c6c1b4e0d7cfc
   */
export function energiaConduzida(taC: number, tbC: number, caJPorC: number, cbJPorC: number, gWPorC: number, dtS: number): number {
  if (![taC, tbC, caJPorC, cbJPorC, gWPorC, dtS].every(Number.isFinite)
    || caJPorC <= 0 || cbJPorC <= 0 || gWPorC < 0 || dtS <= 0) throw new Error('Troca condutiva inválida.');
  const ceq = 1 / (1 / caJPorC + 1 / cbJPorC);
  return ceq * (taC - tbC) * -Math.expm1(-gWPorC * dtS / ceq);
}

/** Estado privado e evolução determinística de nós térmicos. Somente APIs do
 * core chamam as mutações. Passo finito >0; rede usa splitting pareado e radiação
 * implícita, referência 1/240 s e refinamento 1/480 s. Sem DOM ou relógio real.
 */
export class RedeTermica {
  public readonly definicao: DefinicaoRedeTermica;
  private readonly estados: { temperaturaC: number; integridade: number; energiaConduzidaJ: number }[];
  private recebidaJ = 0;
  private incidenteJ = 0;
  private geradaJ = 0;
  private externaJ = 0;
  private contatoJ = 0;
  private radiadaJ = 0;
  private conveccaoJ = 0;
  private potenciaIncidenteW = 0;
  private potenciaRadiadaW = 0;
  private potenciaConveccaoW = 0;
  private readonly conduzidaLigacoesJ: number[];
  private potenciasConducaoW: number[];
  private incidentePassoJ = 0;

  /** Copia definição validada e cria capacidades regionais sem objetos/massas novos.  @contract f-af0b746b7499fe37 */
  public constructor(definicao: DefinicaoRedeTermica) {
    this.definicao = validarRedeTermica(definicao);
    this.estados = this.definicao.regioes.map(r => ({ temperaturaC: r.temperaturaInicialC, integridade: 1, energiaConduzidaJ: 0 }));
    this.conduzidaLigacoesJ = this.definicao.ligacoes.map(() => 0);
    this.potenciasConducaoW = this.definicao.ligacoes.map(() => 0);
  }

  /** Resolve índice declarado ou rejeita porta ausente antes de qualquer escrita.  @contract f-f7c3dda616533178 */
  private indice(id: string): number {
    const i = this.definicao.regioes.findIndex(r => r.id === id);
    if (i < 0) throw new Error(`Região térmica ausente: ${id}`);
    return i;
  }

  /** Consulta snapshot regional: °C, J/°C e integridade [0,1], sem acesso mutável.  @contract f-df33982cf0bd44b4 */
  public obterRegiao(id: string) {
    const i = this.indice(id), r = this.definicao.regioes[i], e = this.estados[i];
    return Object.freeze({ ...r, ...e, capacidadeJPorC: r.massaTermicaKg * r.calorEspecificoJPorKgC,
      causa: e.integridade < 1 ? `temperatura>${r.limiteTermicoC} °C em ${id}` : null });
  }

  /** Inicia contagem de potências do passo; não apaga energia histórica.  @contract f-b37c1500876dfde4 */
  public iniciarPasso(): void {
    this.incidentePassoJ = 0; this.potenciaIncidenteW = 0; this.potenciaRadiadaW = 0; this.potenciaConveccaoW = 0;
    this.potenciasConducaoW.fill(0);
  }

  /** Adiciona J com origem física declarada a uma única região. Externa é
   * condução entre objetos; valores negativos saem do corpo. Não degrada aqui:
   * dano ocorre uma única vez por passo após todas as trocas.
   * @contract f-7c938f9cf03271a6
   */
  public adicionarEnergia(id: string, energiaJ: number, origem: OrigemCalor): void {
    if (!Number.isFinite(energiaJ)) throw new Error('Energia térmica não finita.');
    const i = this.indice(id), r = this.definicao.regioes[i];
    const temperatura = this.estados[i].temperaturaC + energiaJ / (r.massaTermicaKg * r.calorEspecificoJPorKgC);
    validarTemperatura(temperatura);
    this.estados[i].temperaturaC = temperatura; this.recebidaJ += energiaJ;
    if (origem === 'incidente') { this.incidenteJ += energiaJ; this.incidentePassoJ += energiaJ; }
    else if (origem === 'geracao') this.geradaJ += energiaJ;
    else if (origem === 'externa') this.externaJ += energiaJ;
    else this.contatoJ += energiaJ;
  }

  /** Evolui convecção superficial, ligações G·ΔT e radiação εσA(T⁴−Tr⁴).
   * Kelvin somente no quarto grau. Radiação implícita por bisseção entre T e Tr
   * impede overshoot; J realmente retirados entram no balanço, sem teto térmico.
   * Condução interna retira e adiciona os mesmos J, sem reaplicar fonte aero.
   * @contract f-dc4bd0a3ba434cf2
   */
  public evoluir(dtS: number, conveccaoWPorM2C: number, ambienteC: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0 || !Number.isFinite(conveccaoWPorM2C) || conveccaoWPorM2C < 0) throw new Error('Passo térmico inválido.');
    validarTemperatura(ambienteC);
    this.potenciaIncidenteW = this.incidentePassoJ / dtS;
    const s = this.indice(this.definicao.regiaoSuperficial), rs = this.definicao.regioes[s];
    const capacidade = rs.massaTermicaKg * rs.calorEspecificoJPorKgC;
    const antes = this.estados[s].temperaturaC;
    const troca = capacidade * (antes - ambienteC) * -Math.expm1(-conveccaoWPorM2C * rs.areaExpostaM2 * dtS / capacidade);
    this.estados[s].temperaturaC -= troca / capacidade; this.conveccaoJ += troca; this.potenciaConveccaoW = troca / dtS;
    for (const [i, l] of this.definicao.ligacoes.entries()) {
      const a = this.obterRegiao(l.a), b = this.obterRegiao(l.b);
      const g = l.condutanciaWPorC + (l.condutanciaSemProtecaoWPorC - l.condutanciaWPorC) * (1 - this.estados[s].integridade);
      const j = energiaConduzida(a.temperaturaC, b.temperaturaC, a.capacidadeJPorC, b.capacidadeJPorC, g, dtS);
      const ia = this.indice(l.a), ib = this.indice(l.b);
      this.estados[ia].temperaturaC -= j / a.capacidadeJPorC; this.estados[ib].temperaturaC += j / b.capacidadeJPorC;
      this.estados[ia].energiaConduzidaJ -= j; this.estados[ib].energiaConduzidaJ += j;
      this.conduzidaLigacoesJ[i] += j; this.potenciasConducaoW[i] = j / dtS;
    }
    for (const [i, r] of this.definicao.regioes.entries()) {
      const t = this.estados[i].temperaturaC + 273.15, tr = this.definicao.ambienteRadiativoC + 273.15;
      const c = r.massaTermicaKg * r.calorEspecificoJPorKgC;
      const k = r.emissividade * SIGMA_STEFAN_BOLTZMANN * r.areaExpostaM2 * dtS / c;
      if (k === 0 || t === tr) continue;
      let lo = Math.min(t, tr), hi = Math.max(t, tr);
      for (let n = 0; n < 48; n++) {
        const m = (lo + hi) / 2, f = m - t + k * (m ** 4 - tr ** 4);
        if (f > 0) hi = m; else lo = m;
      }
      const novoK = (lo + hi) / 2, j = c * (t - novoK);
      this.estados[i].temperaturaC = novoK - 273.15;
      this.radiadaJ += j; this.potenciaRadiadaW += j / dtS;
    }
  }

  /** Dano progressivo por região, em s, taxa equivalente à lei legada de excesso
   * por 100 °C. Integridade não se recupera ao resfriar. Superfície não é estrutura.
   * @contract f-695e1ccf3bc9af80
   */
  public degradar(dtS: number): void {
    if (!Number.isFinite(dtS) || dtS <= 0) throw new Error('Passo de dano térmico inválido.');
    for (const [i, r] of this.definicao.regioes.entries()) {
      this.estados[i].integridade = Math.max(0, this.estados[i].integridade
        - r.taxaDanoPorSegundo * Math.max(0, this.estados[i].temperaturaC - r.limiteTermicoC) / 100 * dtS);
    }
  }

  /** Exporta balanço relativo ao estado inicial: ΔU = entradas − radiação −
   * convecção. Condução entre objetos aparece com sinal; interna soma zero.
   * Não soma energia elétrica armazenada, que é um reservatório distinto.
   * @contract f-b1b103d7b850237f
   */
  public observar() {
    const regioes = this.definicao.regioes.map(r => this.obterRegiao(r.id));
    const armazenada = regioes.reduce((s, r) => s + r.capacidadeJPorC * (r.temperaturaC - r.temperaturaInicialC), 0);
    return Object.freeze({ revisao: this.definicao.revisao, regioes: Object.freeze(regioes),
      energiaArmazenadaJ: armazenada, energiaIncidenteJ: this.incidenteJ, energiaGeradaJ: this.geradaJ,
      energiaConducaoExternaJ: this.externaJ, energiaContatoJ: this.contatoJ,
      energiaRadiadaJ: this.radiadaJ, energiaConveccaoJ: this.conveccaoJ,
      residuoEnergiaJ: armazenada - (this.recebidaJ - this.radiadaJ - this.conveccaoJ),
      potenciaIncidenteW: this.potenciaIncidenteW, potenciaRadiadaW: this.potenciaRadiadaW, potenciaConveccaoW: this.potenciaConveccaoW,
      conducoes: Object.freeze(this.definicao.ligacoes.map((l, i) => Object.freeze({ ...l, energiaJ: this.conduzidaLigacoesJ[i], potenciaW: this.potenciasConducaoW[i] }))) });
  }
}
export type ObservacaoRedeTermica = ReturnType<RedeTermica['observar']>;
