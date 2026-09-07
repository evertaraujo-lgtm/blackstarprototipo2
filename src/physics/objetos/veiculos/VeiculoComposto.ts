import { FixadorEstrutural } from '../../conexoes/FixadorEstrutural';
import { MundoFisico } from '../../MundoFisico';
import { Vetor3 } from '../../Vetor3';
import { Objeto, type DefinicaoObjeto } from '../base/Objeto';
import { Propulsor } from '../propulsao/Propulsor';
import { ComputadorDeVoo, type ResultadoComandoPropulsor } from './ComputadorDeVoo';
import { SensoresVeiculoComposto } from '../../sensores/SensoresVeiculoComposto';

/**
 * Definição do casco estrutural central. `VeiculoComposto` não é uma fachada
 * sem massa: sua massa base pertence a um corpo físico real no MundoFisico.
 */
export interface DefinicaoVeiculoComposto extends DefinicaoObjeto {
  readonly massaBaseKg: number;
}

/**
 * Raiz de composição de um veículo e seu casco físico central. Tanque,
 * propulsores e demais módulos continuam sendo Objetos independentes, ligados
 * exclusivamente por FixadoresEstruturais. Não deve ser usado como contêiner
 * abstrato ou sem massa.
 */
export class VeiculoComposto extends Objeto {
  private readonly modulos = new Map<string, Objeto>();
  private readonly fixadores = new Map<string, FixadorEstrutural>();
  private readonly sensores = new SensoresVeiculoComposto(this);
  private readonly computadorDeVoo = new ComputadorDeVoo(this.sensores);

  public constructor(definicao: DefinicaoVeiculoComposto) {
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
    mundo.registrarSensoresVeiculo(this.sensores);
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

  public habilitarControleDeInclinacao(): void { this.computadorDeVoo.habilitar(); }
  public desabilitarControleDeInclinacao(): void { this.computadorDeVoo.desabilitar(); }
  public get controleDeInclinacaoEstaHabilitado(): boolean { return this.computadorDeVoo.estaHabilitado; }

  public override prepararPassoOperacional(dtS: number): void {
    this.computadorDeVoo.atualizarControleDeInclinacao(dtS);
  }

  public obterDiagnosticoDosPropulsores(): readonly ResultadoComandoPropulsor[] {
    return this.computadorDeVoo.obterDiagnostico();
  }

  public obterLeiturasDoComputadorDeVoo(): ReturnType<ComputadorDeVoo['obterLeiturasDoCasco']> {
    return this.computadorDeVoo.obterLeiturasDoCasco();
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
  public obterLeiturasDosSensores(): ReturnType<SensoresVeiculoComposto['obterLeituras']> { return this.sensores.obterLeituras(); }

  private pertenceAoVeiculo(objeto: Objeto): boolean {
    return objeto === this || this.modulos.get(objeto.id) === objeto;
  }
}
