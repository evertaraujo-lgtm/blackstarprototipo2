import type { EstadoFisico } from '../physics/objetos/base/Objeto';
import type { ContatoSuperficieFisico } from '../physics/solucionadores/ResolvedorContatoSuperficie';
import type { obterTelemetriaMissaoBss } from '../veiculos/TelemetriaBss';
import type { EstadoExecucaoMissao, ObjetivoMissao } from './ContratoMissao';
import type { ObservacaoAmerissagem } from './ObservacaoAmerissagem';
import type { ConfiguracaoCosta } from '../physics/ambiente/GeografiaCosteira';

export type SistemaBss = 'elétrico' | 'hidráulico' | 'combustível' | 'controle';
export type ComandoBss006 =
  | { readonly tipo: 'sistema'; readonly sistema: SistemaBss; readonly ligar: boolean }
  | { readonly tipo: 'ignicao' }
  | { readonly tipo: 'desligar-motor' }
  | { readonly tipo: 'throttle'; readonly valor: number }
  | { readonly tipo: 'alvo-pouso'; readonly deslocamentoM: number }
  | { readonly tipo: 'modo'; readonly modo: 'decolagem' | 'pouso' }
  | { readonly tipo: 'controle-atitude'; readonly habilitar: boolean }
  | { readonly tipo: 'falha-alimentacao'; readonly alimentacao: 'eletrica' | 'metano' | 'oxidante' };
export interface ConfiguracaoMissaoBss006 {
  /** Variante ADM explícita, aproximação sobre oceano; ausente preserva exatamente M10. */
  readonly ensaioAquatico?: { readonly inclinacaoInicialRad: number; readonly velocidadeInicialMps: number; readonly altitudeInicialM: number };
  readonly arcoBaseM?: number;
  readonly ventoTangencialMps?: number;
  readonly alvoPousoLocalM?: number;
  readonly altitudeTransicaoM?: number;
  readonly transicaoAutomatica?: boolean;
}
export interface CorpoObservado {
  readonly id: string;
  readonly estado: EstadoFisico;
  readonly dimensoesM: { readonly x: number; readonly y: number; readonly z: number };
  readonly massaKg: number;
  readonly integridade: number;
  readonly temperaturaC: number;
  readonly deflexaoRad?: number;
}
export interface ObservacaoBss006 {
  readonly aquatico?: ObservacaoAmerissagem;
  readonly id: string;
  readonly passo: number;
  readonly tempoS: number;
  readonly execucao: EstadoExecucaoMissao;
  readonly fase: 'solo' | 'subida' | 'descida' | 'contato' | 'falha' | 'agua';
  readonly modo: 'decolagem' | 'pouso';
  readonly casco: EstadoFisico;
  readonly altitudeM: number;
  readonly deslocamentoHorizontalM: number;
  readonly velocidadeRadialMps: number;
  readonly velocidadeTangencialMps: number;
  readonly atitudeLocalRad: number;
  readonly taxaAtitudeLocalRadps: number;
  readonly alvoPousoLocalM: number;
  readonly erroAlvoM: number;
  readonly empuxoN: number;
  readonly vazaoKgS: number;
  readonly throttle: number;
  readonly ignitado: boolean;
  readonly metanoKg: number;
  readonly oxidanteKg: number;
  readonly energiaEletricaJ: number;
  readonly sistemas: Readonly<Record<SistemaBss, boolean>>;
  readonly integridadeMinima: number;
  readonly fixadores: readonly { readonly id: string; readonly estado: 'integro' | 'liberado' | 'rompido' }[];
  readonly corpos: readonly CorpoObservado[];
  readonly contatos: readonly ContatoSuperficieFisico[];
  readonly conexoesEletricas: readonly { readonly id: string; readonly fonteId: string; readonly destinoId: string;
    readonly estado: 'energizada' | 'desligada' | 'rompida' | 'desconectada' }[];
  readonly pouso: {
    readonly contatoInicial: boolean;
    readonly toqueRetorno: boolean;
    readonly repousoGeometricoS: number;
    readonly maiorRepousoGeometricoS: number;
    readonly apoioBilateralObservado: boolean;
    readonly apoioBilateralSustentadoS: number;
    readonly maiorApoioBilateralSustentadoS: number;
    readonly pousoEstruturalmenteSeguro: boolean;
    readonly limitesToqueAtendidos: boolean;
  };
  readonly objetivos: readonly ObjetivoMissao[];
  readonly diagnosticoMotor: readonly string[];
  readonly faseControlador: string;
  readonly gimbalRad: number;
  readonly sensores: { readonly validos: boolean; readonly idadeS: number };
  readonly arbitragem: readonly { readonly idControlador: string; readonly idAtuador: string; readonly recurso: string; readonly valor: number }[];
  readonly engenharia: ReturnType<typeof obterTelemetriaMissaoBss>;
  readonly cenario: { readonly ancoraM: { readonly x: number; readonly y: number; readonly z: number };
    readonly costa?: ConfiguracaoCosta;
    readonly centroTerraM: { readonly x: number; readonly y: number; readonly z: number }; readonly raioTerraM: number;
    readonly arcoBaseM: number; readonly altitudeTransicaoM: number; readonly modeloFisico: object };
}
