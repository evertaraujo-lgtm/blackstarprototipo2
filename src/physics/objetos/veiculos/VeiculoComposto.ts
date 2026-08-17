import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { Vetor3 } from '../../Vetor3';
import { Objeto, type DefinicaoObjeto } from '../base/Objeto';
import { Propulsor } from '../propulsao/Propulsor';
import { ComputadorDeVoo, type ResultadoComandoPropulsor } from './ComputadorDeVoo';

/**
 * Raiz de composição de um veículo. O próprio veículo é o corpo físico
 * central; tanque, propulsores e demais módulos continuam sendo Objetos
 * independentes, ligados exclusivamente por FixadoresEstruturais.
 */
export class VeiculoComposto extends Objeto {
  private readonly modulos = new Map<string, Objeto>();
  private readonly fixadores = new Map<string, FixadorEstrutural>();
  private readonly computadorDeVoo = new ComputadorDeVoo();

  public constructor(definicao: DefinicaoObjeto) {
    super(definicao);
  }

  public adicionarModulo(modulo: Objeto): void {
    if (modulo === this) throw new Error('O corpo central não pode ser adicionado como módulo.');
    if (this.modulos.has(modulo.id)) throw new Error(`Módulo já instalado: ${modulo.id}.`);
    this.modulos.set(modulo.id, modulo);
  }

  public instalarPropulsor(propulsor: Propulsor): void {
    if (!this.modulos.has(propulsor.id)) throw new Error('Propulsor precisa ser adicionado como módulo físico antes de ser instalado.');
    this.computadorDeVoo.instalarPropulsor(propulsor);
  }

  public adicionarFixador(fixador: FixadorEstrutural): void {
    if (this.fixadores.has(fixador.id)) throw new Error(`Fixador já instalado: ${fixador.id}.`);
    if (!this.pertenceAoVeiculo(fixador.objetoA) || !this.pertenceAoVeiculo(fixador.objetoB)) {
      throw new Error('Fixador só pode ligar corpos físicos pertencentes ao mesmo veículo composto.');
    }
    this.fixadores.set(fixador.id, fixador);
  }

  /** Registra cada corpo e vínculo no mundo, sem criar estado físico duplicado. */
  public registrarNoMundo(mundo: MundoFisico): void {
    mundo.registrarObjeto(this);
    for (const modulo of this.modulos.values()) mundo.registrarObjeto(modulo);
    for (const fixador of this.fixadores.values()) mundo.registrarFixador(fixador);
  }

  public solicitarIgnicaoDosPropulsores(): readonly ResultadoComandoPropulsor[] {
    return this.computadorDeVoo.solicitarIgnicaoDeTodos();
  }

  public definirThrottleDoPropulsor(idPropulsor: string, throttle: number): void {
    this.computadorDeVoo.definirThrottle(idPropulsor, throttle);
  }

  public definirThrottleDeTodosOsPropulsores(throttle: number): void {
    this.computadorDeVoo.definirThrottleDeTodos(throttle);
  }

  public desligarPropulsores(): void {
    this.computadorDeVoo.desligarTodos();
  }

  public obterDiagnosticoDosPropulsores(): readonly ResultadoComandoPropulsor[] {
    return this.computadorDeVoo.obterDiagnostico();
  }

  /** Apenas módulos ainda conectados ao corpo central compõem este conjunto. */
  public obterObjetosFisicosConectados(): readonly Objeto[] {
    const conectados = new Set<Objeto>([this]);
    let houveAlteracao = true;
    while (houveAlteracao) {
      houveAlteracao = false;
      for (const fixador of this.fixadores.values()) {
        if (fixador.estaRompido) continue;
        if (conectados.has(fixador.objetoA) && !conectados.has(fixador.objetoB)) {
          conectados.add(fixador.objetoB); houveAlteracao = true;
        }
        if (conectados.has(fixador.objetoB) && !conectados.has(fixador.objetoA)) {
          conectados.add(fixador.objetoA); houveAlteracao = true;
        }
      }
    }
    return [...conectados];
  }

  public get massaInstantaneaDoConjuntoKg(): number {
    return this.obterObjetosFisicosConectados().reduce((massa, objeto) => massa + objeto.massaKg, 0);
  }

  public get centroDeMassaDoConjuntoM(): Vetor3 {
    const objetos = this.obterObjetosFisicosConectados();
    const massa = objetos.reduce((soma, objeto) => soma + objeto.massaKg, 0);
    return objetos.reduce(
      (soma, objeto) => soma.adicionar(objeto.getEstadoFisico().posicaoM.multiplicar(objeto.massaKg / massa)),
      Vetor3.zero,
    );
  }

  public get modulosFisicos(): readonly Objeto[] { return [...this.modulos.values()]; }
  public get fixadoresEstruturais(): readonly FixadorEstrutural[] { return [...this.fixadores.values()]; }

  private pertenceAoVeiculo(objeto: Objeto): boolean {
    return objeto === this || this.modulos.get(objeto.id) === objeto;
  }
}
